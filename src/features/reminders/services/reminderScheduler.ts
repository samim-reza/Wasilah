/**
 * Turns reminder decisions into scheduled OS notifications.
 *
 * The bridge between the two modules, and the only place they meet: it asks the
 * rules what should be sent, asks the template engine for the wording, and asks
 * the notification service to deliver it. It contains no policy of its own.
 *
 * Rescheduling strategy: everything previously scheduled by Wasilah is cancelled
 * and re-planned each time. Reconciling individual triggers against changed
 * preferences is far more error-prone than rebuilding a list that is never more
 * than a handful of entries long.
 */
import type { DailyPrayerTimes } from '@/features/prayer/types/prayer.types';
import type { WeatherSnapshot } from '@/features/weather/types/weather.types';
import { isNotableCondition } from '@/features/weather/services/weatherService';
import { renderTemplate } from '@/features/notifications/templates';
import {
  cancelAll,
  scheduleAt,
  type ScheduledNotification,
} from '@/features/notifications/services/localNotificationService';
import { occurrenceOn, type TimeOfDay } from '@/lib/datetime/timeOfDay';
import { addLocalDays, type LocalDate } from '@/lib/datetime/localDate';
import { logger } from '@/lib/monitoring/logger';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import {
  STREAK_AT_RISK_MINUTES,
  buildDedupeKey,
  isInQuietHours,
  resolveDailyReminderTime,
} from '../utils/reminderRules';
import { planPrayerReminders, type PrayerReminderRule } from './prayerReminderPlanner';
import type { PlannedReminder, ReminderContext } from '../types/reminder.types';

/**
 * Context beyond the core reminder state, supplied only when the relevant
 * optional feature is enabled. Both are absent for the great majority of users,
 * which is why they are not part of `ReminderContext`.
 */
export interface PersonalisationContext {
  /** Today's calculated prayer times; present only with location granted. */
  prayerTimes?: DailyPrayerTimes | null;
  prayerRules?: readonly PrayerReminderRule[];
  /** Current weather; only ever changes a reminder's wording. */
  weather?: WeatherSnapshot | null;
}

/**
 * How many days ahead to schedule.
 *
 * Two days, not a week: a reminder scheduled further out cannot account for
 * whether the user read in the meantime, so it would fire at someone who is
 * already up to date. Two days is enough to cover a device that stays offline
 * overnight while keeping every notification decision fresh.
 */
const SCHEDULE_HORIZON_DAYS = 2;

/**
 * Builds the schedule.
 *
 * Note what this does NOT do: it does not decide to suppress based on today's
 * progress. A notification for tomorrow cannot know whether tomorrow's reading
 * has happened — that check runs when the app next opens and reschedules, and
 * again in the foreground handler.
 */
export function planReminders(
  context: ReminderContext,
  learnedHour: number | null,
  personalisation: PersonalisationContext = {},
): PlannedReminder[] {
  const { preferences, timezone, today } = context;
  const planned: PlannedReminder[] = [];

  if (!context.permissionGranted) return planned;

  for (let dayOffset = 0; dayOffset < SCHEDULE_HORIZON_DAYS; dayOffset += 1) {
    const date = addLocalDays(today, dayOffset) as LocalDate;
    // Today's reminder is pointless if the day is already complete; later days
    // are always planned and re-evaluated when they arrive.
    const isToday = dayOffset === 0;

    if (preferences.dailyReminderEnabled && !(isToday && context.minimumCompletedToday)) {
      const time = resolveDailyReminderTime(preferences, learnedHour, true);
      const fireAt = occurrenceOn(time, date, timezone);

      if (fireAt.getTime() > context.now.getTime()) {
        planned.push({
          category: 'daily_reminder',
          templateKey: 'dailyReminder',
          fireAt,
          dedupeKey: buildDedupeKey('daily_reminder', date),
        });
      }
    }

    // The streak rescue sits close to midnight, and only for a user who has one.
    if (
      preferences.streakReminderEnabled &&
      context.currentStreak >= 1 &&
      !(isToday && context.minimumCompletedToday)
    ) {
      const streakTime = streakReminderTime(preferences);
      const fireAt = occurrenceOn(streakTime, date, timezone);

      if (fireAt.getTime() > context.now.getTime()) {
        planned.push({
          category: 'streak_reminder',
          templateKey: 'streakReminder',
          fireAt,
          dedupeKey: buildDedupeKey('streak_reminder', date),
        });
      }
    }
  }

  // Prayer-anchored reminders, for today only: tomorrow's prayer times depend on
  // tomorrow's date and are recalculated when the app next opens.
  if (
    preferences.prayerRemindersEnabled &&
    personalisation.prayerTimes &&
    personalisation.prayerRules?.length &&
    !context.minimumCompletedToday
  ) {
    planned.push(
      ...planPrayerReminders({
        rules: personalisation.prayerRules,
        times: personalisation.prayerTimes,
        preferences,
        date: today,
        timezone,
        now: context.now,
      }),
    );
  }

  // Enforce the per-day cap at planning time as well as at send time, so the
  // OS tray never fills with notifications that will be suppressed anyway.
  const capped = enforceDailyCap(planned, preferences.maxNotificationsPerDay, timezone);

  // Weather never adds a reminder. It only changes the wording of one that was
  // already going to be sent, and only when the condition is genuinely notable.
  return applyWeatherWording(capped, preferences, personalisation.weather);
}

/**
 * Places the streak reminder inside the at-risk window, pulled earlier if quiet
 * hours would otherwise swallow it.
 */
function streakReminderTime(preferences: {
  quietHoursEnabled: boolean;
  quietHoursStart: TimeOfDay;
  quietHoursEnd: TimeOfDay;
}): TimeOfDay {
  const minutesFromMidnight = 24 * 60 - STREAK_AT_RISK_MINUTES;
  const candidate: TimeOfDay = {
    hour: Math.floor(minutesFromMidnight / 60),
    minute: minutesFromMidnight % 60,
  };

  if (!isInQuietHours(candidate, preferences as never)) return candidate;

  // Quiet hours usually begin before this point, so fall back to just before
  // they start rather than skipping the reminder entirely.
  const { quietHoursStart } = preferences;
  const shifted =
    quietHoursStart.minute >= 15
      ? { hour: quietHoursStart.hour, minute: quietHoursStart.minute - 15 }
      : { hour: Math.max(0, quietHoursStart.hour - 1), minute: 45 };

  return shifted;
}

function enforceDailyCap(
  planned: PlannedReminder[],
  maxPerDay: number,
  timezone: string,
): PlannedReminder[] {
  const byDay = new Map<string, PlannedReminder[]>();

  for (const reminder of planned) {
    const day = reminder.dedupeKey.split(':')[1] ?? '';
    const bucket = byDay.get(day) ?? [];
    bucket.push(reminder);
    byDay.set(day, bucket);
  }

  const kept: PlannedReminder[] = [];
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
    kept.push(...bucket.slice(0, Math.max(0, maxPerDay)));
  }

  void timezone;
  return kept.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

/**
 * Re-labels a daily reminder as a weather-flavoured one.
 *
 * Deliberately a re-label rather than an extra notification: weather is a mood,
 * not a reason to interrupt someone. If the user has weather reminders off, or
 * the day is unremarkable, nothing changes.
 */
function applyWeatherWording(
  planned: PlannedReminder[],
  preferences: { weatherRemindersEnabled: boolean },
  weather: WeatherSnapshot | null | undefined,
): PlannedReminder[] {
  if (!preferences.weatherRemindersEnabled || !weather) return planned;
  if (!isNotableCondition(weather.condition)) return planned;

  return planned.map((reminder) =>
    reminder.category === 'daily_reminder'
      ? { ...reminder, templateKey: 'weatherReminder' }
      : reminder,
  );
}

/**
 * Cancels everything Wasilah had scheduled and queues the new plan.
 *
 * Identifiers are persisted so a later cancellation can be precise, and so the
 * settings screen can show when the next reminder will arrive.
 */
export interface ScheduleVariables {
  streakDays?: number;
  remainingVerses?: number;
  prayerName?: string;
  weatherCondition?: WeatherSnapshot['condition'];
}

export async function applySchedule(
  planned: PlannedReminder[],
  variables: ScheduleVariables = {},
): Promise<ScheduledNotification[]> {
  await cancelAll();

  const scheduled: ScheduledNotification[] = [];

  for (const reminder of planned) {
    const content = renderTemplate(reminder.templateKey, {
      ...variables,
      // A prayer reminder's dedupe key carries which prayer it belongs to.
      prayerName:
        reminder.category === 'prayer_reminder'
          ? reminder.dedupeKey.split(':').pop()
          : variables.prayerName,
    });

    if (!content) {
      logger.debug('reminders.templateDeclined', { templateKey: reminder.templateKey });
      continue;
    }

    const result = await scheduleAt(content, reminder.fireAt);
    if (result) scheduled.push(result);
  }

  await keyValueStore.set(
    storageKeys.scheduledReminderIds,
    scheduled.map((entry) => ({
      identifier: entry.identifier,
      category: entry.category,
      scheduledFor: entry.scheduledFor.toISOString(),
    })),
  );

  logger.info('reminders.rescheduled', { count: scheduled.length });
  return scheduled;
}

export interface StoredScheduleEntry {
  identifier: string;
  category: string;
  scheduledFor: string;
}

export async function getStoredSchedule(): Promise<StoredScheduleEntry[]> {
  return (await keyValueStore.get<StoredScheduleEntry[]>(storageKeys.scheduledReminderIds)) ?? [];
}

/** The next reminder, for the "next reminder at…" line in settings. */
export async function getNextScheduledReminder(): Promise<StoredScheduleEntry | null> {
  const entries = await getStoredSchedule();
  const upcoming = entries
    .filter((entry) => new Date(entry.scheduledFor).getTime() > Date.now())
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  return upcoming[0] ?? null;
}

export async function clearSchedule(): Promise<void> {
  await cancelAll();
  await keyValueStore.remove(storageKeys.scheduledReminderIds);
}
