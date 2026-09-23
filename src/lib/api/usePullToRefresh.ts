/**
 * Pull-to-refresh, backed by React Query invalidation.
 *
 * One hook so every list refreshes the same way: invalidate the query
 * families the screen depends on, show the spinner until they have refetched,
 * hide it. Screens name their families and nothing else.
 *
 * Invalidation rather than `refetch()` on individual queries, because a
 * screen rarely depends on exactly one: the home screen shows the habit
 * state, today's ayah and the reading position, and a pull should refresh
 * all of them together rather than whichever one the screen remembered to
 * name.
 *
 * On the web this spinner never appears — react-native-web renders
 * `RefreshControl` as an empty View — but `onRefresh` still works when wired
 * to a button, so the same hook serves both.
 */
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface PullToRefresh {
  refreshing: boolean;
  onRefresh: () => void;
}

export function usePullToRefresh(queryKeys: readonly QueryKey[]): PullToRefresh {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Call sites pass a fresh array literal on every render. Keeping the latest
  // one in a ref — updated in an effect, read only inside the callback — lets
  // `onRefresh` stay referentially stable without the callback going stale.
  const keysRef = useRef(queryKeys);
  useEffect(() => {
    keysRef.current = queryKeys;
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.all(
      keysRef.current.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ).finally(() => setRefreshing(false));
  }, [queryClient]);

  return { refreshing, onRefresh };
}
