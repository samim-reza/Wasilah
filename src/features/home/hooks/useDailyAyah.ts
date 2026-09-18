/**
 * Today's Ayah, resolved and loaded.
 *
 * Composes three things the home screen should not have to coordinate: which
 * ayah today is, its content, and which surah it belongs to.
 */
import { useQuery } from '@tanstack/react-query';

import { useChapters } from '@/features/quran/hooks/useChapters';
import { useVerse } from '@/features/quran/hooks/useVerse';
import { queryKeys } from '@/lib/api/queryKeys';
import { useLocalDate } from '@/lib/datetime/useLocalDate';

import { getDailyAyah } from '../services/dailyAyahService';

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
