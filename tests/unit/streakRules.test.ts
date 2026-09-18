/**
 * Streak engine tests.
 *
 * Each block maps to a failure mode the engine was written to survive:
 * duplicates, late offline syncs, clock skew, timezone moves and DST.
 */
import {
  applyDailyCompletion,
  calculateStreak,
  findStreakRuns,
  getStreakStatus,
  resolveCurrentStreak,
  type CompletedDay,
} from '@/features/streak/utils/streakRules';
import { emptyStreakState, type StreakState } from '@/features/streak/types/streak.types';

function days(...dates: string[]): CompletedDay[] {
  return dates.map((date) => ({ date, versesRead: 1, secondsRead: 60 }));
}

describe('findStreakRuns', () => {
  it('groups consecutive dates into one run', () => {
    expect(findStreakRuns(['2026-03-01', '2026-03-02', '2026-03-03'])).toEqual([
      { start: '2026-03-01', end: '2026-03-03', length: 3 },
    ]);
  });

  it('splits on a gap', () => {
    expect(findStreakRuns(['2026-03-01', '2026-03-02', '2026-03-05'])).toEqual([
      { start: '2026-03-01', end: '2026-03-02', length: 2 },
      { start: '2026-03-05', end: '2026-03-05', length: 1 },
    ]);
  });

  it('collapses duplicate dates instead of inflating a run', () => {
    expect(findStreakRuns(['2026-03-01', '2026-03-01', '2026-03-02'])).toEqual([
      { start: '2026-03-01', end: '2026-03-02', length: 2 },
    ]);
  });

  it('sorts unordered input, as an offline queue would deliver it', () => {
    expect(findStreakRuns(['2026-03-03', '2026-03-01', '2026-03-02'])).toEqual([
      { start: '2026-03-01', end: '2026-03-03', length: 3 },
    ]);
  });

  it('returns nothing for no history', () => {
    expect(findStreakRuns([])).toEqual([]);
  });

  it('spans a month boundary', () => {
    expect(findStreakRuns(['2026-01-31', '2026-02-01'])).toEqual([
      { start: '2026-01-31', end: '2026-02-01', length: 2 },
    ]);
  });
});

describe('calculateStreak', () => {
  it('counts a run ending today', () => {
    const state = calculateStreak(days('2026-03-07', '2026-03-08', '2026-03-09'), '2026-03-09');

    expect(state.currentStreak).toBe(3);
    expect(state.longestStreak).toBe(3);
    expect(state.lastCompletedDate).toBe('2026-03-09');
    expect(state.streakStartedOn).toBe('2026-03-07');
  });

  it('keeps a run ending yesterday current, because today is not over', () => {
    const state = calculateStreak(days('2026-03-07', '2026-03-08'), '2026-03-09');
    expect(state.currentStreak).toBe(2);
  });

  it('drops to zero once a whole day has been missed', () => {
    const state = calculateStreak(days('2026-03-06', '2026-03-07'), '2026-03-09');

    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(2);
  });

  it('remembers the longest run after it is broken', () => {
    const state = calculateStreak(
      days('2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-03-09'),
      '2026-03-09',
    );

    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(4);
  });

  it('never lets a previously recorded best regress', () => {
    const state = calculateStreak(days('2026-03-09'), '2026-03-09', 42);
    expect(state.longestStreak).toBe(42);
  });

  it('is empty for a user who has never read', () => {
    expect(calculateStreak([], '2026-03-09')).toEqual(emptyStreakState);
  });

  it('re-forms the streak when an offline day syncs late and fills a gap', () => {
    // The 8th arrives after the 9th was already recorded.
    const state = calculateStreak(days('2026-03-07', '2026-03-09', '2026-03-08'), '2026-03-09');
    expect(state.currentStreak).toBe(3);
  });

  it('merges duplicate days rather than discarding their totals', () => {
    const state = calculateStreak(
      [
        { date: '2026-03-09', versesRead: 3, secondsRead: 120 },
        { date: '2026-03-09', versesRead: 2, secondsRead: 60 },
      ],
      '2026-03-09',
    );

    expect(state.totalActiveDays).toBe(1);
    expect(state.totalVersesRead).toBe(5);
    expect(state.totalSecondsRead).toBe(180);
  });

  it('does not punish a device whose clock is ahead', () => {
    const state = calculateStreak(days('2026-03-09', '2026-03-10'), '2026-03-09');
    expect(state.currentStreak).toBe(2);
  });
});

describe('applyDailyCompletion', () => {
  const base: StreakState = {
    ...emptyStreakState,
    currentStreak: 3,
    longestStreak: 5,
    lastCompletedDate: '2026-03-08',
    streakStartedOn: '2026-03-06',
    totalActiveDays: 10,
    totalVersesRead: 30,
    totalSecondsRead: 900,
  };

  it('starts a streak from nothing', () => {
    const result = applyDailyCompletion(emptyStreakState, '2026-03-09', {
      versesRead: 1,
      secondsRead: 40,
    });

    expect(result.state.currentStreak).toBe(1);
    expect(result.state.streakStartedOn).toBe('2026-03-09');
    expect(result.streakChanged).toBe(true);
  });

  it('extends on the next day', () => {
    const result = applyDailyCompletion(base, '2026-03-09');

    expect(result.state.currentStreak).toBe(4);
    expect(result.state.streakStartedOn).toBe('2026-03-06');
    expect(result.streakChanged).toBe(true);
  });

  it('restarts at 1 after a missed day', () => {
    const result = applyDailyCompletion(base, '2026-03-11');

    expect(result.state.currentStreak).toBe(1);
    expect(result.state.streakStartedOn).toBe('2026-03-11');
    expect(result.state.longestStreak).toBe(5);
  });

  it('is idempotent for the same day, but still accrues totals', () => {
    const result = applyDailyCompletion(base, '2026-03-08', {
      versesRead: 2,
      secondsRead: 100,
    });

    expect(result.state.currentStreak).toBe(3);
    expect(result.state.totalActiveDays).toBe(10);
    expect(result.state.totalVersesRead).toBe(32);
    expect(result.streakChanged).toBe(false);
  });

  it('asks for a full recalculation when a past day arrives late', () => {
    const result = applyDailyCompletion(base, '2026-03-05');

    expect(result.needsRecalculation).toBe(true);
    expect(result.state).toEqual(base);
  });

  it('raises the longest streak when the current run overtakes it', () => {
    const almost: StreakState = { ...base, currentStreak: 5, longestStreak: 5 };
    const result = applyDailyCompletion(almost, '2026-03-09');

    expect(result.state.longestStreak).toBe(6);
  });
});

describe('resolveCurrentStreak', () => {
  const state: StreakState = {
    ...emptyStreakState,
    currentStreak: 7,
    lastCompletedDate: '2026-03-08',
  };

  it('holds while today is still open', () => {
    expect(resolveCurrentStreak(state, '2026-03-08')).toBe(7);
    expect(resolveCurrentStreak(state, '2026-03-09')).toBe(7);
  });

  it('expires once a full day has been missed', () => {
    expect(resolveCurrentStreak(state, '2026-03-10')).toBe(0);
  });

  it('is zero without any history', () => {
    expect(resolveCurrentStreak(emptyStreakState, '2026-03-09')).toBe(0);
  });

  it('survives a user flying west across the date line', () => {
    // Travelling backwards can make "today" earlier than the last completion.
    expect(resolveCurrentStreak(state, '2026-03-07')).toBe(7);
  });
});

describe('getStreakStatus', () => {
  const active: StreakState = {
    ...emptyStreakState,
    currentStreak: 4,
    lastCompletedDate: '2026-03-08',
  };

  it('is safe once today is done', () => {
    expect(
      getStreakStatus(active, {
        today: '2026-03-09',
        completedToday: true,
        minutesUntilMidnight: 30,
      }),
    ).toBe('safe');
  });

  it('is pending earlier in the day', () => {
    expect(
      getStreakStatus(active, {
        today: '2026-03-09',
        completedToday: false,
        minutesUntilMidnight: 600,
      }),
    ).toBe('pending');
  });

  it('is at risk close to midnight', () => {
    expect(
      getStreakStatus(active, {
        today: '2026-03-09',
        completedToday: false,
        minutesUntilMidnight: 90,
      }),
    ).toBe('at_risk');
  });

  it('is broken after the run lapses', () => {
    expect(
      getStreakStatus(active, {
        today: '2026-03-12',
        completedToday: false,
        minutesUntilMidnight: 600,
      }),
    ).toBe('broken');
  });

  it('is none for a user with no history', () => {
    expect(
      getStreakStatus(emptyStreakState, {
        today: '2026-03-09',
        completedToday: false,
        minutesUntilMidnight: 600,
      }),
    ).toBe('none');
  });
});
