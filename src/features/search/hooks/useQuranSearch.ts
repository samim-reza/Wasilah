/**
 * Quran search.
 *
 * Search happens in two stages, because the Quran Foundation search service
 * returns verse KEYS and nothing else — no text, no translation, no highlight,
 * whatever parameters are passed:
 *
 *   1. Search for the query        → a page of verse keys, ranked
 *   2. Fetch those keys' content   → Arabic and translation to display
 *
 * The stages are separate queries so the list can render references the moment
 * stage one lands, rather than showing nothing until stage two finishes. They
 * also cache differently: a query's results are short-lived, while an ayah's
 * text is immutable and already cached for a week by the content layer.
 */
import { useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { searchPageSize } from '@/config/quran';
import { queryKeys, type VerseQueryScope } from '@/lib/api/queryKeys';
import { trackEvent } from '@/lib/analytics/analytics';
import { bucketCount } from '@/lib/analytics/events';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { useResolvedTranslationIds } from '@/features/quran/hooks/useResolvedTranslations';
import { fetchVerse, searchQuran } from '@/features/quran/services/quranService';
import type {
  SearchResult,
  SearchResultPage,
  VerseKey,
} from '@/features/quran/types/quran.types';
import { parseVerseKey } from '@/features/quran/utils/verseKey';
import { useReaderPreferences } from '@/features/reader/hooks/useReaderPreferences';

import { useDebouncedValue } from './useDebouncedValue';

/** Below this, results are noise: one or two letters match almost everything. */
const MIN_QUERY_LENGTH = 2;

export interface UseQuranSearchResult {
  query: string;
  setQuery: (value: string) => void;
  /** The query actually being searched, after debouncing. */
  activeQuery: string;
  results: SearchResult[];
  totalResults: number;
  isSearching: boolean;
  /** True while stage two is filling in text for keys already on screen. */
  isLoadingContent: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: unknown;
  /** True before the user has typed enough to search. */
  isIdle: boolean;
}

export function useQuranSearch(): UseQuranSearchResult {
  const { locale } = useTranslation();
  const { preferences } = useReaderPreferences();
  const translationIds = useResolvedTranslationIds(preferences.translationIds);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const isSearchable = debouncedQuery.length >= MIN_QUERY_LENGTH;

  // --- Stage one: which ayahs match -----------------------------------------
  const keysQuery = useInfiniteQuery<SearchResultPage>({
    queryKey: queryKeys.quran.search(debouncedQuery, locale),
    queryFn: ({ pageParam, signal }) =>
      searchQuran(debouncedQuery, {
        page: pageParam as number,
        size: searchPageSize,
        language: locale,
        // TanStack Query aborts this when the query key changes, which cancels
        // a request the user has already typed past.
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.currentPage < lastPage.totalPages ? lastPage.currentPage + 1 : undefined,
    enabled: isSearchable,
    // Short-lived: results depend on the query, unlike the ayahs themselves.
    staleTime: 10 * 60 * 1000,
  });

  const verseKeys = useMemo<VerseKey[]>(
    () => keysQuery.data?.pages.flatMap((page) => page.verseKeys) ?? [],
    [keysQuery.data],
  );

  const scope: VerseQueryScope = { translationIds, includeWords: false, language: locale };

  // --- Stage two: what those ayahs say --------------------------------------
  //
  // One query per key rather than one batched request: the content API has no
  // multi-key endpoint, and each ayah is independently cached for a week — so
  // a verse already seen in the reader or a previous search costs nothing.
  const contentQueries = useQueries({
    queries: verseKeys.map((verseKey) => ({
      queryKey: queryKeys.quran.verse(verseKey, scope),
      queryFn: () => fetchVerse(verseKey, { translationIds, language: locale }),
      staleTime: Number.POSITIVE_INFINITY,
      enabled: isSearchable,
    })),
  });

  const results = useMemo<SearchResult[]>(
    () =>
      verseKeys.map((verseKey, index) => {
        const address = parseVerseKey(verseKey);
        const verse = contentQueries[index]?.data;
        const translation = verse?.translations[0];

        return {
          verseKey,
          chapterId: address?.chapterId ?? 0,
          verseNumber: address?.verseNumber ?? 0,
          // Null until stage two lands; the row shows its reference meanwhile.
          arabicText: verse?.arabicText ?? null,
          translationText: translation?.text ?? null,
          translationName: translation?.resourceName ?? null,
        };
      }),
    [verseKeys, contentQueries],
  );

  const totalResults = keysQuery.data?.pages[0]?.totalResults ?? 0;

  // Reported once per completed search, and never including the query itself.
  useMemo(() => {
    if (!keysQuery.isSuccess || !isSearchable) return;
    trackEvent('search_performed', {
      has_results: totalResults > 0,
      result_count_bucket: bucketCount(totalResults),
    });
  }, [keysQuery.isSuccess, isSearchable, totalResults]);

  return {
    query,
    setQuery,
    activeQuery: debouncedQuery,
    results,
    totalResults,
    isSearching: keysQuery.isFetching && !keysQuery.isFetchingNextPage,
    isLoadingContent: contentQueries.some((entry) => entry.isLoading),
    isFetchingNextPage: keysQuery.isFetchingNextPage,
    hasNextPage: Boolean(keysQuery.hasNextPage),
    fetchNextPage: () => {
      if (keysQuery.hasNextPage && !keysQuery.isFetchingNextPage) {
        void keysQuery.fetchNextPage();
      }
    },
    error: keysQuery.error,
    isIdle: !isSearchable,
  };
}
