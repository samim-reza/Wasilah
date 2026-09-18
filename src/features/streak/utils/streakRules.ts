/**
 * The streak engine.
 *
 * Pure functions over plain data — no React, no network, no clock access beyond
 * what the caller passes in. This is the most correctness-sensitive logic in the
 * app and it is where a user notices a bug fastest, so it is written to be
 * exhaustively testable.
 *
 * The algorithm mirrors `public.recalculate_streak` in
 * `supabase/migrations/20260101000400_habit_functions.sql`. Both derive the
 * streak from the full set of completed days rather than incrementing a
 * counter. That choice is what makes the following cases correct for free:
 *
 *   • duplicate completion events — a date appearing twice is deduplicated
 *   • offline sessions arriving days late — they re-form the runs
 *   • a device clock jumping backwards — an out-of-order date is just a date
 *   • DST and timezone moves — days are calendar dates, never durations
 *
 * The one rule worth stating explicitly: a run ending YESTERDAY is still the
 * current streak, because the user has until local midnight to read today.
 */
import { addLocalDays, daysBetweenLocalDates, type LocalDate } from '@/lib/datetime/localDate';

import { emptyStreakState, type StreakState, type StreakStatus } from '../types/streak.types';

export interface CompletedDay {
  date: LocalDate;
  versesRead: number;
  secondsRead: number;
}

export interface StreakRun {
  start: LocalDate;
  end: LocalDate;
  length: number;
}

/**
 * Groups completed dates into consecutive runs.
 *
 * Duplicates are collapsed first, so a day recorded twice cannot inflate a run.
 */
export function findStreakRuns(dates: readonly LocalDate[]): StreakRun[] {
  const unique = Array.from(new Set(dates)).sort();
  if (unique.length === 0) return [];

  const runs: StreakRun[] = [];
  let runStart = unique[0] as LocalDate;
  let runEnd = runStart;

  for (let i = 1; i < unique.length; i += 1) {
    const date = unique[i] as LocalDate;

    if (daysBetweenLocalDates(runEnd, date) === 1) {
      runEnd = date;
      continue;
    }

    runs.push({
      start: runStart,
      end: runEnd,
      length: daysBetweenLocalDates(runStart, runEnd) + 1,
    });
    runStart = date;
    runEnd = date;
  }

  runs.push({ start: runStart, end: runEnd, length: daysBetweenLocalDates(runStart, runEnd) + 1 });
  return runs;
}

/**
 * Rebuilds the entire streak state from the days a user has completed.
 *
 * `today` must be the user's LOCAL date. `previousLongest` lets a caller carry
 * forward a best-ever value that predates the supplied history (for example
 * when only the last 90 days were fetched), so the record never regresses.
 */
export function calculateStreak(
  completedDays: readonly CompletedDay[],
  today: LocalDate,
  previousLongest = 0,
): StreakState {
  if (completedDays.length === 0) {
    return { ...emptyStreakState, longestStreak: previousLongest };
  }

  const runs = findStreakRuns(completedDays.map((day) => day.date));
  const yesterday = addLocalDays(today, -1);

  // Only a run ending today or yesterday is still running. A run ending in the
  // future (device clock skew) is treated as current rather than discarded, so
  // a user with a fast clock is not punished for it.
  const currentRun = runs.find(
    (run) => run.end === today || run.end === yesterday || run.end > today,
  );

  const longestFromHistory = runs.reduce((max, run) => Math.max(max, run.length), 0);

  const uniqueDays = new Map<LocalDate, CompletedDay>();
  for (const day of completedDays) {
    const existing = uniqueDays.get(day.date);
    // Merge duplicates rather than overwrite, so re-synced sessions for the same
    // day do not discard totals recorded by the earlier copy.
    uniqueDays.set(day.date, {
      date: day.date,
      versesRead: (existing?.versesRead ?? 0) + day.versesRead,
      secondsRead: (existing?.secondsRead ?? 0) + day.secondsRead,
    });
  }

  const days = Array.from(uniqueDays.values());
  const lastCompletedDate = days
    .map((day) => day.date)
    .reduce((latest, date) => (date > latest ? date : latest));

  return {
    currentStreak: currentRun?.length ?? 0,
    longestStreak: Math.max(previousLongest, longestFromHistory),
    lastCompletedDate,
    streakStartedOn: currentRun?.start ?? null,
    totalActiveDays: days.length,
    totalVersesRead: days.reduce((sum, day) => sum + day.versesRead, 0),
    totalSecondsRead: days.reduce((sum, day) => sum + day.secondsRead, 0),
  };
}

/**
 * Applies a single day's completion to an existing state.
 *
 * The incremental path, used when the app already knows the streak and the user
 * has just finished reading. It is consistent with `calculateStreak` for the
 * forward case; anything out of order returns the state unchanged and signals
 * that a full recalculation is needed, rather than guessing.
 */
export interface ApplyCompletionResult {
  state: StreakState;
  /** True when this completion extended or started a run. */
  streakChanged: boolean;
  /** True when the caller should re-derive state from full history instead. */
  needsRecalculation: boolean;
}

export function applyDailyCompletion(
  state: StreakState,
  completedDate: LocalDate,
  stats: { versesRead: number; secondsRead: number } = { versesRead: 0, secondsRead: 0 },
): ApplyCompletionResult {
  const { lastCompletedDate } = state;

  // First ever completion.
  if (!lastCompletedDate) {
    return {
      state: {
        ...state,
        currentStreak: 1,
        longestStreak: Math.max(state.longestStreak, 1),
        lastCompletedDate: completedDate,
        streakStartedOn: completedDate,
        totalActiveDays: state.totalActiveDays + 1,
        totalVersesRead: state.totalVersesRead + stats.versesRead,
        totalSecondsRead: state.totalSecondsRead + stats.secondsRead,
      },
      streakChanged: true,
      needsRecalculation: false,
    };
  }

  const gap = daysBetweenLocalDates(lastCompletedDate, completedDate);

  // Same day again: idempotent for the streak, but the day's totals still grow.
  if (gap === 0) {
    return {
      state: {
        ...state,
        totalVersesRead: state.totalVersesRead + stats.versesRead,
        totalSecondsRead: state.totalSecondsRead + stats.secondsRead,
      },
      streakChanged: false,
      needsRecalculation: false,
    };
  }

  // A date older than the last completion means history changed underneath us
  // (an offline session synced late). Only a full rebuild can be trusted.
  if (gap < 0) {
    return { state, streakChanged: false, needsRecalculation: true };
  }

  const nextStreak = gap === 1 ? state.currentStreak + 1 : 1;

  return {
    state: {
      ...state,
      currentStreak: nextStreak,
      longestStreak: Math.max(state.longestStreak, nextStreak),
      lastCompletedDate: completedDate,
      streakStartedOn: gap === 1 ? (state.streakStartedOn ?? completedDate) : completedDate,
      totalActiveDays: state.totalActiveDays + 1,
      totalVersesRead: state.totalVersesRead + stats.versesRead,
      totalSecondsRead: state.totalSecondsRead + stats.secondsRead,
    },
    streakChanged: true,
    needsRecalculation: false,
  };
}

/**
 * The streak as the user should currently perceive it.
 *
 * A stored `currentStreak` goes stale the moment local midnight passes without
 * a completion, so the displayed value is always derived from `today` rather
 * than read straight from storage.
 */
export function resolveCurrentStreak(state: StreakState, today: LocalDate): number {
  if (!state.lastCompletedDate) return 0;

  const gap = daysBetweenLocalDates(state.lastCompletedDate, today);

  // Completed today, or completed yesterday with today still open.
  if (gap === 0 || gap === 1) return state.currentStreak;

  // A negative gap means the last completion is in the future relative to
  // today — a clock that moved backwards. Keep showing the streak rather than
  // punishing the user for a device problem.
  if (gap < 0) return state.currentStreak;

  return 0;
}

export interface StreakStatusOptions {
  today: LocalDate;
  completedToday: boolean;
  /** Minutes remaining until local midnight; drives the `at_risk` threshold. */
  minutesUntilMidnight: number;
  /** How close to midnight counts as at risk. */
  atRiskThresholdMinutes?: number;
}

export function getStreakStatus(state: StreakState, options: StreakStatusOptions): StreakStatus {
  const { today, completedToday, minutesUntilMidnight, atRiskThresholdMinutes = 240 } = options;
  const current = resolveCurrentStreak(state, today);

  if (completedToday) return current > 0 ? 'safe' : 'none';
  if (current === 0) return state.lastCompletedDate ? 'broken' : 'none';

  return minutesUntilMidnight <= atRiskThresholdMinutes ? 'at_risk' : 'pending';
}
