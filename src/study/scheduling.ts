/**
 * Pure spaced-repetition helpers (no DB/Redis), so the scoring/scheduling rules
 * can be unit-tested in isolation. `points` is the single source of truth:
 * `level` and the next-review interval are both derived from it.
 */

export type WordLevel = 'NEW' | 'LEARNING' | 'MASTERED';

/** Max words assembled into a single day's study pool (per dictionary). */
export const DAILY_LIMIT = 25;

/** Hard ceiling so a heavily-studied word never disappears for too long. */
const MAX_INTERVAL_DAYS = 60;

export function levelForPoints(points: number): WordLevel {
  if (points >= 100) return 'MASTERED';
  if (points >= 50) return 'LEARNING';
  return 'NEW';
}

/**
 * Days until a word should resurface. Grows with points: NEW words come back
 * daily, LEARNING every 2-4 days, MASTERED 7+ days scaling with the score so
 * higher points => rarer.
 */
export function intervalDays(points: number): number {
  if (points >= 100) {
    return Math.min(7 + Math.floor((points - 100) / 10), MAX_INTERVAL_DAYS);
  }
  if (points >= 50) {
    return 2 + Math.floor((points - 50) / 17); // 2..4
  }
  return 1;
}

/** Midnight (UTC) of the given day — the unit we schedule/compare reviews on. */
export function startOfDayUTC(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Stable `YYYY-MM-DD` key used for per-day cache entries. */
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
