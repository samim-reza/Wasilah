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
  /**
   * What the counter is called, and the only text shown for it.
   *
   * Arabic is fine here — a name of "سُبْحَانَ ٱللَّٰهِ" renders as exactly that.
   * A separate Arabic field asked the same question twice.
   */
  name: string;
  /**
   * Target per day, and the round size: a round is a completed target.
   * Zero means no target, which hides the progress ring entirely.
   */
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
  /** Lifetime total, shown beneath the day's figure. */
  totalCount: number;
  /** Today's count, already zeroed when the stored date is not today. */
  todayCount: number;
  /** 0–1 toward the daily target; 0 when no target is set. */
  dailyProgress: number;
}

export interface TasbeehDraft {
  name: string;
  dailyTarget: number;
}
