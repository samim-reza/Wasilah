/**
 * Deriving what the counter displays from what is stored.
 *
 * Pure, so every rollover and reset case is testable without a clock or a
 * database. The date arrives as an argument for the same reason.
 */
import type { LocalDate } from '@/lib/datetime/localDate';

import type { Tasbeeh, TasbeehProgress } from '../types/tasbeeh.types';

/** The default counter a new user starts with. */
export const DEFAULT_TASBEEH_NAME = 'Kalima';

/**
 * Rounds and position, derived from the total.
 *
 * The position is 1-based while counting and shows the full round size on the
 * bead that completes it: at a round size of 100, the hundredth press reads
 * "100 / 100" rather than "0 / 100" with the round already banked. That is
 * what a physical tasbeeh does, and reading 0 at the moment of completion is
 * the kind of detail that makes a counter feel wrong.
 */
export function deriveProgress(tasbeeh: Tasbeeh, today: LocalDate): TasbeehProgress {
  const size = Math.max(1, tasbeeh.roundSize);
  const total = Math.max(0, tasbeeh.totalCount);

  const remainder = total % size;
  const completedRounds = Math.floor(total / size);

  // A total that lands exactly on a round boundary belongs to the round it
  // just finished, not to the next one at position zero.
  const rounds = remainder === 0 && total > 0 ? completedRounds - 1 : completedRounds;
  const countInRound = remainder === 0 && total > 0 ? size : remainder;

  // A stored count from a previous day reads as zero without needing a write.
  const todayCount = tasbeeh.todayDate === today ? tasbeeh.todayCount : 0;

  const dailyProgress =
    tasbeeh.dailyTarget > 0 ? Math.min(1, todayCount / tasbeeh.dailyTarget) : 0;

  return { rounds, countInRound, todayCount, dailyProgress };
}

/** The tasbeeh after one press, with the daily tally rolled over if needed. */
export function increment(tasbeeh: Tasbeeh, today: LocalDate): Tasbeeh {
  const carriedToday = tasbeeh.todayDate === today ? tasbeeh.todayCount : 0;

  return {
    ...tasbeeh,
    totalCount: tasbeeh.totalCount + 1,
    todayCount: carriedToday + 1,
    todayDate: today,
  };
}

/**
 * One step back, for a miscount.
 *
 * Never goes below zero, and decrements today's tally only when the stored
 * date is today — undoing a press made yesterday must not make today negative.
 */
export function decrement(tasbeeh: Tasbeeh, today: LocalDate): Tasbeeh {
  if (tasbeeh.totalCount === 0) return tasbeeh;

  const isToday = tasbeeh.todayDate === today;

  return {
    ...tasbeeh,
    totalCount: tasbeeh.totalCount - 1,
    todayCount: isToday ? Math.max(0, tasbeeh.todayCount - 1) : 0,
    todayDate: isToday ? tasbeeh.todayDate : today,
  };
}

/**
 * Clears the counter.
 *
 * Resets the total as well as today: the reset button on a tasbeeh means
 * "start this dhikr again", and leaving a lifetime total behind while the
 * round counter showed zero would be confusing.
 */
export function reset(tasbeeh: Tasbeeh, today: LocalDate): Tasbeeh {
  return { ...tasbeeh, totalCount: 0, todayCount: 0, todayDate: today };
}
