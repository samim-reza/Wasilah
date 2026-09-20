/**
 * Tasbeeh counters.
 *
 * The counting model mirrors a physical tasbeeh: `totalCount` is the only
 * stored figure, and rounds plus the position within the current round are
 * derived from it. Storing all three would let them drift apart — a dropped
 * write to one and the numbers contradict each other on screen.
 */
import type { LocalDate } from '@/lib/datetime/localDate';

export interface Tasbeeh {
  id: string;
  name: string;
  /** The dhikr shown large on the counter. Empty when the user did not add one. */
  arabic: string;
  /** How many before a round completes. 33 and 100 are the usual choices. */
  roundSize: number;
  /** Zero means no daily target, which hides the progress ring entirely. */
  dailyTarget: number;
  totalCount: number;
  /** Today's tally, paired with the date it belongs to. */
  todayCount: number;
  todayDate: LocalDate | null;
  position: number;
}

/** What the counter screen and the list rows actually display. */
export interface TasbeehProgress {
  /** Completed rounds, derived from the total. */
  rounds: number;
  /** Position within the current round, 1-based while counting. */
  countInRound: number;
  /** Today's count, already zeroed when the stored date is not today. */
  todayCount: number;
  /** 0–1 toward the daily target; 0 when no target is set. */
  dailyProgress: number;
}

export interface TasbeehDraft {
  name: string;
  arabic: string;
  roundSize: number;
  dailyTarget: number;
}
