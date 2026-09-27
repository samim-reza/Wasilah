/**
 * The "Continue reading" marker.
 *
 * Saves are throttled hard: the reader would otherwise call this on every
 * scroll frame, and a write per frame would thrash both AsyncStorage and the
 * sync queue for a value nobody needs updated more than a few times a minute.
 *
 * The throttle keeps the LAST position, not the first. It used to drop every
 * save inside the window, so someone who read on for a few seconds and closed
 * the surah came back to where they had been ten seconds earlier. Now the
 * latest ayah is written when the window ends, and at once when the reader
 * closes.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

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
  const pendingKey = useRef<string | null>(null);
  const trailingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const write = useCallback(
    (verseKey: string) => {
      lastSavedAt.current = Date.now();
      lastSavedKey.current = verseKey;
      pendingKey.current = null;

      void savePosition(verseKey, userId)
        .then(() => queryClient.invalidateQueries({ queryKey }))
        .catch((error: unknown) => logger.debug('reader.positionSaveFailed', { error }));
    },
    [userId, queryClient, queryKey],
  );

  const flush = useCallback(() => {
    if (trailingTimer.current) clearTimeout(trailingTimer.current);
    trailingTimer.current = null;
    if (pendingKey.current && pendingKey.current !== lastSavedKey.current) {
      write(pendingKey.current);
    }
  }, [write]);

  const save = useCallback(
    (verseKey: string) => {
      // Re-saving the same verse is always pointless.
      if (lastSavedKey.current === verseKey && pendingKey.current === null) return;

      const wait = SAVE_THROTTLE_MS - (Date.now() - lastSavedAt.current);
      if (wait <= 0) {
        write(verseKey);
        return;
      }

      // Inside the window: remember the newest ayah and write it when the
      // window closes.
      pendingKey.current = verseKey;
      trailingTimer.current ??= setTimeout(flush, wait);
    },
    [write, flush],
  );

  // Leaving the reader writes wherever it was left.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(() => () => flushRef.current(), []);

  return { position: query.data ?? null, isLoading: query.isLoading, save };
}
