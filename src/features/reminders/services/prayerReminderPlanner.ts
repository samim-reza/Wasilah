/**
 * Turns prayer times into planned reminders.
 *
 * Lives in the reminders module, not the prayer module: `features/prayer`
 * answers only "when are the prayers today", and knows nothing about
 * notifications. This is the seam where a prayer time becomes a reminder.
 *
 * Nothing here implies religious significance. A prayer time is used purely as
 * a point in the user's day that they themselves chose to be reminded near.
 */
import { reminderTimeForPrayer } from '@/features/prayer/services/prayerTimeService';
import type { DailyPrayerTimes, PrayerName } from '@/features/prayer/types/prayer.types';
import type { LocalDate } from '@/lib/datetime/localDate';
import { timeOfDayAt } from '@/lib/datetime/timeOfDay';

import type { PlannedReminder, ReminderPreferences } from '../types/reminder.types';
import { buildDedupeKey, isInQuietHours } from '../utils/reminderRules';

export interface PrayerReminderRule {
  prayer: PrayerName;
  direction: 'before' | 'after';
  offsetMinutes: number;
  enabled: boolean;
}

export interface PrayerReminderPlanInput {
  rules: readonly PrayerReminderRule[];
  times: DailyPrayerTimes;
  preferences: ReminderPreferences;
  date: LocalDate;
  timezone: string;
  now: Date;
}

/**
 * Builds one planned reminder per enabled prayer rule.
 *
 * Reminders that fall in the past, or inside quiet hours, are dropped rather
 * than shifted: unlike the daily reminder, a prayer-anchored nudge means
 * nothing once it has been moved away from the prayer it was anchored to.
 */
export function planPrayerReminders(input: PrayerReminderPlanInput): PlannedReminder[] {
  const { rules, times, preferences, date, timezone, now } = input;

  if (!preferences.prayerRemindersEnabled) return [];

  const planned: PlannedReminder[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const fireAt = reminderTimeForPrayer(times, rule.prayer, rule.direction, rule.offsetMinutes);
    if (fireAt.getTime() <= now.getTime()) continue;

    if (isInQuietHours(timeOfDayAt(fireAt, timezone), preferences)) continue;

    planned.push({
      category: 'prayer_reminder',
      templateKey: 'prayerReminder',
      fireAt,
      // Keyed by prayer as well as date, so enabling two prayers produces two
      // distinct reminders rather than one overwriting the other.
      dedupeKey: `${buildDedupeKey('prayer_reminder', date)}:${rule.prayer}`,
    });
  }

  return planned;
}
