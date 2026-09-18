/**
 * The surah list.
 *
 * Cached aggressively: the 114 chapters and their names do not change, so
 * paying for this request more than once a day is waste. It is also persisted
 * to disk, which is what lets the Quran tab paint instantly on a cold launch.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/queryKeys';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { fetchChapter, fetchChapters } from '../services/quranService';
import type { Chapter } from '../types/quran.types';

const STRUCTURE_STALE_MS = 24 * 60 * 60 * 1000;

export function useChapters() {
  const { locale } = useTranslation();

  return useQuery<Chapter[]>({
    queryKey: queryKeys.quran.chapters(locale),
    queryFn: () => fetchChapters(locale),
    staleTime: STRUCTURE_STALE_MS,
  });
}

export function useChapter(chapterId: number | null) {
  const { locale } = useTranslation();

  return useQuery<Chapter>({
    queryKey: queryKeys.quran.chapter(chapterId ?? 0, locale),
    queryFn: () => fetchChapter(chapterId as number, locale),
    enabled: chapterId !== null && chapterId > 0,
    staleTime: STRUCTURE_STALE_MS,
  });
}
