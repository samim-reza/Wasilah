/**
 * Habit state for a signed-in user while the server cannot be reached.
 *
 * The server is the authority for a signed-in user's goal, progress and
 * streak, and the app used to show an error screen on Home whenever it could
 * not be asked — which, for a habit app opened on a bus or a plane, read as
 * "this app needs the internet". Now the last answer the server gave is kept
 * on the device, and offline the state is rebuilt from it plus the reading
 * sessions still waiting in the sync queue. When the connection returns the
 * queue is sent, the server recomputes, and its answer replaces this one.
 *
 * The derivation is pure and mirrors what the server does with the same
 * inputs: totals add up, the minimum and goal are judged against the stored
 * goal, and a completed day extends the streak by the same rule
 * (`applyDailyCompletion`).
 */
import type { LocalDate } from '@/lib/datetime/localDate';
import { isRecord } from '@/lib/storage/guards';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { peekBatch } from '@/lib/offline/syncQueue';
import type { ReadingSessionPayload } from '@/lib/offline/types';
import { isGoalMet, isMinimumMet, type DayTotals } from '@/features/goals/utils/goalProgress';

import { applyDailyCompletion } from '../utils/streakRules';
import type { LocalHabitState } from './localHabitStore';

/** The server's last answer, as written after every successful fetch. */
export interface StoredRemoteHabit {
  userId: string;
  /** The local date the answer was for. */
  date: LocalDate;
  state: LocalHabitState;
}

function isStoredRemoteHabit(value: unknown): value is StoredRemoteHabit {
  return (
    isRecord(value) &&
    typeof value['userId'] === 'string' &&
    typeof value['date'] === 'string' &&
    isRecord(value['state'])
  );
}

export async function rememberRemoteHabit(
  userId: string,
  date: LocalDate,
  state: LocalHabitState,
): Promise<void> {
  await keyValueStore.set(storageKeys.remoteHabitState, { userId, date, state });
}

/** The reading a session adds, in the units the day's totals are kept in. */
function totalsOf(session: ReadingSessionPayload): DayTotals {
  const seconds = Math.max(0, (Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000);
  return {
    versesRead: session.versesRead,
    secondsRead: Math.round(seconds),
    pagesRead: session.pagesRead,
    rukusRead: session.rukusRead,
  };
}

function add(a: DayTotals, b: DayTotals): DayTotals {
  return {
    versesRead: a.versesRead + b.versesRead,
    secondsRead: a.secondsRead + b.secondsRead,
    pagesRead: a.pagesRead + b.pagesRead,
    rukusRead: a.rukusRead + b.rukusRead,
  };
}

const NO_READING: DayTotals = { versesRead: 0, secondsRead: 0, pagesRead: 0, rukusRead: 0 };

/**
 * Today's state from the server's last answer and the sessions not yet sent.
 *
 * A stored answer from an earlier day still carries the goal and the streak,
 * but none of its day's totals: those belong to that day.
 */
export function deriveOfflineHabitState(
  stored: StoredRemoteHabit,
  pendingSessions: readonly ReadingSessionPayload[],
  today: LocalDate,
): LocalHabitState {
  const { goal, streak } = stored.state;
  const base = stored.date === today ? stored.state.todayTotals : NO_READING;

  const todayTotals = pendingSessions
    .filter((session) => session.localDate === today)
    .reduce((totals, session) => add(totals, totalsOf(session)), base);

  const minimumMet = isMinimumMet(todayTotals, goal);

  return {
    goal,
    todayTotals,
    minimumMet,
    goalMet: isGoalMet(todayTotals, goal),
    // Idempotent for a day already counted; +1 after yesterday; a fresh run
    // after a gap. A day not yet complete leaves the streak as stored, and
    // the caller ages it to today as it does the server's.
    streak: minimumMet ? applyDailyCompletion(streak, today).state : streak,
  };
}

/** The offline state, or null when there is no stored answer for this user. */
export async function loadOfflineHabitState(
  userId: string,
  today: LocalDate,
): Promise<LocalHabitState | null> {
  const stored = await keyValueStore.get(storageKeys.remoteHabitState, isStoredRemoteHabit);
  if (!stored || stored.userId !== userId) return null;

  const pending = (await peekBatch(userId, 500))
    .filter((operation) => operation.type === 'reading_session')
    .map((operation) => operation.payload as ReadingSessionPayload);

  return deriveOfflineHabitState(stored, pending, today);
}
