import { timeGoal } from '@/features/goals/types/goal.types';
import {
  deriveOfflineHabitState,
  type StoredRemoteHabit,
} from '@/features/streak/services/offlineHabitState';
import { emptyStreakState } from '@/features/streak/types/streak.types';
import type { ReadingSessionPayload } from '@/lib/offline/types';
import { isNetworkFailure } from '@/lib/supabase/errors';

const TODAY = '2026-10-02';

function stored(
  overrides: Partial<StoredRemoteHabit['state']> = {},
  date = TODAY,
): StoredRemoteHabit {
  return {
    userId: 'user-1',
    date,
    state: {
      goal: timeGoal(5),
      todayTotals: { versesRead: 0, secondsRead: 120, pagesRead: 0, rukusRead: 0 },
      minimumMet: false,
      goalMet: false,
      streak: {
        ...emptyStreakState,
        currentStreak: 3,
        longestStreak: 3,
        lastCompletedDate: '2026-10-01',
        streakStartedOn: '2026-09-29',
      },
      ...overrides,
    },
  };
}

function session(minutes: number, localDate = TODAY): ReadingSessionPayload {
  const start = Date.parse(`${localDate}T10:00:00Z`);
  return {
    clientSessionId: `s-${minutes}-${localDate}`,
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(start + minutes * 60_000).toISOString(),
    localDate,
    timezone: 'UTC',
    versesRead: 4,
    pagesRead: 0,
    rukusRead: 0,
    chapterId: 2,
    startVerse: 1,
    endVerse: 4,
    source: 'reader',
  };
}

describe('deriveOfflineHabitState', () => {
  it('adds reading still waiting to be sent to the server’s last totals', () => {
    const state = deriveOfflineHabitState(stored(), [session(2)], TODAY);
    expect(state.todayTotals.secondsRead).toBe(120 + 120);
    expect(state.minimumMet).toBe(false);
  });

  it('completes the day and extends the streak once the target is reached offline', () => {
    const state = deriveOfflineHabitState(stored(), [session(3)], TODAY);
    expect(state.minimumMet).toBe(true);
    expect(state.streak.currentStreak).toBe(4);
    expect(state.streak.lastCompletedDate).toBe(TODAY);
  });

  it('does not carry an earlier day’s totals into today', () => {
    const yesterday = stored({}, '2026-10-01');
    const state = deriveOfflineHabitState(yesterday, [], TODAY);
    expect(state.todayTotals.secondsRead).toBe(0);
    // The streak is kept as stored; the screen ages it to today.
    expect(state.streak.currentStreak).toBe(3);
  });

  it('ignores queued sessions from other days', () => {
    const state = deriveOfflineHabitState(stored(), [session(30, '2026-09-30')], TODAY);
    expect(state.todayTotals.secondsRead).toBe(120);
  });
});

describe('isNetworkFailure', () => {
  it('recognises a request that never left the phone', () => {
    expect(isNetworkFailure({ code: '', message: 'TypeError: Network request failed' })).toBe(true);
    expect(isNetworkFailure({ message: 'Failed to fetch' })).toBe(true);
  });

  it('leaves real server errors alone', () => {
    expect(isNetworkFailure({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isNetworkFailure({ code: '', message: 'duplicate key value' })).toBe(false);
  });
});
