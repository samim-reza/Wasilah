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
    dailyTarget: 100,
    totalCount: 0,
    todayCount: 0,
    todayDate: TODAY,
    position: 0,
    ...overrides,
  };
}

describe('deriveProgress', () => {
  it('starts at zero', () => {
    expect(deriveProgress(tasbeeh(), TODAY)).toMatchObject({ totalCount: 0, todayCount: 0 });
  });

  it('reports the lifetime total, untouched by the target', () => {
    expect(deriveProgress(tasbeeh({ totalCount: 42 }), TODAY).totalCount).toBe(42);
    expect(deriveProgress(tasbeeh({ dailyTarget: 0, totalCount: 500 }), TODAY).totalCount).toBe(
      500,
    );
  });

  it('never reports a negative total', () => {
    expect(deriveProgress(tasbeeh({ totalCount: -3 }), TODAY).totalCount).toBe(0);
  });

  it("treats a previous day's tally as zero without needing a write", () => {
    const stale = tasbeeh({ todayCount: 90, todayDate: YESTERDAY });
    expect(deriveProgress(stale, TODAY).todayCount).toBe(0);
  });

  it('reports no daily progress when no target is set', () => {
    expect(deriveProgress(tasbeeh({ dailyTarget: 0, todayCount: 50 }), TODAY).dailyProgress).toBe(0);
  });

  it('fills the ring completely at the exact moment a round completes', () => {
    // Resetting to empty here would hide the thing just achieved.
    expect(deriveProgress(tasbeeh({ dailyTarget: 100, todayCount: 100 }), TODAY).dailyProgress).toBe(1);
  });

  it('starts the ring again on the next round rather than staying full', () => {
    // The bug this pins: the ring stayed full once the first target was met,
    // so the counter kept counting while the ring said nothing was happening.
    expect(deriveProgress(tasbeeh({ dailyTarget: 100, todayCount: 101 }), TODAY).dailyProgress)
      .toBeCloseTo(0.01);
    expect(deriveProgress(tasbeeh({ dailyTarget: 100, todayCount: 150 }), TODAY).dailyProgress)
      .toBeCloseTo(0.5);
    expect(deriveProgress(tasbeeh({ dailyTarget: 100, todayCount: 250 }), TODAY).dailyProgress)
      .toBeCloseTo(0.5);
  });

  it('survives a target of zero rather than dividing by it', () => {
    expect(() => deriveProgress(tasbeeh({ dailyTarget: 0, totalCount: 5 }), TODAY)).not.toThrow();
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
    const next = reset(tasbeeh({ name: 'سُبْحَانَ ٱللَّٰهِ', dailyTarget: 33 }), TODAY);
    expect(next).toMatchObject({ name: 'سُبْحَانَ ٱللَّٰهِ', dailyTarget: 33 });
  });
});
