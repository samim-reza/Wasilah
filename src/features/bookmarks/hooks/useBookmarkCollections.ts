/**
 * Bookmark collections.
 *
 * Collections require an account. Unlike bookmarks themselves — which work as a
 * guest because saving an ayah in the moment matters more than syncing it — a
 * folder structure only earns its complexity once it follows you between
 * devices.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { queryKeys } from '@/lib/api/queryKeys';
import { supabase } from '@/lib/supabase/client';
import { fromPostgrestError } from '@/lib/supabase/errors';

import {
  createCollection,
  deleteCollection,
  fetchCollections,
  type BookmarkCollection,
} from '../services/bookmarkService';

export interface UseBookmarkCollectionsResult {
  collections: BookmarkCollection[];
  isLoading: boolean;
  error: unknown;
  /** True when collections are unavailable because there is no account. */
  requiresAccount: boolean;
  create: (name: string) => Promise<BookmarkCollection | null>;
  remove: (collectionId: string) => Promise<void>;
  /** Moves a bookmark into a collection, or out of all of them with null. */
  assign: (bookmarkId: string, collectionId: string | null) => Promise<void>;
}

export function useBookmarkCollections(): UseBookmarkCollectionsResult {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.library.collections(userId ?? 'guest');

  const query = useQuery<BookmarkCollection[]>({
    queryKey,
    queryFn: () => (userId ? fetchCollections(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  });

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    // The bookmark list carries collection_id, so it is stale too.
    await queryClient.invalidateQueries({
      queryKey: queryKeys.library.bookmarks(userId ?? 'guest'),
    });
  }, [queryClient, queryKey, userId]);

  const createMutation = useMutation({
    mutationFn: (name: string) => (userId ? createCollection(userId, name) : Promise.resolve(null)),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (collectionId: string) =>
      userId ? deleteCollection(userId, collectionId) : Promise.resolve(),
    onSuccess: invalidate,
  });

  const assignMutation = useMutation({
    mutationFn: async ({
      bookmarkId,
      collectionId,
    }: {
      bookmarkId: string;
      collectionId: string | null;
    }) => {
      if (!userId) return;

      const { error } = await supabase
        .from('bookmarks')
        .update({ collection_id: collectionId })
        .eq('id', bookmarkId)
        .eq('user_id', userId);

      if (error) throw fromPostgrestError(error, { bookmarkId });
    },
    onSuccess: invalidate,
  });

  return {
    collections: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    requiresAccount: !userId,
    create: useCallback(
      async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        return createMutation.mutateAsync(trimmed);
      },
      [createMutation],
    ),
    remove: useCallback(
      async (collectionId: string) => {
        await removeMutation.mutateAsync(collectionId);
      },
      [removeMutation],
    ),
    assign: useCallback(
      async (bookmarkId: string, collectionId: string | null) => {
        await assignMutation.mutateAsync({ bookmarkId, collectionId });
      },
      [assignMutation],
    ),
  };
}
