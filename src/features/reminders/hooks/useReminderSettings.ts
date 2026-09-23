/**
 * Reminder settings state.
 *
 * Every change reschedules. Saving a new reminder time without cancelling the
 * old notification would leave the user with two, which is precisely the kind
 * of accumulation this app is built to avoid.
 */
import { useCallback, useEffect, useState } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { useNotificationPermissions } from '@/features/notifications/hooks/useNotificationPermissions';
import { fetchPrayerRules } from '@/features/prayer/services/prayerRuleService';
import { usePrayerTimes } from '@/features/prayer/hooks/usePrayerTimes';
import { fetchWeather } from '@/features/weather/services/weatherService';
import type { WeatherSnapshot } from '@/features/weather/types/weather.types';
import type { PrayerReminderRule } from '../services/prayerReminderPlanner';
import { useLocalDate } from '@/lib/datetime/useLocalDate';
import { logger } from '@/lib/monitoring/logger';
import { trackEvent } from '@/lib/analytics/analytics';

import {
  applySchedule,
  clearSchedule,
  getNextScheduledReminder,
  planReminders,
  type StoredScheduleEntry,
} from '../services/reminderScheduler';
import {
  defaultReminderPreferences,
  fetchNotificationHistory,
  fetchReminderPreferences,
  loadLocalReminderPreferences,
  saveLocalReminderPreferences,
  updateReminderPreferences,
  type ReminderPreferenceUpdate,
} from '../services/reminderService';
import type { ReminderPreferences } from '../types/reminder.types';
import { useHabitState } from '@/features/streak/hooks/useHabitState';

export interface UseReminderSettingsResult {
  preferences: ReminderPreferences;
  isLoading: boolean;
  permissionGranted: boolean;
  permissionBlocked: boolean;
  /** False when the runtime cannot show notifications at all. */
  notificationsSupported: boolean;
  /** True when a development build is what would fix it. */
  needsDevelopmentBuild: boolean;
  nextReminder: StoredScheduleEntry | null;
  update: (patch: ReminderPreferenceUpdate) => Promise<void>;
  requestPermission: () => Promise<boolean>;
  openSystemSettings: () => void;
  /** Re-plans notifications from the current state. */
  reschedule: () => Promise<void>;
}

export function useReminderSettings(): UseReminderSettingsResult {
  const userId = useUserId();
  const { today, timezone } = useLocalDate();
  const permissions = useNotificationPermissions();
  const habit = useHabitState();
  const prayer = usePrayerTimes();

  const [preferences, setPreferences] = useState<ReminderPreferences>(defaultReminderPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [nextReminder, setNextReminder] = useState<StoredScheduleEntry | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // The device copy always loads, signed in or not. It is the only store a
      // guest has, and for a signed-in user it means the screen is correct
      // immediately rather than after a round-trip.
      const local = await loadLocalReminderPreferences();
      if (!cancelled) setPreferences(local);

      if (userId) {
        try {
          const loaded = await fetchReminderPreferences(userId);
          if (!cancelled) {
            setPreferences(loaded);
            // Keep the device copy in step, so a later offline start shows
            // what the account actually holds.
            await saveLocalReminderPreferences(loaded);
          }
        } catch (error) {
          logger.warn('reminders.loadFailed', { error });
        }
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const reschedule = useCallback(async () => {
    if (!permissions.canShowAlerts) {
      await clearSchedule();
      setNextReminder(null);
      return;
    }

    const history = userId ? await fetchNotificationHistory(userId).catch(() => []) : [];
    const now = new Date();

    // Both are optional features that most users never enable, so neither is
    // fetched unless it is switched on and its prerequisite (location) is met.
    const prayerRules: PrayerReminderRule[] =
      userId && preferences.prayerRemindersEnabled
        ? await fetchPrayerRules(userId).catch(() => [])
        : [];

    // Weather is needed by TWO features: the weather-flavoured daily reminder
    // and the contextual duas (rain, heat, cold). It used to be fetched only
    // for the first, so a user who enabled dua reminders without weather
    // reminders could never receive the rain dua — the planner saw no weather
    // and, correctly, refused to guess.
    const weather: WeatherSnapshot | null =
      (preferences.weatherRemindersEnabled || preferences.duaRemindersEnabled) &&
      prayer.settings.coordinates
        ? await fetchWeather(prayer.settings.coordinates).catch(() => null)
        : null;

    const planned = planReminders(
      {
        now,
        timezone,
        today,
        preferences,
        minimumCompletedToday: habit.minimumMet,
        goalCompletedToday: habit.goalMet,
        remainingToGoal: habit.remaining,
        currentStreak: habit.currentStreak,
        todaysNotifications: history.filter((record) => record.localDate === today),
        recentNotifications: history,
        permissionGranted: permissions.canShowAlerts,
      },
      null,
      { prayerTimes: prayer.times, prayerRules, weather },
    );

    await applySchedule(planned, {
      streakDays: habit.currentStreak,
      remainingVerses: habit.remaining,
      weatherCondition: weather?.condition,
    });
    setNextReminder(await getNextScheduledReminder());
  }, [
    permissions.canShowAlerts,
    userId,
    timezone,
    today,
    preferences,
    habit.minimumMet,
    habit.goalMet,
    habit.remaining,
    habit.currentStreak,
    prayer.times,
    prayer.settings.coordinates,
  ]);

  // Reschedule whenever anything a plan depends on changes: preferences,
  // permission, or today's completion state.
  useEffect(() => {
    if (isLoading) return;
    // Rescheduling awaits notification history and the OS scheduler before
    // any setState, so it cannot cascade within this render pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reschedule();
  }, [isLoading, reschedule]);

  const update = useCallback(
    async (patch: ReminderPreferenceUpdate) => {
      const next = { ...preferences, ...patch };
      setPreferences(next);

      // Written first and unconditionally. This is what makes a change stick
      // for a guest, and what stops a failed network write from throwing the
      // change away for everyone else.
      await saveLocalReminderPreferences(next);

      if (patch.dailyReminderTime) trackEvent('reminder_time_changed', {});

      if (userId) {
        try {
          await updateReminderPreferences(userId, patch);
        } catch (error) {
          // The device copy above still holds the change, so the user does not
          // lose it; the account copy catches up on the next successful write.
          logger.warn('reminders.updateFailed', { error });
        }
      }
    },
    [preferences, userId],
  );

  return {
    preferences,
    isLoading: isLoading || permissions.isLoading,
    permissionGranted: permissions.canShowAlerts,
    permissionBlocked: permissions.isBlocked,
    notificationsSupported: permissions.isSupported,
    needsDevelopmentBuild: permissions.needsDevelopmentBuild,
    nextReminder,
    update,
    requestPermission: permissions.request,
    openSystemSettings: permissions.openSystemSettings,
    reschedule,
  };
}
