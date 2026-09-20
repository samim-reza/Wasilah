import {
  decrement,
  deriveProgress,
  increment,
  reset,
} from '@/features/tasbeeh/utils/tasbeehProgress';
import type { Tasbeeh } from '@/features/tasbeeh/types/tasbeeh.types';

const TODAY = '2026-09-21';
const YESTERDAY = '2026-09-20';

function tasbeeh(overrides: Partial<Tasbeeh> = {}): Tasbeeh {
  return {
    id: 't1',
    name: 'Kalima',
    arabic: '',
    roundSize: 100,
    dailyTarget: 0,
    totalCount: 0,
    todayCount: 0,
    todayDate: TODAY,
    position: 0,
    ...overrides,
  };
}

describe('deriveProgress', () => {
  it('starts at zero rounds and zero within the round', () => {
    expect(deriveProgress(tasbeeh(), TODAY)).toMatchObject({ rounds: 0, countInRound: 0 });
  });

  it('counts within the first round', () => {
    expect(deriveProgress(tasbeeh({ totalCount: 42 }), TODAY)).toMatchObject({
      rounds: 0,
      countInRound: 42,
    });
  });

  it('shows the completing bead as the full round, not as zero of the next', () => {
    // A physical tasbeeh reads 100/100 on the hundredth bead.
    expect(deriveProgress(tasbeeh({ totalCount: 100 }), TODAY)).toMatchObject({
      rounds: 0,
      countInRound: 100,
    });
  });

  it('rolls into the next round on the following press', () => {
    expect(deriveProgress(tasbeeh({ totalCount: 101 }), TODAY)).toMatchObject({
      rounds: 1,
      countInRound: 1,
    });
  });

  it('matches the figures from a large running total', () => {
    // 180 complete rounds of 1000, plus one.
    const progress = deriveProgress(tasbeeh({ roundSize: 1000, totalCount: 180_001 }), TODAY);
    expect(progress).toMatchObject({ rounds: 180, countInRound: 1 });
  });

  it("treats a previous day's tally as zero without needing a write", () => {
    const stale = tasbeeh({ todayCount: 90, todayDate: YESTERDAY });
    expect(deriveProgress(stale, TODAY).todayCount).toBe(0);
  });

  it('reports no daily progress when no target is set', () => {
    expect(deriveProgress(tasbeeh({ todayCount: 50 }), TODAY).dailyProgress).toBe(0);
  });

  it('caps daily progress at fully complete', () => {
    const over = tasbeeh({ dailyTarget: 100, todayCount: 250 });
    expect(deriveProgress(over, TODAY).dailyProgress).toBe(1);
  });

  it('survives a round size of zero rather than dividing by it', () => {
    expect(() => deriveProgress(tasbeeh({ roundSize: 0, totalCount: 5 }), TODAY)).not.toThrow();
  });
});

describe('increment', () => {
  it('raises both the total and today', () => {
    const next = increment(tasbeeh({ totalCount: 5, todayCount: 5 }), TODAY);
    expect(next).toMatchObject({ totalCount: 6, todayCount: 6, todayDate: TODAY });
  });

  it("starts today's tally fresh on a new day, keeping the total", () => {
    const next = increment(tasbeeh({ totalCount: 900, todayCount: 90, todayDate: YESTERDAY }), TODAY);
    expect(next).toMatchObject({ totalCount: 901, todayCount: 1, todayDate: TODAY });
  });
});

describe('decrement', () => {
  it('steps back by one', () => {
    const next = decrement(tasbeeh({ totalCount: 5, todayCount: 5 }), TODAY);
    expect(next).toMatchObject({ totalCount: 4, todayCount: 4 });
  });

  it('never goes below zero', () => {
    expect(decrement(tasbeeh({ totalCount: 0 }), TODAY).totalCount).toBe(0);
  });

  it("does not make today negative when undoing yesterday's press", () => {
    const next = decrement(tasbeeh({ totalCount: 900, todayCount: 90, todayDate: YESTERDAY }), TODAY);
    expect(next.totalCount).toBe(899);
    expect(next.todayCount).toBe(0);
  });
});

describe('reset', () => {
  it('clears the total and today together', () => {
    const next = reset(tasbeeh({ totalCount: 5000, todayCount: 120 }), TODAY);
    expect(next).toMatchObject({ totalCount: 0, todayCount: 0, todayDate: TODAY });
  });

  it('keeps the counter itself, not just its numbers', () => {
    const next = reset(tasbeeh({ name: 'Subhanallah', roundSize: 33 }), TODAY);
    expect(next).toMatchObject({ name: 'Subhanallah', roundSize: 33 });
  });
});
