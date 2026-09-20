/**
 * Placing dua reminders on the schedule.
 *
 * Two slots, because the two behave completely differently:
 *
 *   The NIGHTLY slot is time-based, so it can be scheduled days ahead with
 *   confidence. It is the "do you know the dua for leaving the house?" prompt,
 *   drawn from whatever fits that moment.
 *
 *   The CONTEXTUAL slot is condition-based — rain, the new crescent, Friday —
 *   and can only ever be scheduled for conditions observed right now. Tomorrow's
 *   weather is not knowable from the device, so nothing weather-driven is
 *   planned beyond the current moment.
 *
 * That second limit is real and worth stating plainly: while the app is closed,
 * a local schedule cannot react to the sky. Genuinely reactive weather
 * notifications need the server-side engine in
 * `supabase/functions/notification-engine`, which is written but not deployed.
 */
import { selectOccasion, triggerSpecificity } from '@/features/duas/services/duaSelector';
import { moonAgeDays } from '@/features/duas/utils/moonPhase';
import type { DuaContext, DuaOccasion } from '@/features/duas/types/dua.types';
import type { WeatherSnapshot } from '@/features/weather/types/weather.types';
import { addLocalDays, type LocalDate } from '@/lib/datetime/localDate';
import { occurrenceOn, type TimeOfDay } from '@/lib/datetime/timeOfDay';

import { buildDedupeKey } from '../utils/reminderRules';
import type { PlannedReminder, ReminderPreferences } from '../types/reminder.types';

/**
 * How long before the stated sleep time the prompt arrives.
 *
 * Twenty minutes: late enough to belong to the night, early enough that it is
 * not competing with someone already closing their eyes.
 */
export const SLEEP_DUA_LEAD_MINUTES = 20;

/**
 * How soon a contextual dua fires once the condition is noticed.
 *
 * A couple of minutes rather than immediately, so it does not collide with the
 * app the user is holding right now — the point is to be found later.
 */
export const CONTEXTUAL_DUA_DELAY_MINUTES = 3;

/**
 * Minimum specificity for a contextual dua to be worth an interruption.
 *
 * Above the score of a bare time-of-day match, so "it is the evening" alone
 * never triggers one; rain, temperature, a weekday or the moon does.
 */
export const CONTEXTUAL_SPECIFICITY_FLOOR = 2;

export interface DuaPlanInput {
  preferences: ReminderPreferences;
  now: Date;
  timezone: string;
  today: LocalDate;
  horizonDays: number;
  weather?: WeatherSnapshot | null;
  /** Occasion ids shown recently, so the nightly prompt keeps moving. */
  recentlyShownIds: readonly string[];
  /** Injected for reproducible tests. */
  randomSeed?: number;
  /**
   * Occasions to choose from. Defaults to the filled-in ones, so nothing is
   * ever scheduled while the catalogue still holds only placeholders.
   */
  catalogue?: readonly DuaOccasion[];
}

function shiftMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

function contextAt(instant: Date, input: DuaPlanInput, sleepTime?: TimeOfDay): DuaContext {
  return {
    now: instant,
    timezone: input.timezone,
    // Weather is only attached for a moment close to now. Applying today's
    // reading to tomorrow night would be a guess presented as an observation.
    weather:
      input.weather && Math.abs(instant.getTime() - input.now.getTime()) < 6 * 3_600_000
        ? {
            condition: input.weather.condition,
            temperatureCelsius: input.weather.temperatureCelsius,
          }
        : undefined,
    moonAgeDays: moonAgeDays(instant),
    sleepTime,
    recentlyShownIds: input.recentlyShownIds,
  };
}

/** The nightly prompt, for each day inside the horizon. */
function planNightly(input: DuaPlanInput): PlannedReminder[] {
  const { preferences } = input;
  if (!preferences.sleepDuaEnabled) return [];

  const planned: PlannedReminder[] = [];

  for (let dayOffset = 0; dayOffset < input.horizonDays; dayOffset += 1) {
    const date = addLocalDays(input.today, dayOffset) as LocalDate;
    const sleepAt = occurrenceOn(preferences.sleepTime, date, input.timezone);
    const fireAt = shiftMinutes(sleepAt, -SLEEP_DUA_LEAD_MINUTES);

    if (fireAt.getTime() <= input.now.getTime()) continue;

    const occasion = selectOccasion(
      contextAt(fireAt, input, preferences.sleepTime),
      input.randomSeed,
      input.catalogue,
    );
    if (!occasion) continue;

    planned.push({
      category: 'daily_reminder',
      templateKey: `dua:${occasion.id}`,
      fireAt,
      dedupeKey: buildDedupeKey('daily_reminder', `${date}:sleep-dua`),
      duaOccasionId: occasion.id,
    });
  }

  return planned;
}

/** The contextual dua, for conditions true right now. */
function planContextual(input: DuaPlanInput): PlannedReminder[] {
  const { preferences } = input;
  if (!preferences.duaRemindersEnabled) return [];

  const fireAt = shiftMinutes(input.now, CONTEXTUAL_DUA_DELAY_MINUTES);
  const occasion = selectOccasion(
    contextAt(fireAt, input, preferences.sleepDuaEnabled ? preferences.sleepTime : undefined),
    input.randomSeed,
    input.catalogue,
  );

  if (!occasion) return [];

  // Without this floor the generic everyday duas — which match everything —
  // would fire every time the app opened.
  if (triggerSpecificity(occasion.trigger) < CONTEXTUAL_SPECIFICITY_FLOOR) return [];

  return [
    {
      category: 'daily_reminder',
      templateKey: `dua:${occasion.id}`,
      fireAt,
      dedupeKey: buildDedupeKey('daily_reminder', `${input.today}:dua:${occasion.id}`),
      duaOccasionId: occasion.id,
    },
  ];
}

export function planDuaReminders(input: DuaPlanInput): PlannedReminder[] {
  return [...planContextual(input), ...planNightly(input)];
}
