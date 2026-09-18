/**
 * Reads the habit state: goal, today's progress, streak, calendar.
 *
 * Every function here is a read. Writes go through
 * `readingSessionService.recordReadingSession`, which is the only path that
 * keeps daily progress and the streak consistent.
 */
import { supabase } from '@/lib/supabase/client';
import { fromPostgrestError } from '@/lib/supabase/errors';
import type { DailyProgressRow, GoalRow, StreakRow } from '@/lib/supabase/database.types';
import type { LocalDate } from '@/lib/datetime/localDate';

import type { Goal } from '@/features/goals/types/goal.types';
import { defaultGoal } from '@/features/goals/types/goal.types';
import { emptyDayTotals, reconcileGoal, type DayTotals } from '@/features/goals/utils/goalProgress';
import { emptyStreakState, type StreakState } from '../types/streak.types';

export function toGoal(row: GoalRow): Goal {
  return reconcileGoal({
    unit: row.goal_unit,
    amount: row.goal_amount,
    minimumUnit: row.minimum_unit,
    minimumAmount: row.minimum_amount,
  });
}

export function toStreakState(row: StreakRow): StreakState {
  return {
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastCompletedDate: row.last_completed_date,
    streakStartedOn: row.streak_started_on,
    totalActiveDays: row.total_active_days,
    totalVersesRead: row.total_verses_read,
    totalSecondsRead: row.total_seconds_read,
  };
}

export function toDayTotals(row: DailyProgressRow | null): DayTotals {
  if (!row) return emptyDayTotals;
  return {
    versesRead: row.verses_read,
    secondsRead: row.seconds_read,
    pagesRead: Number(row.pages_read),
    rukusRead: row.rukus_read,
  };
}

export async function fetchGoal(userId: string): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw fromPostgrestError(error, { userId });
  return data ? toGoal(data) : defaultGoal;
}

export async function saveGoal(userId: string, goal: Goal, today: LocalDate): Promise<void> {
  const reconciled = reconcileGoal(goal);

  const { error } = await supabase.from('goals').upsert(
    {
      user_id: userId,
      goal_unit: reconciled.unit,
      goal_amount: reconciled.amount,
      minimum_unit: reconciled.minimumUnit,
      minimum_amount: reconciled.minimumAmount,
    },
    { onConflict: 'user_id' },
  );

  if (error) throw fromPostgrestError(error, { userId });

  // Lowering a goal can retroactively complete past days, which changes the
  // streak. The server re-evaluates every day rather than only today.
  const { error: rpcError } = await supabase.rpc('reevaluate_progress', { p_today: today });
  if (rpcError) throw fromPostgrestError(rpcError, { userId });
}

export async function fetchStreak(userId: string): Promise<StreakState> {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw fromPostgrestError(error, { userId });
  return data ? toStreakState(data) : emptyStreakState;
}

export interface TodayProgress {
  totals: DayTotals;
  minimumMet: boolean;
  goalMet: boolean;
}

export async function fetchTodayProgress(
  userId: string,
  localDate: LocalDate,
): Promise<TodayProgress> {
  const { data, error } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('local_date', localDate)
    .maybeSingle();

  if (error) throw fromPostgrestError(error, { userId });

  return {
    totals: toDayTotals(data),
    minimumMet: data?.minimum_met ?? false,
    goalMet: data?.goal_met ?? false,
  };
}

export interface CalendarDay {
  date: LocalDate;
  minimumMet: boolean;
  goalMet: boolean;
  versesRead: number;
  secondsRead: number;
}

/** The reading calendar for a date range, inclusive. */
export async function fetchProgressRange(
  userId: string,
  from: LocalDate,
  to: LocalDate,
): Promise<CalendarDay[]> {
  const { data, error } = await supabase
    .from('daily_progress')
    .select('local_date, minimum_met, goal_met, verses_read, seconds_read')
    .eq('user_id', userId)
    .gte('local_date', from)
    .lte('local_date', to)
    .order('local_date', { ascending: true });

  if (error) throw fromPostgrestError(error, { userId });

  return (data ?? []).map((row) => ({
    date: row.local_date,
    minimumMet: row.minimum_met,
    goalMet: row.goal_met,
    versesRead: row.verses_read,
    secondsRead: row.seconds_read,
  }));
}

/** Completion times, used to learn when the user habitually reads. */
export async function fetchReadingTimes(userId: string, limit = 30): Promise<Date[]> {
  const { data, error } = await supabase
    .from('daily_progress')
    .select('last_activity_at')
    .eq('user_id', userId)
    .eq('minimum_met', true)
    .not('last_activity_at', 'is', null)
    .order('local_date', { ascending: false })
    .limit(limit);

  if (error) throw fromPostgrestError(error, { userId });

  return (data ?? [])
    .map((row) => row.last_activity_at)
    .filter((value): value is string => value !== null)
    .map((value) => new Date(value));
}
