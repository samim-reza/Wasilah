/**
 * Bookmark state.
 *
 * Toggling is optimistic: the icon fills the instant it is tapped and the write
 * is reconciled afterwards. A bookmark that visibly lags behind the tap makes
 * the whole app feel slow, and the operation is idempotent, so a failed write
 * costs nothing but a rollback.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { queryKeys } from '@/lib/api/queryKeys';
import { trackEvent } from '@/lib/analytics/analytics';
import { isArrayOf, isRecord } from '@/lib/storage/guards';
import { requestSync } from '@/lib/offline/syncSignal';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import {
  addBookmark,
  fetchBookmarks,
  removeBookmark,
  type Bookmark,
} from '../services/bookmarkService';

/** Guest bookmarks; adopted by the sync queue on sign-in. */
const GUEST_BOOKMARKS_KEY = storageKeys.guestBookmarks;

/**
 * Storage is untyped at runtime. A value written by an older build — or by the
 * key collision this key replaced — deserialises into whatever it is, and
 * calling `.map` on it crashes the screen rather than degrading.
 */
const isBookmarkArray = isArrayOf(
  (entry): entry is Bookmark => isRecord(entry) && typeof entry['verseKey'] === 'string',
);

export interface UseBookmarksResult {
  bookmarks: Bookmark[];
  /** Fast membership test for the reader, which asks per ayah. */
  bookmarkedKeys: Set<string>;
  isLoading: boolean;
  error: unknown;
  isBookmarked: (verseKey: string) => boolean;
  toggle: (verseKey: string) => Promise<boolean>;
}

export function useBookmarks(): UseBookmarksResult {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.library.bookmarks(userId ?? 'guest');

  const query = useQuery<Bookmark[]>({
    queryKey,
    queryFn: async () => {
      if (userId) return fetchBookmarks(userId);

      return (await keyValueStore.get(GUEST_BOOKMARKS_KEY, isBookmarkArray)) ?? [];
    },
  });

  // A Set, not an array scan: the reader calls `isBookmarked` once per visible
  // ayah on every render pass.
  const bookmarkedKeys = useMemo(
    () => new Set((query.data ?? []).map((bookmark) => bookmark.verseKey)),
    [query.data],
  );

  const mutation = useMutation({
    mutationFn: async ({ verseKey, shouldAdd }: { verseKey: string; shouldAdd: boolean }) => {
      if (shouldAdd) await addBookmark(verseKey, userId);
      else await removeBookmark(verseKey, userId);
      // The write is queued, not sent. Ask the queue to flush now rather than
      // at the next foreground event, so the server learns about it promptly.
      requestSync();
      return shouldAdd;
    },

    onMutate: async ({ verseKey, shouldAdd }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Bookmark[]>(queryKey) ?? [];

      const optimistic = shouldAdd
        ? [
            {
              id: `optimistic-${verseKey}`,
              verseKey,
              chapterId: Number(verseKey.split(':')[0]),
              verseNumber: Number(verseKey.split(':')[1]),
              collectionId: null,
              createdAt: new Date().toISOString(),
            },
            ...previous,
          ]
        : previous.filter((bookmark) => bookmark.verseKey !== verseKey);

      queryClient.setQueryData(queryKey, optimistic);
      if (!userId) await keyValueStore.set(GUEST_BOOKMARKS_KEY, optimistic);

      return { previous };
    },

    onError: (_error, _variables, context) => {
      // Put the list back exactly as it was rather than refetching, which would
      // show a flash of the wrong state while the request is in flight.
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },

    onSuccess: (shouldAdd) => {
      trackEvent(shouldAdd ? 'bookmark_created' : 'bookmark_removed', {});
    },

    // Deliberately NO invalidation here for a signed-in user. `addBookmark`
    // only enqueues; the server does not have the row yet. Refetching at this
    // point returned the old list and replaced the optimistic entry with it —
    // the bookmark appeared, then vanished. The queue's own flush invalidates
    // `library.all` once the row has actually landed.
    onSettled: () => undefined,
  });

  const isBookmarked = useCallback(
    (verseKey: string) => bookmarkedKeys.has(verseKey),
    [bookmarkedKeys],
  );

  const toggle = useCallback(
    async (verseKey: string) => {
      const shouldAdd = !bookmarkedKeys.has(verseKey);
      await mutation.mutateAsync({ verseKey, shouldAdd });
      return shouldAdd;
    },
    [bookmarkedKeys, mutation],
  );

  return {
    bookmarks: query.data ?? [],
    bookmarkedKeys,
    isLoading: query.isLoading,
    error: query.error,
    isBookmarked,
    toggle,
  };
}
