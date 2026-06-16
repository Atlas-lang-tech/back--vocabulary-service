import { beforeEach, describe, expect, it } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createMockRedis,
  type MockPrisma,
  type MockRedis,
} from '../common/testing/mocks.js';
import { DictionaryService } from './dictionary.service.js';

describe('DictionaryService', () => {
  let prisma: MockPrisma;
  let redis: MockRedis;
  let service: DictionaryService;

  const owner = '11111111-1111-1111-1111-111111111111';
  const stranger = '22222222-2222-2222-2222-222222222222';
  const dict = { id: 1, userId: owner, title: 'Verbs', icon: 'book' };

  beforeEach(() => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    service = new DictionaryService(prisma as any, redis as any);
  });

  describe('findAll', () => {
    it('reads from DB on cache miss and caches the result', async () => {
      prisma.dictionary.findMany.mockResolvedValue([dict]);

      const result = await service.findAll();

      expect(result).toEqual([dict]);
      expect(prisma.dictionary.findMany).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        'dictionary:all',
        JSON.stringify([dict]),
        3600,
      );
    });

    it('returns cached value without hitting the DB', async () => {
      redis.get.mockResolvedValue(JSON.stringify([dict]));

      const result = await service.findAll();

      expect(result).toEqual([dict]);
      expect(prisma.dictionary.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByUser', () => {
    it('queries by userId and caches under the user bucket', async () => {
      prisma.dictionary.findMany.mockResolvedValue([dict]);

      const result = await service.findByUser(owner);

      expect(result).toEqual([dict]);
      expect(prisma.dictionary.findMany).toHaveBeenCalledWith({
        where: { userId: owner },
      });
      expect(redis.set).toHaveBeenCalledWith(
        'dictionary:user:' + owner,
        JSON.stringify([dict]),
        3600,
      );
    });
  });

  describe('create', () => {
    it('creates and invalidates affected cache keys', async () => {
      prisma.dictionary.create.mockResolvedValue(dict);

      const result = await service.create({
        userId: owner,
        title: 'Verbs',
        icon: 'book',
      });

      expect(result).toEqual(dict);
      expect(redis.del).toHaveBeenCalledWith('dictionary:all');
      expect(redis.del).toHaveBeenCalledWith('dictionary:1');
      expect(redis.del).toHaveBeenCalledWith('dictionary:user:' + owner);
    });
  });

  describe('update', () => {
    it('updates when the requester owns the dictionary', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(dict);
      prisma.dictionary.update.mockResolvedValue({
        ...dict,
        title: 'Nouns',
      });

      const result = await service.update(1, { userId: owner, title: 'Nouns' });

      expect(result.title).toBe('Nouns');
      expect(prisma.dictionary.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'Nouns', icon: undefined },
      });
    });

    it('throws ForbiddenException when the requester is not the owner', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(dict);

      await expect(
        service.update(1, { userId: stranger, title: 'Nouns' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.dictionary.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes when the requester owns the dictionary', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(dict);

      const result = await service.remove(1, owner);

      expect(result).toEqual({ message: 'Dictionary deleted successfully' });
      expect(prisma.dictionary.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('throws ForbiddenException and does not delete for a non-owner', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(dict);

      await expect(service.remove(1, stranger)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.dictionary.delete).not.toHaveBeenCalled();
    });
  });
});
