import type { GoalUnit } from '@/lib/supabase/database.types';

export type { GoalUnit };

export interface Goal {
  /** The aspiration. */
  unit: GoalUnit;
  amount: number;
  /** The floor that keeps the streak alive. */
  minimumUnit: GoalUnit;
  minimumAmount: number;
}

/**
 * The daily targets offered during onboarding and on the daily-target screen.
 *
 * Time, not ayahs. A count of ayahs was met by opening the reader for a
 * moment — one ayah drifting across the screen completed the day — so a streak
 * could survive a day on which nothing was really read. Minutes spent reading
 * are what the user actually chooses to give, and what the clock measures
 * honestly (it pauses when the app is in the background).
 */
export interface GoalPreset {
  id: string;
  unit: GoalUnit;
  amount: number;
  /** i18n key for the label, with `count` interpolated. */
  labelKey: string;
}

export const dailyMinuteChoices = [2, 5, 10, 15, 20, 30, 45, 60] as const;

export const goalPresets: readonly GoalPreset[] = dailyMinuteChoices.map((minutes) => ({
  id: `minutes-${minutes}`,
  unit: 'minutes' as const,
  amount: minutes,
  labelKey: 'goals.minutes',
}));

/**
 * A daily target of `minutes`.
 *
 * The target and the streak's minimum are the same thing: the streak grows on
 * each day the chosen time is reached. A separate, lower floor was what let a
 * one-ayah glance keep a streak alive.
 */
export function timeGoal(minutes: number): Goal {
  return { unit: 'minutes', amount: minutes, minimumUnit: 'minutes', minimumAmount: minutes };
}

/** True for a goal measured in time on both counts — every goal from now on. */
export function isTimeGoal(goal: Goal): boolean {
  return goal.unit === 'minutes' && goal.minimumUnit === 'minutes';
}

/** Five minutes: enough to read with attention, short enough for any day. */
export const defaultGoal: Goal = timeGoal(5);

/** Bounds for the custom-goal input, per unit. */
export const goalLimits: Record<GoalUnit, { min: number; max: number }> = {
  ayahs: { min: 1, max: 300 },
  pages: { min: 1, max: 20 },
  minutes: { min: 1, max: 240 },
  rukus: { min: 1, max: 40 },
};
