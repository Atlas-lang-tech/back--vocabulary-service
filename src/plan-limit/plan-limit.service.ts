import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/Prisma/prisma.service.js';
import { RedisService } from '../modules/redis/redis.service.js';

export interface PlanLimit {
  maxDictionaries: number;
  maxWordsPerDict: number;
}

/**
 * Hardcoded fallback used until billing's `plan.upserted` event populates the
 * `planLimit` table (e.g. fresh DB, or an unknown plan code). FREE = 2 / 100.
 */
const DEFAULT_LIMITS: Record<string, PlanLimit> = {
  FREE: { maxDictionaries: 2, maxWordsPerDict: 100 },
};
const FALLBACK: PlanLimit = DEFAULT_LIMITS.FREE;

@Injectable()
export class PlanLimitService {
  private cacheKey = 'plan-limit:';
  private ttl = 3600;

  constructor(
    private db: PrismaService,
    private cache: RedisService,
  ) {}

  /** Resolve the limits for a plan code, falling back to FREE when unknown. */
  async getLimit(code: string): Promise<PlanLimit> {
    const cached = await this.cache.get(this.cacheKey + code);
    if (cached) return JSON.parse(cached);

    const row = await this.db.planLimit.findUnique({ where: { code } });
    if (!row) {
      return DEFAULT_LIMITS[code] ?? FALLBACK;
    }

    const limit: PlanLimit = {
      maxDictionaries: row.maxDictionaries,
      maxWordsPerDict: row.maxWordsPerDict,
    };
    await this.cache.set(this.cacheKey + code, JSON.stringify(limit), this.ttl);
    return limit;
  }

  /** Upsert a plan's limits from a `plan.upserted` event and invalidate cache. */
  async upsert(dto: {
    code: string;
    maxDictionaries: number;
    maxWordsPerDict: number;
  }): Promise<void> {
    await this.db.planLimit.upsert({
      where: { code: dto.code },
      create: dto,
      update: {
        maxDictionaries: dto.maxDictionaries,
        maxWordsPerDict: dto.maxWordsPerDict,
      },
    });
    await this.invalidate(dto.code);
  }

  private async invalidate(code: string): Promise<void> {
    await this.cache.del(this.cacheKey + code);
  }
}
