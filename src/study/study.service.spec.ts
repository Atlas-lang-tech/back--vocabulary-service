import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createMockRedis,
  type MockPrisma,
  type MockRedis,
} from '../common/testing/mocks.js';
import { StudyService } from './study.service.js';
import { addDays, dateKey, intervalDays, startOfDayUTC } from './scheduling.js';

describe('StudyService', () => {
  let prisma: MockPrisma;
  let redis: MockRedis;
  let service: StudyService;

  const dictionaryId = 1;
  const dictionary = {
    id: dictionaryId,
    userId: 'u1',
    title: 'Verbs',
    icon: 'book',
  };
  const word = {
    id: 7,
    dictionaryId,
    word: 'run',
    translation: 'бігти',
    transcription: null,
    example: null,
    description: null,
    points: 0,
    level: 'NEW',
    lastStudiedAt: null,
    nextReviewAt: null,
  };

  beforeEach(() => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    service = new StudyService(prisma as any, redis as any);
  });

  describe('getDailySession', () => {
    it('throws NotFoundException when the dictionary is missing', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(null);

      await expect(
        service.getDailySession(dictionaryId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the existing session without reassembling', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(dictionary);
      prisma.studySession.findUnique.mockResolvedValue({ words: [word] });

      const result = await service.getDailySession(dictionaryId);

      expect(result).toEqual([word]);
      expect(prisma.studySession.create).not.toHaveBeenCalled();
    });

    it('assembles a capped, prioritized pool on first request of the day', async () => {
      prisma.dictionary.findUnique.mockResolvedValue(dictionary);
      prisma.studySession.findUnique.mockResolvedValue(null);
      prisma.word.findMany.mockResolvedValue([word]);
      prisma.studySession.create.mockResolvedValue({ words: [word] });

      const result = await service.getDailySession(dictionaryId);

      expect(result).toEqual([word]);
      const findManyArg = prisma.word.findMany.mock.calls[0][0];
      expect(findManyArg.take).toBe(25);
      expect(findManyArg.where.dictionaryId).toBe(dictionaryId);
      expect(prisma.studySession.create).toHaveBeenCalled();
    });

    it('serves the cached pool without touching the DB', async () => {
      redis.get.mockResolvedValue(JSON.stringify([word]));

      const result = await service.getDailySession(dictionaryId);

      expect(result).toEqual([word]);
      expect(prisma.dictionary.findUnique).not.toHaveBeenCalled();
      expect(prisma.studySession.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('recordAnswer', () => {
    it('throws NotFoundException when the word is missing', async () => {
      prisma.word.findUnique.mockResolvedValue(null);

      await expect(
        service.recordAnswer({ wordId: 99, correct: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.word.update).not.toHaveBeenCalled();
    });

    it('adds a point, recomputes level and next review on a correct answer', async () => {
      prisma.word.findUnique.mockResolvedValue({ ...word, points: 49 });
      prisma.word.update.mockImplementation((args: any) =>
        Promise.resolve({ ...word, ...args.data }),
      );

      const result = await service.recordAnswer({ wordId: 7, correct: true });

      const today = startOfDayUTC();
      expect(result.points).toBe(50);
      expect(result.level).toBe('LEARNING');
      expect(dateKey(result.nextReviewAt as Date)).toBe(
        dateKey(addDays(today, intervalDays(50))),
      );
      expect(redis.del).toHaveBeenCalledWith('word:7');
    });

    it('floors points at 0 on a wrong answer', async () => {
      prisma.word.findUnique.mockResolvedValue({ ...word, points: 0 });
      prisma.word.update.mockImplementation((args: any) =>
        Promise.resolve({ ...word, ...args.data }),
      );

      const result = await service.recordAnswer({ wordId: 7, correct: false });

      expect(result.points).toBe(0);
      expect(result.level).toBe('NEW');
    });
  });
});
