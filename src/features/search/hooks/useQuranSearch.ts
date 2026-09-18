/**
 * Quran search.
 *
 * Wraps the Quran Foundation search API with the three behaviours a search box
 * needs and none of them get for free: debounced input, paginated results, and
 * cancellation of superseded requests so a slow early query cannot overwrite
 * the results of a later one.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { searchPageSize } from '@/config/quran';
import { queryKeys } from '@/lib/api/queryKeys';
import { trackEvent } from '@/lib/analytics/analytics';
import { bucketCount } from '@/lib/analytics/events';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { searchQuran } from '@/features/quran/services/quranService';
import type { SearchResult, SearchResultPage } from '@/features/quran/types/quran.types';

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
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: unknown;
  /** True before the user has typed enough to search. */
  isIdle: boolean;
}

export function useQuranSearch(): UseQuranSearchResult {
  const { locale } = useTranslation();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());

  const isSearchable = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const searchQueryResult = useInfiniteQuery<SearchResultPage>({
    queryKey: queryKeys.quran.search(debouncedQuery, locale),
    queryFn: ({ pageParam, signal }) =>
      searchQuran(debouncedQuery, {
        page: pageParam as number,
        size: searchPageSize,
        language: locale,
        // TanStack Query aborts this signal when the query key changes, which
        // is what cancels a request the user has already typed past.
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.currentPage < lastPage.totalPages ? lastPage.currentPage + 1 : undefined,
    enabled: isSearchable,
    // Short-lived: search results are the one piece of Quran content that is
    // genuinely query-dependent and not worth holding for a week.
    staleTime: 10 * 60 * 1000,
  });

  const results = useMemo(
    () => searchQueryResult.data?.pages.flatMap((page) => page.results) ?? [],
    [searchQueryResult.data],
  );

  const totalResults = searchQueryResult.data?.pages[0]?.totalResults ?? 0;

  // Reported once per completed search, never including the query itself.
  useMemo(() => {
    if (!searchQueryResult.isSuccess || !isSearchable) return;
    trackEvent('search_performed', {
      has_results: totalResults > 0,
      result_count_bucket: bucketCount(totalResults),
    });
  }, [searchQueryResult.isSuccess, isSearchable, totalResults]);

  return {
    query,
    setQuery,
    activeQuery: debouncedQuery,
    results,
    totalResults,
    isSearching: searchQueryResult.isFetching && !searchQueryResult.isFetchingNextPage,
    isFetchingNextPage: searchQueryResult.isFetchingNextPage,
    hasNextPage: Boolean(searchQueryResult.hasNextPage),
    fetchNextPage: () => {
      if (searchQueryResult.hasNextPage && !searchQueryResult.isFetchingNextPage) {
        void searchQueryResult.fetchNextPage();
      }
    },
    error: searchQueryResult.error,
    isIdle: !isSearchable,
  };
}
