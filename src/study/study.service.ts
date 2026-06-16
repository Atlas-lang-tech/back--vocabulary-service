import { Injectable, NotFoundException } from '@nestjs/common';
import type { word } from '../../generated/prisma/client.js';
import { PrismaService } from '../modules/Prisma/prisma.service.js';
import { RedisService } from '../modules/redis/redis.service.js';
import { AnswerDto } from './dto/answer.dto.js';
import {
  DAILY_LIMIT,
  addDays,
  dateKey,
  intervalDays,
  levelForPoints,
  startOfDayUTC,
} from './scheduling.js';

@Injectable()
export class StudyService {
  private cacheKey = 'study:';
  private wordCacheKey = 'word:';
  private ttl = 3600;

  constructor(
    private db: PrismaService,
    private cache: RedisService,
  ) {}

  /**
   * Today's fixed study pool for a dictionary. Assembled (and persisted) on the
   * first call of the day, then reused so the user can grind the same <=25
   * words across every mini-game until the day rolls over.
   */
  async getDailySession(dictionaryId: number): Promise<word[]> {
    const today = startOfDayUTC();
    const cacheKey = this.cacheKey + dictionaryId + ':' + dateKey(today);

    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const dictionary = await this.db.dictionary.findUnique({
      where: { id: dictionaryId },
    });
    if (!dictionary) {
      throw new NotFoundException(
        `Dictionary with id ${dictionaryId} not found`,
      );
    }

    const session = await this.db.studySession.findUnique({
      where: { dictionaryId_date: { dictionaryId, date: today } },
      include: { words: true },
    });

    const words = session
      ? session.words
      : (await this.assemble(dictionaryId, today)).words;

    await this.cache.set(cacheKey, JSON.stringify(words), this.ttl);
    return words;
  }

  /**
   * Apply one mini-game answer: +1/-1 point (floored at 0), then recompute the
   * derived level and the next review date. The word stays in today's pool
   * (membership is fixed) — the new date only affects future days.
   */
  async recordAnswer(dto: AnswerDto): Promise<word> {
    const existing = await this.db.word.findUnique({
      where: { id: dto.wordId },
    });
    if (!existing) {
      throw new NotFoundException(`Word with id ${dto.wordId} not found`);
    }

    const points = Math.max(0, existing.points + (dto.correct ? 1 : -1));
    const today = startOfDayUTC();

    const updated = await this.db.word.update({
      where: { id: dto.wordId },
      data: {
        points,
        level: levelForPoints(points),
        lastStudiedAt: new Date(),
        nextReviewAt: addDays(today, intervalDays(points)),
      },
    });

    await this.invalidate(updated, today);
    return updated;
  }

  // Pick the highest-priority due/new words (<=25) and lock them into a session
  // row for the day. Words that don't fit stay due and roll over automatically.
  private async assemble(
    dictionaryId: number,
    today: Date,
  ): Promise<{ words: word[] }> {
    const candidates = await this.db.word.findMany({
      where: {
        dictionaryId,
        OR: [
          { nextReviewAt: null },
          { nextReviewAt: { lt: addDays(today, 1) } },
        ],
      },
      orderBy: [
        { points: 'asc' },
        { nextReviewAt: { sort: 'asc', nulls: 'first' } },
        { id: 'asc' },
      ],
      take: DAILY_LIMIT,
    });

    return this.db.studySession.create({
      data: {
        dictionaryId,
        date: today,
        words: { connect: candidates.map((w) => ({ id: w.id })) },
      },
      include: { words: true },
    });
  }

  private async invalidate(item: word, today: Date): Promise<void> {
    await this.cache.del(
      this.cacheKey + item.dictionaryId + ':' + dateKey(today),
    );
    await this.cache.del(this.wordCacheKey + 'all');
    await this.cache.del(this.wordCacheKey + item.id);
    await this.cache.del(this.wordCacheKey + 'dictionary:' + item.dictionaryId);
  }
}
