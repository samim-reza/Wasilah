/**
 * Drives the offline queue.
 *
 * Flushes when three things happen, because any one alone leaves a gap:
 *   • the app comes to the foreground (the common case),
 *   • connectivity returns while the app is open,
 *   • a user signs in (their guest-mode reading is adopted and sent).
 */
import { useNetworkState } from 'expo-network';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { queryClient } from '@/lib/api/queryClient';
import { queryKeys } from '@/lib/api/queryKeys';
import { trackEvent } from '@/lib/analytics/analytics';
import { logger } from '@/lib/monitoring/logger';

import { flushQueue } from './syncProcessor';
import { adoptGuestEntries, clearForOtherUsers, pendingCount } from './syncQueue';

export interface OfflineSyncState {
  isOnline: boolean;
  pending: number;
  isSyncing: boolean;
  sync: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const userId = useUserId();
  const network = useNetworkState();
  const [pending, setPending] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Guards against two flushes overlapping — the queue is not re-entrant.
  const syncingRef = useRef(false);

  const isOnline = network.isInternetReachable ?? network.isConnected ?? true;

  const refreshPending = useCallback(async (id: string) => {
    setPending(await pendingCount(id));
  }, []);

  const sync = useCallback(async () => {
    if (!userId || syncingRef.current || !isOnline) return;

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await flushQueue(userId);

      if (result.flushed > 0) {
        trackEvent('offline_queue_flushed', { item_count: result.flushed });
        // The server has recomputed streak and progress; drop the local copies
        // rather than trying to reconcile them by hand.
        await queryClient.invalidateQueries({ queryKey: queryKeys.habit.all });
        await queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
      }

      await refreshPending(userId);
    } catch (error) {
      logger.warn('sync.flushFailed', { error });
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [userId, isOnline, refreshPending]);

  // Adopt anything queued before sign-in, and discard other users' leftovers.
  useEffect(() => {
    if (!userId) return;

    void (async () => {
      const adopted = await adoptGuestEntries(userId);
      if (adopted > 0) logger.info('sync.guestEntriesAdopted', { count: adopted });

      await clearForOtherUsers(userId);
      await refreshPending(userId);
      await sync();
    })();
  }, [userId, refreshPending, sync]);

  // Connectivity returning is the signal that a paused flush can resume.
  useEffect(() => {
    // `sync` awaits the queue flush before touching state; the rule cannot
    // see past the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOnline) void sync();
  }, [isOnline, sync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => subscription.remove();
  }, [sync]);

  return { isOnline, pending, isSyncing, sync };
}
