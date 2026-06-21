import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqplib from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { PlanLimitService } from '../../plan-limit/plan-limit.service.js';
import { RedisService } from '../redis/redis.service.js';

// Shared platform bus contract (see infra doc §0): a durable topic exchange
// `atlas.events`, a per-service durable queue dead-lettering to
// `atlas.events.dlx`, persistent JSON messages, idempotency by `messageId`.
const EXCHANGE = 'atlas.events';
const DLX = 'atlas.events.dlx';
const QUEUE = 'vocabulary.events';
const ROUTING_KEY = 'plan.upserted';
const DEDUP_TTL = 86400; // 24h — dedup window for re-delivered messages.

interface PlanUpsertedPayload {
  code: string;
  maxDictionaries: number;
  maxWordsPerDict: number;
}

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(
    private readonly config: ConfigService,
    private readonly planLimits: PlanLimitService,
    private readonly cache: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL')!;
    this.connection = await amqplib.connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await this.channel.assertExchange(DLX, 'topic', { durable: true });
    await this.channel.assertQueue(QUEUE, {
      durable: true,
      deadLetterExchange: DLX,
    });
    await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
    await this.channel.prefetch(10);

    await this.channel.consume(QUEUE, (msg) => void this.handle(msg));
    this.logger.log(`Listening for ${ROUTING_KEY} on ${QUEUE}`);
  }

  private async handle(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;

    const messageId = msg.properties.messageId as string | undefined;
    const dedupKey = messageId ? 'mq:dedup:' + messageId : undefined;

    try {
      // Idempotency: skip messages already processed.
      if (dedupKey && (await this.cache.exists(dedupKey))) {
        this.channel.ack(msg);
        return;
      }

      const payload = JSON.parse(msg.content.toString()) as PlanUpsertedPayload;
      await this.planLimits.upsert({
        code: payload.code,
        maxDictionaries: payload.maxDictionaries,
        maxWordsPerDict: payload.maxWordsPerDict,
      });

      if (dedupKey) await this.cache.set(dedupKey, '1', DEDUP_TTL);
      this.channel.ack(msg);
    } catch (err) {
      this.logger.error(
        `Failed to handle ${ROUTING_KEY}: ${(err as Error).message}`,
      );
      // Dead-letter without requeue to avoid poison-message loops.
      this.channel.nack(msg, false, false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
