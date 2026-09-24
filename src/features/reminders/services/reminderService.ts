/**
 * Reminder preference persistence and context assembly.
 *
 * Converts between the database row shape and the domain shape the rules use,
 * so `reminderRules` never sees a `time` string or a snake_case column.
 */
import { formatTimeOfDay, parseTimeOfDay, type TimeOfDay } from '@/lib/datetime/timeOfDay';
import { logger } from '@/lib/monitoring/logger';
import { isRecord } from '@/lib/storage/guards';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { supabase } from '@/lib/supabase/client';
import type { ReminderPreferencesRow } from '@/lib/supabase/database.types';
import { fromPostgrestError } from '@/lib/supabase/errors';

import type { NotificationRecord, ReminderPreferences } from '../types/reminder.types';

/** Used before a profile loads and for guest mode, where there is no row. */
export const defaultReminderPreferences: ReminderPreferences = {
  dailyReminderEnabled: true,
  dailyReminderTime: { hour: 20, minute: 0 },
  streakReminderEnabled: true,
  goalReminderEnabled: false,
  todaysAyahEnabled: true,
  prayerRemindersEnabled: false,
  weatherRemindersEnabled: false,
  // On by default now that the catalogue has its words; see the migration
  // of the same name for the server-side default.
  duaRemindersEnabled: true,
  sleepDuaEnabled: false,
  sleepTime: { hour: 23, minute: 0 },
  quietHoursEnabled: true,
  quietHoursStart: { hour: 22, minute: 30 },
  quietHoursEnd: { hour: 7, minute: 0 },
  maxNotificationsPerDay: 10,
  minMinutesBetweenNotifications: 180,
  adaptiveFrequencyEnabled: true,
};

/** Falls back to the default when a stored time is unparseable. */
function timeOrDefault(value: string, fallback: TimeOfDay): TimeOfDay {
  return parseTimeOfDay(value) ?? fallback;
}

export function toReminderPreferences(row: ReminderPreferencesRow): ReminderPreferences {
  return {
    dailyReminderEnabled: row.daily_reminder_enabled,
    dailyReminderTime: timeOrDefault(
      row.daily_reminder_time,
      defaultReminderPreferences.dailyReminderTime,
    ),
    streakReminderEnabled: row.streak_reminder_enabled,
    goalReminderEnabled: row.goal_reminder_enabled,
    todaysAyahEnabled: row.todays_ayah_enabled,
    prayerRemindersEnabled: row.prayer_reminders_enabled,
    weatherRemindersEnabled: row.weather_reminders_enabled,
    duaRemindersEnabled: row.dua_reminders_enabled,
    sleepDuaEnabled: row.sleep_dua_enabled,
    sleepTime: timeOrDefault(row.sleep_time, defaultReminderPreferences.sleepTime),
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: timeOrDefault(
      row.quiet_hours_start,
      defaultReminderPreferences.quietHoursStart,
    ),
    quietHoursEnd: timeOrDefault(row.quiet_hours_end, defaultReminderPreferences.quietHoursEnd),
    maxNotificationsPerDay: row.max_notifications_per_day,
    minMinutesBetweenNotifications: row.min_minutes_between_notifications,
    adaptiveFrequencyEnabled: row.adaptive_frequency_enabled,
  };
}

/**
 * Reads the device's copy of the preferences.
 *
 * Merged over the defaults rather than trusted wholesale, so a value written
 * by an older build that lacked today's fields still loads.
 */
export async function loadLocalReminderPreferences(): Promise<ReminderPreferences> {
  const stored = await keyValueStore.get<Partial<ReminderPreferences>>(
    storageKeys.reminderPreferences,
    isRecord,
  );
  if (!stored) return defaultReminderPreferences;
  return { ...defaultReminderPreferences, ...stored };
}

export async function saveLocalReminderPreferences(
  preferences: ReminderPreferences,
): Promise<void> {
  await keyValueStore.set(storageKeys.reminderPreferences, preferences);
}

export async function fetchReminderPreferences(userId: string): Promise<ReminderPreferences> {
  const { data, error } = await supabase
    .from('reminder_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw fromPostgrestError(error, { userId });
  if (!data) return defaultReminderPreferences;

  return toReminderPreferences(data);
}

export type ReminderPreferenceUpdate = Partial<ReminderPreferences>;

export async function updateReminderPreferences(
  userId: string,
  update: ReminderPreferenceUpdate,
): Promise<void> {
  const row: Partial<ReminderPreferencesRow> = {};

  if (update.dailyReminderEnabled !== undefined)
    row.daily_reminder_enabled = update.dailyReminderEnabled;
  if (update.dailyReminderTime) row.daily_reminder_time = formatTimeOfDay(update.dailyReminderTime);
  if (update.streakReminderEnabled !== undefined)
    row.streak_reminder_enabled = update.streakReminderEnabled;
  if (update.goalReminderEnabled !== undefined)
    row.goal_reminder_enabled = update.goalReminderEnabled;
  if (update.todaysAyahEnabled !== undefined) row.todays_ayah_enabled = update.todaysAyahEnabled;
  if (update.prayerRemindersEnabled !== undefined)
    row.prayer_reminders_enabled = update.prayerRemindersEnabled;
  if (update.weatherRemindersEnabled !== undefined)
    row.weather_reminders_enabled = update.weatherRemindersEnabled;
  if (update.duaRemindersEnabled !== undefined)
    row.dua_reminders_enabled = update.duaRemindersEnabled;
  if (update.sleepDuaEnabled !== undefined) row.sleep_dua_enabled = update.sleepDuaEnabled;
  if (update.sleepTime) row.sleep_time = formatTimeOfDay(update.sleepTime);
  if (update.quietHoursEnabled !== undefined) row.quiet_hours_enabled = update.quietHoursEnabled;
  if (update.quietHoursStart) row.quiet_hours_start = formatTimeOfDay(update.quietHoursStart);
  if (update.quietHoursEnd) row.quiet_hours_end = formatTimeOfDay(update.quietHoursEnd);
  if (update.maxNotificationsPerDay !== undefined)
    row.max_notifications_per_day = update.maxNotificationsPerDay;
  if (update.minMinutesBetweenNotifications !== undefined) {
    row.min_minutes_between_notifications = update.minMinutesBetweenNotifications;
  }
  if (update.adaptiveFrequencyEnabled !== undefined) {
    row.adaptive_frequency_enabled = update.adaptiveFrequencyEnabled;
  }

  const { error } = await supabase
    .from('reminder_preferences')
    .upsert({ user_id: userId, ...row }, { onConflict: 'user_id' });

  if (error) throw fromPostgrestError(error, { userId });
  logger.debug('reminders.preferencesUpdated', { fields: Object.keys(row) });
}

/**
 * Recent notification history, used by the anti-fatigue rules.
 *
 * Bounded to the last two weeks: older deliveries say nothing about whether the
 * user is engaged right now.
 */
export async function fetchNotificationHistory(
  userId: string,
  sinceDays = 14,
): Promise<NotificationRecord[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('notification_history')
    .select('category, sent_at, local_date, opened_at')
    .eq('user_id', userId)
    .gte('sent_at', since)
    .order('sent_at', { ascending: false })
    .limit(100);

  if (error) throw fromPostgrestError(error, { userId });

  return (data ?? []).map((row) => ({
    category: row.category,
    sentAt: new Date(row.sent_at),
    localDate: row.local_date,
    opened: row.opened_at !== null,
  }));
}
