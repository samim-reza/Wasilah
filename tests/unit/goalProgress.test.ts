import {
  emptyDayTotals,
  goalCompletionRatio,
  isGoalMet,
  isMinimumMet,
  meetsTarget,
  reconcileGoal,
  remainingToGoal,
  totalForUnit,
  type DayTotals,
} from '@/features/goals/utils/goalProgress';
import { defaultGoal, type Goal } from '@/features/goals/types/goal.types';

function totals(overrides: Partial<DayTotals> = {}): DayTotals {
  return { ...emptyDayTotals, ...overrides };
}

describe('totalForUnit', () => {
  it('converts seconds to minutes for a time-based goal', () => {
    expect(totalForUnit(totals({ secondsRead: 300 }), 'minutes')).toBe(5);
  });

  it('reads each other unit directly', () => {
    const day = totals({ versesRead: 7, pagesRead: 2, rukusRead: 1 });

    expect(totalForUnit(day, 'ayahs')).toBe(7);
    expect(totalForUnit(day, 'pages')).toBe(2);
    expect(totalForUnit(day, 'rukus')).toBe(1);
  });
});

describe('meetsTarget', () => {
  it('does not let one unit satisfy a goal set in another', () => {
    // Someone whose goal is five minutes has not met it by reading five ayahs.
    const day = totals({ versesRead: 50, secondsRead: 60 });

    expect(meetsTarget(day, 'ayahs', 5)).toBe(true);
    expect(meetsTarget(day, 'minutes', 5)).toBe(false);
  });

  it('is inclusive at the boundary', () => {
    expect(meetsTarget(totals({ versesRead: 5 }), 'ayahs', 5)).toBe(true);
    expect(meetsTarget(totals({ versesRead: 4 }), 'ayahs', 5)).toBe(false);
  });
});

describe('isMinimumMet', () => {
  it('is satisfied by a single ayah on the default goal', () => {
    expect(isMinimumMet(totals({ versesRead: 1 }), defaultGoal)).toBe(true);
    expect(isGoalMet(totals({ versesRead: 1 }), defaultGoal)).toBe(false);
  });

  it('is false for a day with no reading', () => {
    expect(isMinimumMet(emptyDayTotals, defaultGoal)).toBe(false);
  });
});

describe('goalCompletionRatio', () => {
  it('reports partial progress', () => {
    expect(goalCompletionRatio(totals({ versesRead: 2 }), defaultGoal)).toBeCloseTo(0.4);
  });

  it('clamps rather than overflowing past the goal', () => {
    expect(goalCompletionRatio(totals({ versesRead: 50 }), defaultGoal)).toBe(1);
  });

  it('treats a zero goal as complete rather than dividing by zero', () => {
    const zeroGoal: Goal = { ...defaultGoal, amount: 0 };
    expect(goalCompletionRatio(emptyDayTotals, zeroGoal)).toBe(1);
  });
});

describe('remainingToGoal', () => {
  it('rounds up so a fractional remainder never reads as "0 left"', () => {
    const minutesGoal: Goal = {
      unit: 'minutes',
      amount: 10,
      minimumUnit: 'ayahs',
      minimumAmount: 1,
    };
    // 9 minutes 30 seconds read; 30 seconds remain, shown as 1 minute.
    expect(remainingToGoal(totals({ secondsRead: 570 }), minutesGoal)).toBe(1);
  });

  it('is zero once the goal is met', () => {
    expect(remainingToGoal(totals({ versesRead: 10 }), defaultGoal)).toBe(0);
  });
});

describe('reconcileGoal', () => {
  it('caps a same-unit minimum at the goal', () => {
    const inconsistent: Goal = {
      unit: 'ayahs',
      amount: 3,
      minimumUnit: 'ayahs',
      minimumAmount: 10,
    };

    expect(reconcileGoal(inconsistent).minimumAmount).toBe(3);
  });

  it('leaves differently-measured minimums alone', () => {
    const mixed: Goal = {
      unit: 'minutes',
      amount: 5,
      minimumUnit: 'ayahs',
      minimumAmount: 1,
    };

    expect(reconcileGoal(mixed)).toEqual(mixed);
  });
});
