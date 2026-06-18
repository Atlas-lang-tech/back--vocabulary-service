import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { word } from '../../generated/prisma/client.js';
import type { UserContext } from '../common/auth/current-user.decorator.js';
import { PlanLimitService } from '../plan-limit/plan-limit.service.js';
import { PrismaService } from '../modules/Prisma/prisma.service.js';
import { RedisService } from '../modules/redis/redis.service.js';
import { CreateWordDto } from './dto/create-word.dto.js';
import { UpdateWordDto } from './dto/update-word.dto.js';

@Injectable()
export class WordService {
  private cacheKey = 'word:';
  private ttl = 3600;

  constructor(
    private db: PrismaService,
    private cache: RedisService,
    private planLimits: PlanLimitService,
  ) {}

  async findAll(): Promise<word[]> {
    const cached = await this.cache.get(this.cacheKey + 'all');
    if (cached) return JSON.parse(cached);

    const data = await this.db.word.findMany();
    await this.cache.set(this.cacheKey + 'all', JSON.stringify(data), this.ttl);
    return data;
  }

  async findOne(id: number): Promise<word> {
    const cached = await this.cache.get(this.cacheKey + id);
    if (cached) return JSON.parse(cached);

    const item = await this.db.word.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Word with id ${id} not found`);
    }

    await this.cache.set(this.cacheKey + id, JSON.stringify(item), this.ttl);
    return item;
  }

  async findByDictionary(dictionaryId: number): Promise<word[]> {
    const cached = await this.cache.get(
      this.cacheKey + 'dictionary:' + dictionaryId,
    );
    if (cached) return JSON.parse(cached);

    const data = await this.db.word.findMany({ where: { dictionaryId } });
    await this.cache.set(
      this.cacheKey + 'dictionary:' + dictionaryId,
      JSON.stringify(data),
      this.ttl,
    );
    return data;
  }

  async create(dto: CreateWordDto, user: UserContext): Promise<word> {
    const dictionary = await this.db.dictionary.findUnique({
      where: { id: dto.dictionaryId },
    });
    if (!dictionary) {
      throw new NotFoundException(
        `Dictionary with id ${dto.dictionaryId} not found`,
      );
    }
    if (dictionary.userId !== user.userId) {
      throw new ForbiddenException('You are not the owner of this dictionary');
    }

    const limit = await this.planLimits.getLimit(user.plan);
    const count = await this.db.word.count({
      where: { dictionaryId: dto.dictionaryId },
    });
    if (count >= limit.maxWordsPerDict) {
      throw new ForbiddenException({
        code: 'LIMIT_WORDS',
        message: `Word limit reached for plan ${user.plan} (max ${limit.maxWordsPerDict} per dictionary)`,
      });
    }

    const item = await this.db.word.create({ data: dto });
    await this.invalidate(item);
    return item;
  }

  async update(id: number, dto: UpdateWordDto): Promise<word> {
    await this.findOne(id);

    const item = await this.db.word.update({ where: { id }, data: dto });
    await this.invalidate(item);
    return item;
  }

  async remove(id: number): Promise<{ message: string }> {
    const existing = await this.findOne(id);

    await this.db.word.delete({ where: { id } });
    await this.invalidate(existing);
    return { message: 'Word deleted successfully' };
  }

  private async invalidate(item: word): Promise<void> {
    await this.cache.del(this.cacheKey + 'all');
    await this.cache.del(this.cacheKey + item.id);
    await this.cache.del(this.cacheKey + 'dictionary:' + item.dictionaryId);
  }
}
