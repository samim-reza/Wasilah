/**
 * Records reading and updates everything that depends on it.
 *
 * The one function a screen calls when the user has read something. It handles
 * the guest/signed-in split, optimistic local state, achievement checks and the
 * celebration signal, so no caller has to remember the full sequence.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { queryKeys } from '@/lib/api/queryKeys';
import { trackEvent } from '@/lib/analytics/analytics';
import { refreshWidget } from '@/features/widget/services/updateWidget';
import { toLocalDate } from '@/lib/datetime/localDate';
import { useLocalDate } from '@/lib/datetime/useLocalDate';
import { logger } from '@/lib/monitoring/logger';
import type { SessionSource } from '@/lib/supabase/database.types';

import { checkNewAchievements, persistAchievements } from '@/features/streak/utils/achievements';
import { addLocalActivity } from '../services/localHabitStore';
import {
  clampSessionDuration,
  recordReadingSession,
  MIN_SESSION_SECONDS,
} from '../services/readingSessionService';
import { useHabitState } from './useHabitState';

export interface ReadingActivity {
  startedAt: Date;
  endedAt: Date;
  versesRead: number;
  pagesRead?: number;
  rukusRead?: number;
  chapterId?: number | null;
  startVerse?: number | null;
  endVerse?: number | null;
  source?: SessionSource;
}

export interface RecordReadingResult {
  /** False when the activity was too short or empty to count. */
  recorded: boolean;
  /** True when this reading completed the daily minimum for the first time today. */
  completedMinimum: boolean;
  /** True when it also completed the fuller goal. */
  completedGoal: boolean;
  /** Milestones newly reached, for the celebration UI. */
  newAchievements: string[];
}

export function useRecordReading() {
  const userId = useUserId();
  const { today, timezone } = useLocalDate();
  const queryClient = useQueryClient();
  const habit = useHabitState();

  return useCallback(
    async (activity: ReadingActivity): Promise<RecordReadingResult> => {
      const endedAt = clampSessionDuration(activity.startedAt, activity.endedAt);
      const durationSeconds = (endedAt.getTime() - activity.startedAt.getTime()) / 1000;

      const isMeaningful = activity.versesRead > 0 || durationSeconds >= MIN_SESSION_SECONDS;

      if (!isMeaningful) {
        return {
          recorded: false,
          completedMinimum: false,
          completedGoal: false,
          newAchievements: [],
        };
      }

      const wasMinimumMet = habit.minimumMet;
      const wasGoalMet = habit.goalMet;
      const previousStreak = habit.currentStreak;

      // Queue the write. Durable and idempotent, so this succeeds offline.
      const payload = await recordReadingSession({ ...activity, endedAt, timezone }, userId);

      // Guests have no server to recompute their state, so it is recomputed
      // locally with the same pure streak functions.
      let completedMinimum = false;
      let completedGoal = false;

      if (!userId) {
        const next = await addLocalActivity(
          toLocalDate(endedAt, timezone),
          {
            versesRead: payload.versesRead,
            secondsRead: Math.round(durationSeconds),
            pagesRead: payload.pagesRead,
            rukusRead: payload.rukusRead,
          },
          today,
        );
        completedMinimum = next.minimumMet && !wasMinimumMet;
        completedGoal = next.goalMet && !wasGoalMet;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.habit.all });

      // Redraw the home-screen widget now rather than waiting for Android's
      // half-hourly tick — the moment that matters is right after reading.
      // Deliberately not awaited: a widget refresh must never delay the UI,
      // and it is a no-op for the many users who have not added one.
      void refreshWidget();

      // For a signed-in user the server is authoritative, so completion is read
      // back from the refreshed state rather than guessed here.
      if (userId) {
        const refreshed = queryClient.getQueryData<{ minimumMet: boolean; goalMet: boolean }>(
          queryKeys.habit.today(userId, today),
        );
        completedMinimum = Boolean(refreshed?.minimumMet) && !wasMinimumMet;
        completedGoal = Boolean(refreshed?.goalMet) && !wasGoalMet;
      }

      trackEvent('reading_session_completed', {
        verses_read: payload.versesRead,
        duration_seconds: Math.round(durationSeconds),
        source: payload.source,
      });

      if (completedMinimum) {
        trackEvent('daily_minimum_completed', { streak_after: previousStreak + 1 });
        trackEvent('streak_extended', { streak_length: previousStreak + 1 });
      }
      if (completedGoal) {
        trackEvent('goal_completed', {
          goal_unit: habit.goal.unit,
          goal_amount: habit.goal.amount,
        });
      }

      const newAchievements = checkNewAchievements({
        totalVersesRead: habit.streak.totalVersesRead + payload.versesRead,
        currentStreak: completedMinimum ? previousStreak + 1 : previousStreak,
        longestStreak: habit.streak.longestStreak,
      });

      if (newAchievements.length > 0 && userId) {
        // Persisting is best-effort: a milestone that fails to save will be
        // detected again on the next read rather than lost.
        void persistAchievements(newAchievements).catch((error: unknown) => {
          logger.debug('habit.achievementPersistFailed', { error });
        });
      }

      return { recorded: true, completedMinimum, completedGoal, newAchievements };
    },
    [userId, today, timezone, queryClient, habit],
  );
}
