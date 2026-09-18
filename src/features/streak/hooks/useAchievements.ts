/**
 * Milestones, combining what has been reached with when it was reached.
 *
 * The distinction matters. Whether a milestone is reached is derived from the
 * user's totals and works offline and in guest mode. WHEN it was reached is a
 * stored fact that only the server has — and it is the more meaningful half:
 * "100 ayahs" is a number, "reached on 4 March" is a memory.
 *
 * Reaching a milestone is also reconciled here. The app records unlocks when
 * reading happens, but a device that was offline at the moment, or a guest who
 * later signs in, can arrive with milestones already earned and unrecorded.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { queryKeys } from '@/lib/api/queryKeys';
import { logger } from '@/lib/monitoring/logger';

import {
  achievementDefinitions,
  fetchUnlockedAchievements,
  persistAchievements,
  reachedAchievements,
  type AchievementDefinition,
  type AchievementProgress,
} from '../utils/achievements';

export interface AchievementStatus {
  definition: AchievementDefinition;
  reached: boolean;
  /** ISO timestamp, or null when reached but not yet recorded (or in guest mode). */
  unlockedAt: string | null;
}

export interface UseAchievementsResult {
  achievements: AchievementStatus[];
  reachedCount: number;
  isLoading: boolean;
  /** Records any milestone reached but not yet stored. Safe to call repeatedly. */
  reconcile: () => Promise<void>;
}

export function useAchievements(progress: AchievementProgress): UseAchievementsResult {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.habit.achievements(userId ?? 'guest');

  const query = useQuery<Record<string, string>>({
    queryKey,
    // Guests have no stored unlocks; milestones still display, without dates.
    queryFn: () => (userId ? fetchUnlockedAchievements(userId) : Promise.resolve({})),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  const reached = useMemo(() => new Set(reachedAchievements(progress)), [progress]);

  // Memoised rather than `query.data ?? {}` inline: a fresh object literal on
  // every render would change the identity that the memo and callback below
  // depend on, defeating both.
  const unlocked = useMemo(() => query.data ?? {}, [query.data]);

  const achievements = useMemo<AchievementStatus[]>(
    () =>
      achievementDefinitions.map((definition) => ({
        definition,
        reached: reached.has(definition.key),
        unlockedAt: unlocked[definition.key] ?? null,
      })),
    [reached, unlocked],
  );

  const reconcile = useCallback(async () => {
    if (!userId) return;

    // Only what is reached but unrecorded — the RPC is idempotent, but sending
    // every milestone on every visit would be needless traffic.
    const missing = [...reached].filter((key) => !(key in unlocked));
    if (missing.length === 0) return;

    try {
      await persistAchievements(missing);
      await queryClient.invalidateQueries({ queryKey });
      logger.debug('habit.achievementsReconciled', { count: missing.length });
    } catch (error) {
      // Best effort: an unrecorded milestone is re-detected next time.
      logger.debug('habit.achievementReconcileFailed', { error });
    }
  }, [userId, reached, unlocked, queryClient, queryKey]);

  return {
    achievements,
    reachedCount: reached.size,
    isLoading: query.isLoading,
    reconcile,
  };
}
