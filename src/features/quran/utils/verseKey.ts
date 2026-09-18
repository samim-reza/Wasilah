/**
 * Verse key helpers.
 *
 * '2:255' is the identifier used by the Quran Foundation API, by our database
 * and by deep links, so parsing and formatting it lives in one tested place
 * rather than being re-split at every call site.
 */
import { quranStructure } from '@/config/quran';
import type { VerseKey } from '../types/quran.types';

export interface VerseAddress {
  chapterId: number;
  verseNumber: number;
}

const VERSE_KEY_PATTERN = /^(\d{1,3}):(\d{1,3})$/;

export function formatVerseKey(chapterId: number, verseNumber: number): VerseKey {
  return `${chapterId}:${verseNumber}`;
}

/** Returns null rather than throwing, because keys often come from user input. */
export function parseVerseKey(key: string): VerseAddress | null {
  const match = VERSE_KEY_PATTERN.exec(key.trim());
  if (!match) return null;

  const chapterId = Number(match[1]);
  const verseNumber = Number(match[2]);

  if (chapterId < 1 || chapterId > quranStructure.chapterCount) return null;
  if (verseNumber < 1) return null;

  return { chapterId, verseNumber };
}

export function isValidVerseKey(key: string): boolean {
  return parseVerseKey(key) !== null;
}

/**
 * Orders verse keys in mushaf order. String comparison would put '2:10' before
 * '2:9', so both components are compared numerically.
 */
export function compareVerseKeys(a: VerseKey, b: VerseKey): number {
  const left = parseVerseKey(a);
  const right = parseVerseKey(b);
  if (!left || !right) return a.localeCompare(b);

  if (left.chapterId !== right.chapterId) return left.chapterId - right.chapterId;
  return left.verseNumber - right.verseNumber;
}

/** Number of ayahs from `start` to `end` inclusive, within one chapter. */
export function versesBetween(start: VerseKey, end: VerseKey): number {
  const from = parseVerseKey(start);
  const to = parseVerseKey(end);
  if (!from || !to || from.chapterId !== to.chapterId) return 0;
  return Math.max(0, to.verseNumber - from.verseNumber + 1);
}
