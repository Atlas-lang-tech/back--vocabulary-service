import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createMockRedis,
  type MockPrisma,
  type MockRedis,
} from '../common/testing/mocks.js';
import { WordService } from './word.service.js';

describe('WordService', () => {
  let prisma: MockPrisma;
  let redis: MockRedis;
  let service: WordService;

  const dictionaryId = 1;
  const dictionary = {
    id: dictionaryId,
    userId: 'u1',
    title: 'Verbs',
    icon: 'book',
  };
  const word = {
    id: 1,
    dictionaryId,
    word: 'run',
    translation: 'бігти',
    transcription: null,
    example: null,
    description: null,
    lastStudiedAt: null,
  };

  beforeEach(() => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    service = new WordService(prisma as any, redis as any);
  });

  describe('findAll', () => {
    it('reads from DB on cache miss and caches the result', async () => {
      prisma.word.findMany.mockResolvedValue([word]);

      const result = await service.findAll();

      expect(result).toEqual([word]);
      expect(prisma.word.findMany).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        'word:all',
        JSON.stringify([word]),
        3600,
      );
    });

    it('returns cached value without hitting the DB', async () => {
      redis.get.mockResolvedValue(JSON.stringify([word]));

      const result = await service.findAll();

      expect(result).toEqual([word]);
      expect(prisma.word.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.word.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByDictionary', () => {
    it('queries by dictionaryId and caches under the dictionary bucket', async () => {
      prisma.word.findMany.mockResolvedValue([word]);

      const result = await service.findByDictionary(dictionaryId);

      expect(result).toEqual([word]);
      expect(prisma.word.findMany).toHaveBeenCalledWith({
        where: { dictionaryId },
      });
      expect(redis.set).toHaveBeenCalledWith(
        'word:dictionary:' + dictionaryId,
        JSON.stringify([word]),
        3600,
      );
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the dictionary does not exist', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ dictionaryId, word: 'run', translation: 'бігти' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.word.create).not.toHaveBeenCalled();
    });

    it('creates and invalidates affected cache keys', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(dictionary);
      prisma.word.create.mockResolvedValue(word);

      const result = await service.create({
        dictionaryId,
        word: 'run',
        translation: 'бігти',
      });

      expect(result).toEqual(word);
      expect(redis.del).toHaveBeenCalledWith('word:all');
      expect(redis.del).toHaveBeenCalledWith('word:1');
      expect(redis.del).toHaveBeenCalledWith('word:dictionary:' + dictionaryId);
    });
  });

  describe('update', () => {
    it('updates an existing word', async () => {
      prisma.word.findUnique.mockResolvedValue(word);
      prisma.word.update.mockResolvedValue({ ...word, translation: 'мчати' });

      const result = await service.update(1, { translation: 'мчати' });

      expect(result.translation).toBe('мчати');
      expect(prisma.word.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { translation: 'мчати' },
      });
    });

    it('throws NotFoundException when the word is missing', async () => {
      prisma.word.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, { translation: 'мчати' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.word.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing word', async () => {
      prisma.word.findUnique.mockResolvedValue(word);

      const result = await service.remove(1);

      expect(result).toEqual({ message: 'Word deleted successfully' });
      expect(prisma.word.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException and does not delete when missing', async () => {
      prisma.word.findUnique.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.word.delete).not.toHaveBeenCalled();
    });
  });
});
