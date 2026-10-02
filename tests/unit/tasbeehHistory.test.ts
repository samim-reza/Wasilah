import { withCount } from '@/features/tasbeeh/services/tasbeehHistory';
import type { Tasbeeh } from '@/features/tasbeeh/types/tasbeeh.types';

function counter(todayCount: number, todayDate = '2026-10-02', id = 'a'): Tasbeeh {
  return {
    id,
    name: 'Subhanallah',
    dailyTarget: 33,
    totalCount: 500,
    todayCount,
    todayDate,
    position: 0,
  };
}

describe('withCount', () => {
  it('records the day’s figure for the counter, replacing the earlier one', () => {
    const once = withCount({}, counter(5));
    const twice = withCount(once, counter(9));
    expect(twice['2026-10-02']).toEqual({ a: { name: 'Subhanallah', count: 9 } });
  });

  it('keeps each day separate, so yesterday survives the counter rolling over', () => {
    const history = withCount(withCount({}, counter(33, '2026-10-01')), counter(10));
    expect(history['2026-10-01']!['a']!.count).toBe(33);
    expect(history['2026-10-02']!['a']!.count).toBe(10);
  });

  it('drops a counter reset to zero, and the day once nothing is left in it', () => {
    const history = withCount(withCount({}, counter(5)), counter(0));
    expect(history['2026-10-02']).toBeUndefined();
  });
});
