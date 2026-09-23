/**
 * Paginated verse loading for the reader.
 *
 * Uses an infinite query rather than fetching a whole surah, because
 * Al-Baqarah alone is 286 ayahs and, with translations and word-by-word data,
 * several hundred kilobytes. Fetching that before showing anything would make
 * opening a long surah feel broken.
 *
 * Pages are requested one at a time and the next page is prefetched as the user
 * nears the end of the current one, so scrolling never stalls on the network.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { readerPageSize } from '@/config/quran';
import { queryKeys, type VerseQueryScope } from '@/lib/api/queryKeys';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import {
  fetchVersesByChapter,
  fetchVersesByJuz,
  fetchVersesByPage,
} from '../services/quranService';
import type { ArabicScript, Verse, VersePage } from '../types/quran.types';

export interface UseVersesOptions {
  translationIds: number[];
  includeWords: boolean;
  script: ArabicScript;
  /** Skip fetching, e.g. while the route param is still resolving. */
  enabled?: boolean;
}

export type VerseSource =
  | { kind: 'chapter'; chapterId: number }
  | { kind: 'juz'; juzNumber: number }
  | { kind: 'page'; pageNumber: number };

function fetcherFor(source: VerseSource) {
  switch (source.kind) {
    case 'chapter':
      return (options: Parameters<typeof fetchVersesByChapter>[1]) =>
        fetchVersesByChapter(source.chapterId, options);
    case 'juz':
      return (options: Parameters<typeof fetchVersesByJuz>[1]) =>
        fetchVersesByJuz(source.juzNumber, options);
    case 'page':
      return (options: Parameters<typeof fetchVersesByPage>[1]) =>
        fetchVersesByPage(source.pageNumber, options);
  }
}

function keyFor(source: VerseSource, scope: VerseQueryScope) {
  switch (source.kind) {
    case 'chapter':
      return queryKeys.quran.verses(source.chapterId, scope);
    case 'juz':
      return queryKeys.quran.versesByJuz(source.juzNumber, scope);
    case 'page':
      return queryKeys.quran.versesByPage(source.pageNumber, scope);
  }
}

export interface UseVersesResult {
  verses: Verse[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: unknown;
  refetch: () => void;
  totalVerses: number;
}

export function useVerses(source: VerseSource, options: UseVersesOptions): UseVersesResult {
  const { locale } = useTranslation();

  const scope: VerseQueryScope = {
    translationIds: options.translationIds,
    includeWords: options.includeWords,
    language: locale,
    script: options.script,
  };

  const query = useInfiniteQuery<VersePage>({
    queryKey: keyFor(source, scope),
    queryFn: ({ pageParam }) =>
      fetcherFor(source)({
        translationIds: options.translationIds,
        includeWords: options.includeWords,
        language: locale,
        script: options.script,
        page: pageParam as number,
        perPage: readerPageSize,
      }),
    initialPageParam: 1,
    // The API tells us directly whether another page exists; deriving it from
    // the returned count would break on a final page that happens to be full.
    getNextPageParam: (lastPage) => lastPage.page.nextPage ?? undefined,
    enabled: options.enabled ?? true,
    // Quran content is immutable; refetching it is pure cost.
    staleTime: Number.POSITIVE_INFINITY,
  });

  // Flattening is memoised because the reader's list re-renders on every scroll
  // frame, and rebuilding a 300-element array each time is measurable.
  const verses = useMemo(
    () => query.data?.pages.flatMap((page) => page.verses) ?? [],
    [query.data],
  );

  return {
    verses,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    error: query.error,
    refetch: () => void query.refetch(),
    totalVerses: query.data?.pages[0]?.page.totalRecords ?? 0,
  };
}
