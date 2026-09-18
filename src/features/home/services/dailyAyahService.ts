/**
 * Today's Ayah.
 *
 * Prefers a curated server selection and falls back to a deterministic local
 * one. The fallback is what makes the card work offline and on a first launch
 * with no connection — the same ayah the server would have picked is not
 * guaranteed, but a stable, sensible one always is.
 */
import type { LocalDate } from '@/lib/datetime/localDate';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';
import { isRecord } from '@/lib/storage/guards';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import { selectDailyVerseKey, type ChapterVerseCount } from '../utils/dailyAyahSelection';

export interface DailyAyahSelection {
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  /** Where the choice came from, surfaced in diagnostics rather than the UI. */
  origin: 'server' | 'local';
}

interface CachedSelection extends DailyAyahSelection {
  date: LocalDate;
}

/** The curated selection for a date, if one has been published. */
async function fetchServerSelection(date: LocalDate): Promise<DailyAyahSelection | null> {
  const { data, error } = await supabase
    .from('daily_ayah_selections')
    .select('verse_key, chapter_id, verse_number')
    .eq('selection_date', date)
    .maybeSingle();

  if (error) {
    // Not fatal: the local fallback covers it.
    logger.debug('dailyAyah.serverLookupFailed', { error });
    return null;
  }
  if (!data) return null;

  return {
    verseKey: data.verse_key,
    chapterId: data.chapter_id,
    verseNumber: data.verse_number,
    origin: 'server',
  };
}

/**
 * Resolves the day's ayah.
 *
 * The result is cached by date, so the selection is fixed for the whole day
 * even across restarts — including the case where the server publishes a
 * curated ayah partway through the day, which would otherwise change the card
 * under the user.
 */
export async function getDailyAyah(
  date: LocalDate,
  chapters: readonly ChapterVerseCount[],
): Promise<DailyAyahSelection | null> {
  const isCachedSelection = (value: unknown): value is CachedSelection =>
    isRecord(value) &&
    typeof value['date'] === 'string' &&
    typeof value['verseKey'] === 'string' &&
    typeof value['chapterId'] === 'number' &&
    typeof value['verseNumber'] === 'number';

  const cached = await keyValueStore.get(storageKeys.dailyAyah, isCachedSelection);
  if (cached?.date === date) {
    return {
      verseKey: cached.verseKey,
      chapterId: cached.chapterId,
      verseNumber: cached.verseNumber,
      origin: cached.origin,
    };
  }

  const server = await fetchServerSelection(date);
  if (server) {
    await keyValueStore.set(storageKeys.dailyAyah, { ...server, date });
    return server;
  }

  const verseKey = selectDailyVerseKey(date, chapters);
  if (!verseKey) return null;

  const [chapterId, verseNumber] = verseKey.split(':').map(Number);
  if (!chapterId || !verseNumber) return null;

  const selection: DailyAyahSelection = { verseKey, chapterId, verseNumber, origin: 'local' };
  await keyValueStore.set(storageKeys.dailyAyah, { ...selection, date });

  return selection;
}
