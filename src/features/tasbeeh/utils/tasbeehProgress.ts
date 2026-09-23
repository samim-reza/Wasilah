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
 * What the counter shows, derived from what is stored.
 *
 * The daily target doubles as the ring's round size: the ring empties and
 * fills again each time today's count passes it. A separate round size was
 * the same number asked twice, and one of them always drifted.
 */
export function deriveProgress(tasbeeh: Tasbeeh, today: LocalDate): TasbeehProgress {
  const total = Math.max(0, tasbeeh.totalCount);

  // A stored count from a previous day reads as zero without needing a write.
  const todayCount = tasbeeh.todayDate === today ? tasbeeh.todayCount : 0;

  const target = Math.max(0, tasbeeh.dailyTarget);

  // The ring shows the CURRENT round, not the day as a whole, so it empties
  // and fills again on every round. Capping it at the first completed target
  // left it stuck full for the rest of the session — the counter kept
  // counting while the ring said nothing more was happening.
  //
  // The exact boundary shows full rather than empty: landing on the target is
  // the moment the round is complete, and resetting the ring at the instant
  // of completion would hide the thing the user just achieved. The next press
  // starts the new round.
  const withinRound = target > 0 ? todayCount % target : 0;
  const dailyProgress =
    target === 0 ? 0 : withinRound === 0 && todayCount > 0 ? 1 : withinRound / target;

  return { totalCount: total, todayCount, dailyProgress };
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
