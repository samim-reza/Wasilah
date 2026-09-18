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
 * The presets offered during onboarding and in settings.
 *
 * Ordered from smallest to largest, and the list deliberately starts at a
 * single ayah: the product's core promise is that the minimum stays trivially
 * achievable on a bad day.
 */
export interface GoalPreset {
  id: string;
  unit: GoalUnit;
  amount: number;
  /** i18n key for the label, with `count` interpolated. */
  labelKey: string;
}

export const goalPresets: readonly GoalPreset[] = [
  { id: 'ayahs-1', unit: 'ayahs', amount: 1, labelKey: 'goals.ayahs' },
  { id: 'ayahs-3', unit: 'ayahs', amount: 3, labelKey: 'goals.ayahs' },
  { id: 'ayahs-5', unit: 'ayahs', amount: 5, labelKey: 'goals.ayahs' },
  { id: 'ayahs-10', unit: 'ayahs', amount: 10, labelKey: 'goals.ayahs' },
  { id: 'pages-1', unit: 'pages', amount: 1, labelKey: 'goals.pages' },
  { id: 'minutes-5', unit: 'minutes', amount: 5, labelKey: 'goals.minutes' },
  { id: 'minutes-10', unit: 'minutes', amount: 10, labelKey: 'goals.minutes' },
  { id: 'rukus-1', unit: 'rukus', amount: 1, labelKey: 'goals.rukus' },
];

/**
 * The default goal.
 *
 * One ayah as the minimum, five as the goal: low enough that nobody has an
 * excuse to break the chain, high enough that the goal still means something.
 */
export const defaultGoal: Goal = {
  unit: 'ayahs',
  amount: 5,
  minimumUnit: 'ayahs',
  minimumAmount: 1,
};

/** Bounds for the custom-goal input, per unit. */
export const goalLimits: Record<GoalUnit, { min: number; max: number }> = {
  ayahs: { min: 1, max: 300 },
  pages: { min: 1, max: 20 },
  minutes: { min: 1, max: 240 },
  rukus: { min: 1, max: 40 },
};
