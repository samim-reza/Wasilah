import type { LocalDate } from '@/lib/datetime/localDate';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: LocalDate | null;
  /** First day of the run that is currently active, for "since" copy. */
  streakStartedOn: LocalDate | null;
  totalActiveDays: number;
  totalVersesRead: number;
  totalSecondsRead: number;
}

export const emptyStreakState: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  streakStartedOn: null,
  totalActiveDays: 0,
  totalVersesRead: 0,
  totalSecondsRead: 0,
};

/** How urgently the UI should treat the streak right now. */
export type StreakStatus =
  /** No streak yet. */
  | 'none'
  /** Today is already complete. */
  | 'safe'
  /** Active, but today has not been completed yet. */
  | 'pending'
  /** Active, today incomplete, and local midnight is close. */
  | 'at_risk'
  /** The run ended; the next completed day starts a new one. */
  | 'broken';
