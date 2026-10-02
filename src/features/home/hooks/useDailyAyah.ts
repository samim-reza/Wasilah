/**
 * Today's Ayah, resolved and loaded.
 *
 * Composes three things the home screen should not have to coordinate: which
 * ayah today is, its content, and which surah it belongs to.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useChapters } from '@/features/quran/hooks/useChapters';
import { useVerse, verseQueryOptions } from '@/features/quran/hooks/useVerse';
import { queryKeys } from '@/lib/api/queryKeys';
import { addLocalDays } from '@/lib/datetime/localDate';
import { useLocalDate } from '@/lib/datetime/useLocalDate';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { getDailyAyah, peekDailyAyah } from '../services/dailyAyahService';

/** Days of today's ayah fetched ahead, so a day or two offline still has one. */
const DAYS_AHEAD = 2;

export interface UseDailyAyahOptions {
  translationIds: number[];
}

export function useDailyAyah({ translationIds }: UseDailyAyahOptions) {
  const { today } = useLocalDate();
  const chaptersQuery = useChapters();

  const selectionQuery = useQuery({
    queryKey: queryKeys.dailyAyah.forDate(today),
    queryFn: () =>
      getDailyAyah(
        today,
        (chaptersQuery.data ?? []).map((chapter) => ({
          id: chapter.id,
          versesCount: chapter.versesCount,
        })),
      ),
    // The local fallback needs the chapter list to know how many ayahs exist.
    enabled: chaptersQuery.isSuccess,
    // Fixed for the whole day by design; the date is part of the key, so
    // crossing midnight produces a new query rather than a stale answer.
    staleTime: Number.POSITIVE_INFINITY,
  });

  const verseQuery = useVerse(selectionQuery.data?.verseKey ?? null, { translationIds });

  // Once today's ayah is here — so the network is too — the next days' are
  // fetched into the same persisted cache. Opening the app tomorrow on a
  // plane then shows tomorrow's ayah, not an error.
  const queryClient = useQueryClient();
  const { locale } = useTranslation();
  const chapters = chaptersQuery.data;
  const todayReady = verseQuery.isSuccess;
  useEffect(() => {
    if (!todayReady || !chapters) return;
    const counts = chapters.map((chapter) => ({
      id: chapter.id,
      versesCount: chapter.versesCount,
    }));

    for (let offset = 1; offset <= DAYS_AHEAD; offset += 1) {
      const date = addLocalDays(today, offset);
      void queryClient
        .fetchQuery({
          queryKey: queryKeys.dailyAyah.forDate(date),
          queryFn: () => peekDailyAyah(date, counts),
          staleTime: Number.POSITIVE_INFINITY,
        })
        .then((selection) =>
          selection
            ? queryClient.prefetchQuery(
                verseQueryOptions(selection.verseKey, { translationIds }, locale),
              )
            : undefined,
        )
        .catch(() => undefined);
    }
  }, [todayReady, chapters, today, translationIds, locale, queryClient]);

  const chapter = chaptersQuery.data?.find(
    (candidate) => candidate.id === selectionQuery.data?.chapterId,
  );

  return {
    selection: selectionQuery.data ?? null,
    verse: verseQuery.data,
    chapter,
    isLoading: chaptersQuery.isLoading || selectionQuery.isLoading || verseQuery.isLoading,
    error: chaptersQuery.error ?? selectionQuery.error ?? verseQuery.error,
    refetch: () => {
      void verseQuery.refetch();
    },
  };
}
