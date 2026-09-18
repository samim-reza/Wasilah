/**
 * The "Continue reading" marker.
 *
 * Saves are throttled hard: the reader would otherwise call this on every
 * scroll frame, and a write per frame would thrash both AsyncStorage and the
 * sync queue for a value nobody needs updated more than a few times a minute.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { queryKeys } from '@/lib/api/queryKeys';
import { logger } from '@/lib/monitoring/logger';

import {
  fetchRemotePosition,
  getLocalPosition,
  resolvePosition,
  savePosition,
  type ReadingPosition,
} from '../services/readingPositionService';

/** Minimum gap between persisted position updates. */
const SAVE_THROTTLE_MS = 10_000;

export function useReadingPosition() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.library.readingPosition(userId ?? 'guest');

  const lastSavedAt = useRef(0);
  const lastSavedKey = useRef<string | null>(null);

  const query = useQuery<ReadingPosition | null>({
    queryKey,
    queryFn: async () => {
      const local = await getLocalPosition();
      if (!userId) return local;

      try {
        const remote = await fetchRemotePosition(userId);
        return resolvePosition(local, remote);
      } catch (error) {
        // A failed remote read should not hide the local position.
        logger.debug('reader.remotePositionFailed', { error });
        return local;
      }
    },
  });

  const save = useCallback(
    (verseKey: string) => {
      const now = Date.now();
      const isSameVerse = lastSavedKey.current === verseKey;
      const isThrottled = now - lastSavedAt.current < SAVE_THROTTLE_MS;

      // Re-saving the same verse is always pointless; a different verse still
      // waits out the throttle window.
      if (isSameVerse || isThrottled) return;

      lastSavedAt.current = now;
      lastSavedKey.current = verseKey;

      void savePosition(verseKey, userId)
        .then(() => queryClient.invalidateQueries({ queryKey }))
        .catch((error: unknown) => logger.debug('reader.positionSaveFailed', { error }));
    },
    [userId, queryClient, queryKey],
  );

  return { position: query.data ?? null, isLoading: query.isLoading, save };
}
