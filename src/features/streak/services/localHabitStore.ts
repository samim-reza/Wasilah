/**
 * On-device habit state for guest mode.
 *
 * Wasilah lets people read and build a streak before creating an account, so
 * the habit engine needs a local backing store that behaves like the server
 * one. The streak here is derived with the SAME pure functions
 * (`streakRules.calculateStreak`) the server mirrors in SQL, so a guest who
 * later signs in sees the same number, not a different one.
 *
 * Only aggregate daily totals are kept — never which ayahs were read.
 */
import { addLocalDays, type LocalDate } from '@/lib/datetime/localDate';
import { isRecord } from '@/lib/storage/guards';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import {
  emptyDayTotals,
  isGoalMet,
  isMinimumMet,
  type DayTotals,
} from '@/features/goals/utils/goalProgress';
import type { Goal } from '@/features/goals/types/goal.types';
import { defaultGoal } from '@/features/goals/types/goal.types';

import { calculateStreak, type CompletedDay } from '../utils/streakRules';
import type { StreakState } from '../types/streak.types';

/**
 * How much history to retain locally.
 *
 * Just over a year: long enough for the longest streak and the reading calendar
 * to be meaningful, short enough that the stored blob stays small and cheap to
 * parse on every launch.
 */
const MAX_RETAINED_DAYS = 400;

interface LocalHabitSnapshot {
  /** Day totals keyed by local date. */
  days: Record<LocalDate, DayTotals>;
  goal: Goal;
  /** Carried forward so a trimmed history cannot lower a user's record. */
  longestStreak: number;
}

const emptySnapshot: LocalHabitSnapshot = {
  days: {},
  goal: defaultGoal,
  longestStreak: 0,
};

/** `days` must be a record; anything else and the streak maths would throw. */
function isHabitSnapshot(value: unknown): value is LocalHabitSnapshot {
  return isRecord(value) && isRecord(value['days']);
}

async function read(): Promise<LocalHabitSnapshot> {
  const stored = await keyValueStore.get(storageKeys.localDailyProgress, isHabitSnapshot);
  if (!stored) return emptySnapshot;

  return {
    days: stored.days ?? {},
    goal: stored.goal ?? defaultGoal,
    longestStreak: stored.longestStreak ?? 0,
  };
}

async function write(snapshot: LocalHabitSnapshot): Promise<void> {
  await keyValueStore.set(storageKeys.localDailyProgress, snapshot);
}

/** Drops days older than the retention window, preserving the best-ever streak. */
function trim(snapshot: LocalHabitSnapshot, today: LocalDate): LocalHabitSnapshot {
  const cutoff = addLocalDays(today, -MAX_RETAINED_DAYS);
  const dates = Object.keys(snapshot.days);
  if (dates.every((date) => date >= cutoff)) return snapshot;

  const completed = toCompletedDays(snapshot);
  const before = calculateStreak(completed, today, snapshot.longestStreak);

  const days: Record<LocalDate, DayTotals> = {};
  for (const [date, totals] of Object.entries(snapshot.days)) {
    if (date >= cutoff) days[date] = totals;
  }

  return { ...snapshot, days, longestStreak: before.longestStreak };
}

function toCompletedDays(snapshot: LocalHabitSnapshot): CompletedDay[] {
  const completed: CompletedDay[] = [];

  for (const [date, totals] of Object.entries(snapshot.days)) {
    // A day only enters the streak calculation if it met the minimum, which is
    // re-evaluated against the CURRENT goal each time — lowering a goal
    // retroactively completes days, exactly as the server does.
    if (!isMinimumMet(totals, snapshot.goal)) continue;
    completed.push({
      date,
      versesRead: totals.versesRead,
      secondsRead: totals.secondsRead,
    });
  }

  return completed;
}

export interface LocalHabitState {
  goal: Goal;
  todayTotals: DayTotals;
  minimumMet: boolean;
  goalMet: boolean;
  streak: StreakState;
}

export async function getLocalHabitState(today: LocalDate): Promise<LocalHabitState> {
  const snapshot = await read();
  const todayTotals = snapshot.days[today] ?? emptyDayTotals;

  return {
    goal: snapshot.goal,
    todayTotals,
    minimumMet: isMinimumMet(todayTotals, snapshot.goal),
    goalMet: isGoalMet(todayTotals, snapshot.goal),
    streak: calculateStreak(toCompletedDays(snapshot), today, snapshot.longestStreak),
  };
}

export interface LocalActivity {
  versesRead: number;
  secondsRead: number;
  pagesRead: number;
  rukusRead: number;
}

/** Adds activity to a day and returns the recomputed state. */
export async function addLocalActivity(
  date: LocalDate,
  activity: LocalActivity,
  today: LocalDate,
): Promise<LocalHabitState> {
  const snapshot = await read();
  const existing = snapshot.days[date] ?? emptyDayTotals;

  const updated: LocalHabitSnapshot = {
    ...snapshot,
    days: {
      ...snapshot.days,
      [date]: {
        versesRead: existing.versesRead + Math.max(0, activity.versesRead),
        secondsRead: existing.secondsRead + Math.max(0, activity.secondsRead),
        pagesRead: existing.pagesRead + Math.max(0, activity.pagesRead),
        rukusRead: existing.rukusRead + Math.max(0, activity.rukusRead),
      },
    },
  };

  const trimmed = trim(updated, today);
  await write(trimmed);

  return getLocalHabitStateFrom(trimmed, today);
}

export async function setLocalGoal(goal: Goal, today: LocalDate): Promise<LocalHabitState> {
  const snapshot = await read();
  const updated = { ...snapshot, goal };
  await write(updated);
  return getLocalHabitStateFrom(updated, today);
}

function getLocalHabitStateFrom(snapshot: LocalHabitSnapshot, today: LocalDate): LocalHabitState {
  const todayTotals = snapshot.days[today] ?? emptyDayTotals;

  return {
    goal: snapshot.goal,
    todayTotals,
    minimumMet: isMinimumMet(todayTotals, snapshot.goal),
    goalMet: isGoalMet(todayTotals, snapshot.goal),
    streak: calculateStreak(toCompletedDays(snapshot), today, snapshot.longestStreak),
  };
}

/** The reading calendar for a range, from local data. */
export async function getLocalCalendar(
  from: LocalDate,
  to: LocalDate,
): Promise<
  {
    date: LocalDate;
    minimumMet: boolean;
    goalMet: boolean;
    versesRead: number;
    secondsRead: number;
  }[]
> {
  const snapshot = await read();

  return Object.entries(snapshot.days)
    .filter(([date]) => date >= from && date <= to)
    .map(([date, totals]) => ({
      date,
      minimumMet: isMinimumMet(totals, snapshot.goal),
      goalMet: isGoalMet(totals, snapshot.goal),
      versesRead: totals.versesRead,
      secondsRead: totals.secondsRead,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Called after a guest signs in and their queued sessions have been adopted. */
export async function clearLocalHabitState(): Promise<void> {
  await keyValueStore.remove(storageKeys.localDailyProgress);
}
