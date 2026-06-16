import { describe, expect, it } from '@jest/globals';
import {
  addDays,
  dateKey,
  intervalDays,
  levelForPoints,
  startOfDayUTC,
} from './scheduling.js';

describe('levelForPoints', () => {
  it('maps point thresholds to levels', () => {
    expect(levelForPoints(0)).toBe('NEW');
    expect(levelForPoints(49)).toBe('NEW');
    expect(levelForPoints(50)).toBe('LEARNING');
    expect(levelForPoints(99)).toBe('LEARNING');
    expect(levelForPoints(100)).toBe('MASTERED');
    expect(levelForPoints(500)).toBe('MASTERED');
  });
});

describe('intervalDays', () => {
  it('keeps NEW words on a daily cadence', () => {
    expect(intervalDays(0)).toBe(1);
    expect(intervalDays(49)).toBe(1);
  });

  it('spaces LEARNING words 2-4 days apart', () => {
    expect(intervalDays(50)).toBe(2);
    expect(intervalDays(99)).toBe(4);
  });

  it('grows the MASTERED interval with points', () => {
    expect(intervalDays(100)).toBe(7);
    expect(intervalDays(200)).toBe(17);
  });

  it('caps the interval at 60 days', () => {
    expect(intervalDays(100000)).toBe(60);
  });
});

describe('date helpers', () => {
  it('truncates to UTC midnight', () => {
    const d = startOfDayUTC(new Date('2026-06-16T15:42:00Z'));
    expect(d.toISOString()).toBe('2026-06-16T00:00:00.000Z');
  });

  it('adds days without mutating the input', () => {
    const base = startOfDayUTC(new Date('2026-06-16T00:00:00Z'));
    expect(dateKey(addDays(base, 3))).toBe('2026-06-19');
    expect(dateKey(base)).toBe('2026-06-16');
  });
});
