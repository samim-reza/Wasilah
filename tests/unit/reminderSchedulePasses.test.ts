import { applySchedule, beginSchedulePass } from '@/features/reminders/services/reminderScheduler';
import type { PlannedReminder } from '@/features/reminders/types/reminder.types';
import { cancelAll, scheduleAt } from '@/features/notifications/services/localNotificationService';

jest.mock('@/features/notifications/services/localNotificationService', () => ({
  cancelAll: jest.fn().mockResolvedValue(undefined),
  scheduleAt: jest.fn(async (content: { data: { category: string } }, fireAt: Date) => ({
    identifier: fireAt.toISOString(),
    category: content.data.category,
    scheduledFor: fireAt,
  })),
}));

function dailyAt(iso: string): PlannedReminder {
  return {
    category: 'daily_reminder',
    templateKey: 'dailyReminder',
    fireAt: new Date(iso),
    dedupeKey: `daily_reminder:${iso.slice(0, 10)}`,
  };
}

const scheduledTimes = () =>
  jest.mocked(scheduleAt).mock.calls.map(([, fireAt]) => fireAt.toISOString());

beforeEach(() => {
  jest.mocked(scheduleAt).mockClear();
  jest.mocked(cancelAll).mockClear();
});

describe('reminder schedule passes', () => {
  it('drops a pass that a newer one has overtaken, even if it finishes last', async () => {
    // The old settings' pass starts first, then the user changes the time.
    const stale = beginSchedulePass();
    const fresh = beginSchedulePass();

    const freshResult = await applySchedule([dailyAt('2099-01-01T08:00:00.000Z')], {}, fresh);
    const staleResult = await applySchedule([dailyAt('2099-01-01T07:59:00.000Z')], {}, stale);

    expect(freshResult).toHaveLength(1);
    expect(staleResult).toBeNull();
    expect(scheduledTimes()).toEqual(['2099-01-01T08:00:00.000Z']);
  });

  it('runs applies one at a time, so their cancel and schedule steps never interleave', async () => {
    const order: string[] = [];
    jest.mocked(cancelAll).mockImplementation(async () => {
      order.push('cancel');
    });
    jest.mocked(scheduleAt).mockImplementation(async (content, fireAt) => {
      order.push('schedule');
      return { identifier: 'id', category: content.data.category, scheduledFor: fireAt };
    });

    await Promise.all([
      applySchedule([dailyAt('2099-01-02T08:00:00.000Z')]),
      applySchedule([dailyAt('2099-01-02T08:00:00.000Z')]),
    ]);

    // The first was overtaken by the second before it ran, so only one ran.
    expect(order).toEqual(['cancel', 'schedule']);
  });
});
