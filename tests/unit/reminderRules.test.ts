/**
 * Reminder rule tests.
 *
 * Almost every case here asserts that a notification is NOT sent. That is the
 * point: the engine's value is in what it suppresses.
 */
import {
  evaluateDailyReminder,
  evaluateGoalReminder,
  evaluateStreakReminder,
  inferPreferredHour,
  isInQuietHours,
  minutesSinceLastNotification,
  minutesUntilLocalMidnight,
  resolveDailyReminderTime,
  shouldBackOff,
} from '@/features/reminders/utils/reminderRules';
import { defaultReminderPreferences } from '@/features/reminders/services/reminderService';
import type {
  NotificationRecord,
  ReminderContext,
  ReminderPreferences,
} from '@/features/reminders/types/reminder.types';

function buildContext(overrides: Partial<ReminderContext> = {}): ReminderContext {
  return {
    // 18:00 UTC, comfortably outside the default 22:30–07:00 quiet hours.
    now: new Date('2026-03-09T18:00:00Z'),
    timezone: 'UTC',
    today: '2026-03-09',
    preferences: defaultReminderPreferences,
    minimumCompletedToday: false,
    goalCompletedToday: false,
    remainingToGoal: 3,
    currentStreak: 5,
    todaysNotifications: [],
    recentNotifications: [],
    permissionGranted: true,
    ...overrides,
  };
}

function record(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    category: 'daily_reminder',
    sentAt: new Date('2026-03-09T09:00:00Z'),
    localDate: '2026-03-09',
    opened: false,
    ...overrides,
  };
}

describe('evaluateDailyReminder', () => {
  it('sends when the day is incomplete and nothing blocks it', () => {
    expect(evaluateDailyReminder(buildContext()).shouldSend).toBe(true);
  });

  it('never nags a user who has already read today', () => {
    const decision = evaluateDailyReminder(buildContext({ minimumCompletedToday: true }));

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('already_completed');
  });

  it('stays silent during quiet hours', () => {
    const decision = evaluateDailyReminder(buildContext({ now: new Date('2026-03-09T23:30:00Z') }));

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('quiet_hours');
  });

  it('respects the daily cap', () => {
    // The cap is set explicitly rather than leaning on whatever the default
    // happens to be — this test broke when the default moved from 2 to 10,
    // which told us nothing about the rule it is meant to protect.
    const decision = evaluateDailyReminder(
      buildContext({
        preferences: { ...defaultReminderPreferences, maxNotificationsPerDay: 2 },
        todaysNotifications: [
          record({ category: 'streak_reminder', sentAt: new Date('2026-03-09T08:00:00Z') }),
          record({ category: 'goal_reminder', sentAt: new Date('2026-03-09T09:00:00Z') }),
        ],
      }),
    );

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('daily_cap_reached');
  });

  it('waits out the cooldown between notifications', () => {
    const decision = evaluateDailyReminder(
      buildContext({
        preferences: { ...defaultReminderPreferences, maxNotificationsPerDay: 5 },
        todaysNotifications: [
          record({ category: 'streak_reminder', sentAt: new Date('2026-03-09T17:00:00Z') }),
        ],
      }),
    );

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('cooldown_active');
  });

  it('never repeats a category within one day', () => {
    const decision = evaluateDailyReminder(
      buildContext({
        preferences: {
          ...defaultReminderPreferences,
          maxNotificationsPerDay: 5,
          minMinutesBetweenNotifications: 0,
        },
        todaysNotifications: [
          record({ category: 'daily_reminder', sentAt: new Date('2026-03-09T08:00:00Z') }),
        ],
      }),
    );

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('duplicate_today');
  });

  it('sends nothing without permission', () => {
    const decision = evaluateDailyReminder(buildContext({ permissionGranted: false }));

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('permission_denied');
  });

  it('honours the category being switched off', () => {
    const decision = evaluateDailyReminder(
      buildContext({
        preferences: { ...defaultReminderPreferences, dailyReminderEnabled: false },
      }),
    );

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('category_disabled');
  });

  it('backs off after several ignored reminders', () => {
    const ignored = Array.from({ length: 5 }, (_, index) =>
      record({
        sentAt: new Date(`2026-03-0${index + 1}T18:00:00Z`),
        localDate: `2026-03-0${index + 1}`,
        opened: false,
      }),
    );

    const decision = evaluateDailyReminder(buildContext({ recentNotifications: ignored }));

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('adaptive_backoff');
  });

  it('keeps sending while the user is still engaging', () => {
    const mixed = Array.from({ length: 5 }, (_, index) =>
      record({
        sentAt: new Date(`2026-03-0${index + 1}T18:00:00Z`),
        localDate: `2026-03-0${index + 1}`,
        opened: index % 2 === 0,
      }),
    );

    expect(evaluateDailyReminder(buildContext({ recentNotifications: mixed })).shouldSend).toBe(
      true,
    );
  });
});

describe('evaluateStreakReminder', () => {
  it('fires only once the day is nearly over', () => {
    // 21:00 UTC leaves 180 minutes, exactly at the at-risk threshold.
    const decision = evaluateStreakReminder(
      buildContext({ now: new Date('2026-03-09T21:00:00Z') }),
    );
    expect(decision.shouldSend).toBe(true);
  });

  it('stays quiet earlier in the day', () => {
    const decision = evaluateStreakReminder(
      buildContext({ now: new Date('2026-03-09T14:00:00Z') }),
    );

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('nothing_to_say');
  });

  it('has nothing to rescue without a streak', () => {
    const decision = evaluateStreakReminder(
      buildContext({ now: new Date('2026-03-09T21:00:00Z'), currentStreak: 0 }),
    );

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('nothing_to_say');
  });

  it('stands down once the day is complete', () => {
    const decision = evaluateStreakReminder(
      buildContext({ now: new Date('2026-03-09T21:00:00Z'), minimumCompletedToday: true }),
    );

    expect(decision.reason).toBe('already_completed');
  });
});

describe('evaluateGoalReminder', () => {
  const enabled: ReminderPreferences = {
    ...defaultReminderPreferences,
    goalReminderEnabled: true,
  };

  it('encourages finishing, once the user has started', () => {
    const decision = evaluateGoalReminder(
      buildContext({ preferences: enabled, minimumCompletedToday: true, remainingToGoal: 2 }),
    );
    expect(decision.shouldSend).toBe(true);
  });

  it('does not use the goal reminder to prompt a user who has not started', () => {
    const decision = evaluateGoalReminder(
      buildContext({ preferences: enabled, minimumCompletedToday: false }),
    );

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toBe('nothing_to_say');
  });

  it('is silent once the goal is met', () => {
    const decision = evaluateGoalReminder(
      buildContext({
        preferences: enabled,
        minimumCompletedToday: true,
        goalCompletedToday: true,
        remainingToGoal: 0,
      }),
    );

    expect(decision.reason).toBe('already_completed');
  });
});

describe('isInQuietHours', () => {
  it('covers the wrap past midnight', () => {
    expect(isInQuietHours({ hour: 23, minute: 0 }, defaultReminderPreferences)).toBe(true);
    expect(isInQuietHours({ hour: 5, minute: 0 }, defaultReminderPreferences)).toBe(true);
    expect(isInQuietHours({ hour: 12, minute: 0 }, defaultReminderPreferences)).toBe(false);
  });

  it('is inert when quiet hours are switched off', () => {
    const preferences = { ...defaultReminderPreferences, quietHoursEnabled: false };
    expect(isInQuietHours({ hour: 23, minute: 0 }, preferences)).toBe(false);
  });
});

describe('minutesSinceLastNotification', () => {
  it('is infinite with no history, so a first notification is never blocked', () => {
    expect(minutesSinceLastNotification([], new Date())).toBe(Number.POSITIVE_INFINITY);
  });

  it('measures from the most recent, not the first', () => {
    const now = new Date('2026-03-09T12:00:00Z');
    const minutes = minutesSinceLastNotification(
      [
        record({ sentAt: new Date('2026-03-09T08:00:00Z') }),
        record({ sentAt: new Date('2026-03-09T11:30:00Z') }),
      ],
      now,
    );

    expect(minutes).toBe(30);
  });
});

describe('shouldBackOff', () => {
  it('needs enough history before concluding anything', () => {
    const few = [record({ opened: false }), record({ opened: false })];
    expect(shouldBackOff(few, defaultReminderPreferences)).toBe(false);
  });

  it('does nothing when adaptive frequency is disabled', () => {
    const ignored = Array.from({ length: 5 }, () => record({ opened: false }));
    const preferences = { ...defaultReminderPreferences, adaptiveFrequencyEnabled: false };

    expect(shouldBackOff(ignored, preferences)).toBe(false);
  });
});

describe('minutesUntilLocalMidnight', () => {
  it('measures in the user local day, not UTC', () => {
    const now = new Date('2026-03-09T18:00:00Z');

    expect(minutesUntilLocalMidnight(now, 'UTC')).toBe(360);
    // 18:00 UTC is midnight in Dhaka, so the day has just begun there.
    expect(minutesUntilLocalMidnight(now, 'Asia/Dhaka')).toBe(1440);
  });
});

describe('inferPreferredHour', () => {
  it('refuses to guess from too little data', () => {
    const times = [new Date('2026-03-09T20:00:00Z'), new Date('2026-03-08T20:00:00Z')];
    expect(inferPreferredHour(times, 'UTC')).toBeNull();
  });

  it('finds a genuine habit', () => {
    const times = Array.from(
      { length: 8 },
      (_, index) => new Date(`2026-03-0${(index % 9) + 1}T20:15:00Z`),
    );
    expect(inferPreferredHour(times, 'UTC')).toBe(20);
  });

  it('returns nothing when reading times are scattered', () => {
    const times = [
      new Date('2026-03-01T06:00:00Z'),
      new Date('2026-03-02T10:00:00Z'),
      new Date('2026-03-03T14:00:00Z'),
      new Date('2026-03-04T18:00:00Z'),
      new Date('2026-03-05T22:00:00Z'),
      new Date('2026-03-06T02:00:00Z'),
    ];
    expect(inferPreferredHour(times, 'UTC')).toBeNull();
  });
});

describe('resolveDailyReminderTime', () => {
  it('always prefers the time the user chose', () => {
    const resolved = resolveDailyReminderTime(defaultReminderPreferences, 7, true);
    expect(resolved).toEqual(defaultReminderPreferences.dailyReminderTime);
  });

  it('uses a learned hour only when the user never set one', () => {
    const resolved = resolveDailyReminderTime(defaultReminderPreferences, 7, false);
    expect(resolved).toEqual({ hour: 7, minute: 0 });
  });

  it('moves a reminder out of quiet hours rather than dropping it', () => {
    const resolved = resolveDailyReminderTime(defaultReminderPreferences, 23, false);
    expect(resolved).toEqual(defaultReminderPreferences.quietHoursEnd);
  });
});
