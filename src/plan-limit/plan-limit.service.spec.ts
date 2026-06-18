import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  createMockPrisma,
  createMockRedis,
  type MockPrisma,
  type MockRedis,
} from '../common/testing/mocks.js';
import { PlanLimitService } from './plan-limit.service.js';

describe('PlanLimitService', () => {
  let prisma: MockPrisma;
  let redis: MockRedis;
  let service: PlanLimitService;

  beforeEach(() => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    service = new PlanLimitService(prisma as any, redis as any);
  });

  describe('getLimit', () => {
    it('reads from DB on cache miss and caches the result', async () => {
      prisma.planLimit.findUnique.mockResolvedValue({
        code: 'PRO',
        maxDictionaries: 50,
        maxWordsPerDict: 5000,
      });

      const result = await service.getLimit('PRO');

      expect(result).toEqual({ maxDictionaries: 50, maxWordsPerDict: 5000 });
      expect(redis.set).toHaveBeenCalledWith(
        'plan-limit:PRO',
        JSON.stringify({ maxDictionaries: 50, maxWordsPerDict: 5000 }),
        3600,
      );
    });

    it('returns the cached value without hitting the DB', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ maxDictionaries: 9, maxWordsPerDict: 9 }),
      );

      const result = await service.getLimit('FREE');

      expect(result).toEqual({ maxDictionaries: 9, maxWordsPerDict: 9 });
      expect(prisma.planLimit.findUnique).not.toHaveBeenCalled();
    });

    it('falls back to the hardcoded FREE default when the row is missing', async () => {
      prisma.planLimit.findUnique.mockResolvedValue(null);

      const result = await service.getLimit('FREE');

      expect(result).toEqual({ maxDictionaries: 2, maxWordsPerDict: 100 });
      // Fallback is not cached (it is not authoritative).
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('falls back to FREE for an unknown plan code with no row', async () => {
      prisma.planLimit.findUnique.mockResolvedValue(null);

      const result = await service.getLimit('MYSTERY');

      expect(result).toEqual({ maxDictionaries: 2, maxWordsPerDict: 100 });
    });
  });

  describe('upsert', () => {
    it('upserts the plan and invalidates the cache', async () => {
      await service.upsert({
        code: 'FREE',
        maxDictionaries: 5,
        maxWordsPerDict: 200,
      });

      expect(prisma.planLimit.upsert).toHaveBeenCalledWith({
        where: { code: 'FREE' },
        create: { code: 'FREE', maxDictionaries: 5, maxWordsPerDict: 200 },
        update: { maxDictionaries: 5, maxWordsPerDict: 200 },
      });
      expect(redis.del).toHaveBeenCalledWith('plan-limit:FREE');
    });
  });
});
