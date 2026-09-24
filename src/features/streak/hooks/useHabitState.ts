/**
 * The app's single source of habit state.
 *
 * Presents one interface over two very different backings — Supabase for a
 * signed-in user, on-device storage for a guest — so no screen ever branches on
 * whether an account exists. That branch lives here and nowhere else.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import type { Goal } from '@/features/goals/types/goal.types';
import {
  goalCompletionRatio,
  remainingToGoal,
  type DayTotals,
} from '@/features/goals/utils/goalProgress';
import { refreshWidget } from '@/features/widget/services/updateWidget';
import type { HabitSnapshot } from '@/features/widget/services/widgetModel';
import { queryKeys } from '@/lib/api/queryKeys';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { useLocalDate } from '@/lib/datetime/useLocalDate';

import { fetchGoal, fetchStreak, fetchTodayProgress, saveGoal } from '../services/habitService';
import {
  getLocalHabitState,
  setLocalGoal,
  type LocalHabitState,
} from '../services/localHabitStore';
import { getStreakStatus, resolveCurrentStreak } from '../utils/streakRules';
import { emptyStreakState, type StreakState, type StreakStatus } from '../types/streak.types';

export interface HabitState {
  goal: Goal;
  todayTotals: DayTotals;
  minimumMet: boolean;
  goalMet: boolean;
  streak: StreakState;
  /** The streak as it should be displayed right now, not as last stored. */
  currentStreak: number;
  status: StreakStatus;
  /** 0–1 for the progress ring. */
  completionRatio: number;
  remaining: number;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
}

/**
 * Fetches the three pieces of habit state in one query.
 *
 * Grouped rather than split into three hooks because the home screen needs all
 * of them together, and three separate queries would give three separate
 * loading states and three chances to render a half-populated screen.
 */
async function fetchRemoteHabitState(userId: string, today: string): Promise<LocalHabitState> {
  const [goal, progress, streak] = await Promise.all([
    fetchGoal(userId),
    fetchTodayProgress(userId, today),
    fetchStreak(userId),
  ]);

  const state: LocalHabitState = {
    goal,
    todayTotals: progress.totals,
    minimumMet: progress.minimumMet,
    goalMet: progress.goalMet,
    streak,
  };

  // The home-screen widget cannot reach the server, so the answer is written
  // down for it, and it is redrawn: the streak it shows must be the one the
  // app shows. Fire-and-forget; the screen wants the state, not the write.
  void keyValueStore
    .set(storageKeys.habitSnapshot, {
      today,
      currentStreak: resolveCurrentStreak(streak, today),
      minimumMet: progress.minimumMet,
      goalMet: progress.goalMet,
    } satisfies HabitSnapshot)
    .then(() => refreshWidget());

  return state;
}

export function useHabitState(): HabitState {
  const userId = useUserId();
  const { today, minutesUntilMidnight } = useLocalDate();
  const queryClient = useQueryClient();

  // The query key includes the date, so crossing midnight naturally produces a
  // fresh query rather than serving yesterday's cached progress.
  const queryKey = queryKeys.habit.today(userId ?? 'guest', today);

  const query = useQuery({
    queryKey,
    queryFn: () => (userId ? fetchRemoteHabitState(userId, today) : getLocalHabitState(today)),
    // Habit state changes only when the user reads, and those writes invalidate
    // this query directly, so background refetching adds nothing.
    staleTime: 60_000,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.habit.all });
  }, [queryClient]);

  const updateGoal = useCallback(
    async (goal: Goal) => {
      if (userId) await saveGoal(userId, goal, today);
      else await setLocalGoal(goal, today);

      await queryClient.invalidateQueries({ queryKey: queryKeys.habit.all });
    },
    [userId, today, queryClient],
  );

  return useMemo<HabitState>(() => {
    const data = query.data;
    const streak = data?.streak ?? emptyStreakState;
    const minimumMet = data?.minimumMet ?? false;

    const goal = data?.goal ?? {
      unit: 'ayahs',
      amount: 5,
      minimumUnit: 'ayahs',
      minimumAmount: 1,
    };
    const todayTotals = data?.todayTotals ?? {
      versesRead: 0,
      secondsRead: 0,
      pagesRead: 0,
      rukusRead: 0,
    };

    return {
      goal,
      todayTotals,
      minimumMet,
      goalMet: data?.goalMet ?? false,
      streak,
      currentStreak: resolveCurrentStreak(streak, today),
      status: getStreakStatus(streak, {
        today,
        completedToday: minimumMet,
        minutesUntilMidnight,
      }),
      completionRatio: goalCompletionRatio(todayTotals, goal),
      remaining: remainingToGoal(todayTotals, goal),
      isLoading: query.isLoading,
      error: query.error,
      refetch,
      updateGoal,
    };
  }, [query.data, query.isLoading, query.error, today, minutesUntilMidnight, refetch, updateGoal]);
}
