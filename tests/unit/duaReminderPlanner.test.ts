import {
  CONTEXTUAL_DUA_DELAY_MINUTES,
  planDuaReminders,
  SLEEP_DUA_LEAD_MINUTES,
  type DuaPlanInput,
} from '@/features/reminders/services/duaReminderPlanner';
import { defaultReminderPreferences } from '@/features/reminders/services/reminderService';
import type { WeatherSnapshot } from '@/features/weather/types/weather.types';

import { fixtureCatalogue } from './duaFixtures';

/** Wednesday 2026-09-16, 09:00 London. */
const NOW = new Date('2026-09-16T08:00:00Z');

const RAIN: WeatherSnapshot = {
  condition: 'rain',
  temperatureCelsius: 13,
  isDaytime: true,
  fetchedAt: NOW.toISOString(),
};

function input(overrides: Partial<DuaPlanInput> = {}): DuaPlanInput {
  return {
    preferences: { ...defaultReminderPreferences },
    now: NOW,
    timezone: 'Europe/London',
    today: '2026-09-16',
    horizonDays: 2,
    recentlyShownIds: [],
    randomSeed: 0,
    // The shipped catalogue is all placeholders, which the selector ignores by
    // design, so these tests supply content of their own.
    catalogue: fixtureCatalogue,
    ...overrides,
  };
}

describe('planDuaReminders', () => {
  it('plans nothing when both switches are off', () => {
    expect(planDuaReminders(input())).toEqual([]);
  });

  it('plans nothing contextual when the condition is unremarkable', () => {
    // Everyday duas match everything; without a specificity floor they would
    // fire on every app open.
    const plan = planDuaReminders(
      input({ preferences: { ...defaultReminderPreferences, duaRemindersEnabled: true } }),
    );
    expect(plan).toEqual([]);
  });

  it('plans a contextual dua when it is raining', () => {
    const plan = planDuaReminders(
      input({
        preferences: { ...defaultReminderPreferences, duaRemindersEnabled: true },
        weather: RAIN,
      }),
    );

    expect(plan).toHaveLength(1);
    expect(plan[0]!.duaOccasionId).toBe('rain-falling');
    expect(plan[0]!.fireAt.getTime()).toBe(NOW.getTime() + CONTEXTUAL_DUA_DELAY_MINUTES * 60_000);
  });

  it('plans the nightly prompt before the stated sleep time, not at it', () => {
    const plan = planDuaReminders(
      input({
        preferences: {
          ...defaultReminderPreferences,
          duaRemindersEnabled: false,
          sleepDuaEnabled: true,
          sleepTime: { hour: 23, minute: 0 },
        },
      }),
    );

    expect(plan.length).toBeGreaterThan(0);
    const first = plan[0]!;
    expect(first.duaOccasionId).toBeDefined();

    // 23:00 London on the 16th, minus the lead.
    const sleepAt = new Date('2026-09-16T22:00:00Z');
    expect(first.fireAt.getTime()).toBe(sleepAt.getTime() - SLEEP_DUA_LEAD_MINUTES * 60_000);
  });

  it('plans one nightly prompt per day in the horizon', () => {
    const plan = planDuaReminders(
      input({
        preferences: {
          ...defaultReminderPreferences,
          duaRemindersEnabled: false,
          sleepDuaEnabled: true,
        },
        horizonDays: 2,
      }),
    );
    expect(plan).toHaveLength(2);
  });

  it('skips a nightly prompt whose time has already passed today', () => {
    const plan = planDuaReminders(
      input({
        now: new Date('2026-09-16T23:30:00Z'),
        preferences: {
          ...defaultReminderPreferences,
          duaRemindersEnabled: false,
          sleepDuaEnabled: true,
          sleepTime: { hour: 23, minute: 0 },
        },
      }),
    );
    // Only tomorrow's remains.
    expect(plan).toHaveLength(1);
  });

  it('does not apply today’s weather to a night two days out', () => {
    // Tomorrow's sky is not knowable from the device, so a rain dua must not be
    // scheduled for tomorrow night on the strength of today's reading.
    const plan = planDuaReminders(
      input({
        preferences: {
          ...defaultReminderPreferences,
          sleepDuaEnabled: true,
          sleepTime: { hour: 23, minute: 0 },
        },
        weather: RAIN,
        horizonDays: 2,
      }),
    );

    const tomorrow = plan[plan.length - 1]!;
    expect(tomorrow.duaOccasionId).not.toBe('rain-falling');
  });

  it('gives every planned reminder a distinct dedupe key', () => {
    const plan = planDuaReminders(
      input({
        preferences: {
          ...defaultReminderPreferences,
          sleepDuaEnabled: true,
          duaRemindersEnabled: true,
        },
        weather: RAIN,
      }),
    );

    const keys = plan.map((reminder) => reminder.dedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
