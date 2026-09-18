/**
 * Goal progress arithmetic.
 *
 * Pure functions mirroring `public.progress_meets_target` in SQL. Both sides
 * must agree, because the client shows completion optimistically and the server
 * is what ultimately records it — a mismatch would show a user a filled ring
 * that disappears on the next refresh.
 *
 * Units are never converted into one another. Someone whose goal is "5 minutes"
 * is not credited for reading 5 ayahs in one: the goal they chose is the goal
 * they are measured against.
 */
import type { GoalUnit } from '@/lib/supabase/database.types';

import type { Goal } from '../types/goal.types';

/** A day's accumulated reading, in every unit the app tracks. */
export interface DayTotals {
  versesRead: number;
  secondsRead: number;
  pagesRead: number;
  rukusRead: number;
}

export const emptyDayTotals: DayTotals = {
  versesRead: 0,
  secondsRead: 0,
  pagesRead: 0,
  rukusRead: 0,
};

/** The day's total expressed in a given unit. */
export function totalForUnit(totals: DayTotals, unit: GoalUnit): number {
  switch (unit) {
    case 'ayahs':
      return totals.versesRead;
    case 'minutes':
      return totals.secondsRead / 60;
    case 'pages':
      return totals.pagesRead;
    case 'rukus':
      return totals.rukusRead;
  }
}

export function meetsTarget(totals: DayTotals, unit: GoalUnit, amount: number): boolean {
  return totalForUnit(totals, unit) >= amount;
}

export function isMinimumMet(totals: DayTotals, goal: Goal): boolean {
  return meetsTarget(totals, goal.minimumUnit, goal.minimumAmount);
}

export function isGoalMet(totals: DayTotals, goal: Goal): boolean {
  return meetsTarget(totals, goal.unit, goal.amount);
}

/** Fraction of the goal completed, clamped to 0–1 for progress indicators. */
export function goalCompletionRatio(totals: DayTotals, goal: Goal): number {
  if (goal.amount <= 0) return 1;
  const done = totalForUnit(totals, goal.unit);
  return Math.min(1, Math.max(0, done / goal.amount));
}

/** How much is left, in the goal's unit. Rounded up so "0.4 ayahs left" never appears. */
export function remainingToGoal(totals: DayTotals, goal: Goal): number {
  const done = totalForUnit(totals, goal.unit);
  return Math.max(0, Math.ceil(goal.amount - done));
}

/**
 * Keeps a goal internally consistent.
 *
 * When both are measured the same way, the minimum must not exceed the goal —
 * otherwise a user could complete their goal while still "failing" the day.
 */
export function reconcileGoal(goal: Goal): Goal {
  if (goal.minimumUnit !== goal.unit) return goal;
  if (goal.minimumAmount <= goal.amount) return goal;
  return { ...goal, minimumAmount: goal.amount };
}
