/**
 * TanStack Query configuration and disk persistence.
 *
 * Two goals shape the settings below:
 *
 *   Speed — a cold launch should paint real content, not a spinner. The cache
 *   is persisted to disk and restored before the first render, so the surah
 *   list and the last-read verses are on screen immediately.
 *
 *   Compliance — Quran Foundation's developer terms cap ordinary Content API
 *   caching at one week. `contentCacheMaxAgeMs` is that ceiling, and the
 *   persister refuses to restore anything older, so a device that has been
 *   offline for a fortnight will not serve stale scripture from disk.
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, type QueryKey } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { contentCacheMaxAgeMs } from '@/config/quran';
import { AppError } from '@/lib/api/errors';
import { storageKeys } from '@/lib/storage/storageKeys';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: contentCacheMaxAgeMs,
      // React Native has no window focus; refetching on it does nothing useful
      // and the listener costs a subscription per query.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // The HTTP client already retried transient failures. Retrying a
        // 404 or a 403 here only delays the error state the user needs to see.
        if (error instanceof AppError && !error.retryable) return false;
        return failureCount < 1;
      },
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Mutations are queued for sync when offline rather than failing, so they
      // must not be retried by the query layer as well.
      networkMode: 'offlineFirst',
      retry: 0,
    },
  },
});

/**
 * Query key prefixes safe to write to disk.
 *
 * Deliberately excludes anything user-private: notes, bookmarks, streaks and
 * preferences are re-fetched from Supabase on launch rather than mirrored into
 * unencrypted app storage. The exception is handled by the offline module,
 * which stores pending writes in SQLite with an explicit sync contract.
 */
const PERSISTED_KEY_PREFIXES = new Set(['quran', 'audio', 'platform']);

function isPersistable(queryKey: QueryKey): boolean {
  const root = queryKey[0];
  return typeof root === 'string' && PERSISTED_KEY_PREFIXES.has(root);
}

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: storageKeys.queryCache,
  // Coalesce writes: without throttling, scrolling a long surah would write the
  // entire cache to disk on every page fetch.
  throttleTime: 2_000,
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: contentCacheMaxAgeMs,
  /**
   * Bumping this string discards every persisted cache on the next launch.
   *
   * Bump it for a change to the mapped domain models — and also, less
   * obviously, when the UPSTREAM CONTENT SOURCE changes. Moving from the Quran
   * Foundation pre-live environment to production did exactly that: pre-live
   * serves 2 surahs and 14 translations, production 114 and 145. An install
   * that had already cached the pre-live catalogue kept showing a two-surah
   * Quran for up to a day after the server started serving all of it, because
   * a cache hit is a cache hit and nothing connected the two facts.
   *
   * The switch is server-side, so no app update can fix that on its own. This
   * is the mechanism that does.
   */
  buster: 'wasilah-v2-qf-production',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && isPersistable(query.queryKey),
  },
};
