import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { dictionary } from '../../generated/prisma/client.js';
import type { UserContext } from '../common/auth/current-user.decorator.js';
import { PlanLimitService } from '../plan-limit/plan-limit.service.js';
import { PrismaService } from '../modules/Prisma/prisma.service.js';
import { RedisService } from '../modules/redis/redis.service.js';
import { CreateDictionaryDto } from './dto/create-dictionary.dto.js';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto.js';

@Injectable()
export class DictionaryService {
  private cacheKey = 'dictionary:';
  private ttl = 3600;

  constructor(
    private db: PrismaService,
    private cache: RedisService,
    private planLimits: PlanLimitService,
  ) {}

  async findAll(): Promise<dictionary[]> {
    const cached = await this.cache.get(this.cacheKey + 'all');
    if (cached) return JSON.parse(cached);

    const data = await this.db.dictionary.findMany();
    await this.cache.set(this.cacheKey + 'all', JSON.stringify(data), this.ttl);
    return data;
  }

  async findOne(id: number): Promise<dictionary> {
    const cached = await this.cache.get(this.cacheKey + id);
    if (cached) return JSON.parse(cached);

    const dict = await this.db.dictionary.findUnique({ where: { id } });
    if (!dict) {
      throw new NotFoundException(`Dictionary with id ${id} not found`);
    }

    await this.cache.set(this.cacheKey + id, JSON.stringify(dict), this.ttl);
    return dict;
  }

  async findByUser(userId: string): Promise<dictionary[]> {
    const cached = await this.cache.get(this.cacheKey + 'user:' + userId);
    if (cached) return JSON.parse(cached);

    const data = await this.db.dictionary.findMany({ where: { userId } });
    await this.cache.set(
      this.cacheKey + 'user:' + userId,
      JSON.stringify(data),
      this.ttl,
    );
    return data;
  }

  async create(
    dto: CreateDictionaryDto,
    user: UserContext,
  ): Promise<dictionary> {
    const limit = await this.planLimits.getLimit(user.plan);
    const count = await this.db.dictionary.count({
      where: { userId: user.id },
    });
    if (count >= limit.maxDictionaries) {
      throw new ForbiddenException({
        code: 'LIMIT_DICTIONARIES',
        message: `Dictionary limit reached for plan ${user.plan} (max ${limit.maxDictionaries})`,
      });
    }

    const dict = await this.db.dictionary.create({
      data: { userId: user.id, title: dto.title, icon: dto.icon },
    });
    await this.invalidate(dict);
    return dict;
  }

  async update(
    id: number,
    dto: UpdateDictionaryDto,
    userId: string,
  ): Promise<dictionary> {
    const existing = await this.findOne(id);
    this.assertOwner(existing, userId);

    const dict = await this.db.dictionary.update({
      where: { id },
      data: { title: dto.title, icon: dto.icon },
    });
    await this.invalidate(dict);
    return dict;
  }

  async remove(id: number, userId: string): Promise<{ message: string }> {
    const existing = await this.findOne(id);
    this.assertOwner(existing, userId);

    await this.db.dictionary.delete({ where: { id } });
    await this.invalidate(existing);
    return { message: 'Dictionary deleted successfully' };
  }

  // Verifies that the requester (X-User-Id, via UserContextGuard) owns the
  // dictionary. The guard establishes identity; this enforces ownership.
  private assertOwner(dict: dictionary, userId: string): void {
    if (dict.userId !== userId) {
      throw new ForbiddenException('You are not the owner of this dictionary');
    }
  }

  private async invalidate(dict: dictionary): Promise<void> {
    await this.cache.del(this.cacheKey + 'all');
    await this.cache.del(this.cacheKey + dict.id);
    await this.cache.del(this.cacheKey + 'user:' + dict.userId);
  }
}
