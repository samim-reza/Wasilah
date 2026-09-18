/**
 * Reminder decision rules.
 *
 * The question this module answers is "SHOULD the user be reminded?" — never
 * "how is a notification delivered?". Delivery lives in
 * `src/features/notifications`.
 *
 * The governing principle is that a reminder must earn its place. A user who
 * has already read today, who is asleep, or who has ignored the last several
 * nudges should hear nothing. Every rule below exists to remove a notification,
 * not to add one.
 *
 * Pure functions throughout: `now` and all state arrive as arguments.
 */
import { isWithinWindow, timeOfDayAt, type TimeOfDay } from '@/lib/datetime/timeOfDay';
import type { NotificationCategory } from '@/lib/supabase/database.types';

import type {
  NotificationRecord,
  PlannedReminder,
  ReminderContext,
  ReminderDecision,
  ReminderPreferences,
  SuppressionReason,
} from '../types/reminder.types';

/**
 * How close to local midnight a streak is treated as at risk.
 *
 * Three hours: late enough that the user has genuinely run out of day, early
 * enough that they can still act without it being a 23:55 panic.
 */
export const STREAK_AT_RISK_MINUTES = 180;

/** Recent notifications inspected when deciding whether to back off. */
export const ADAPTIVE_WINDOW_SIZE = 5;

/** Consecutive ignored notifications that trigger reduced frequency. */
export const ADAPTIVE_IGNORE_THRESHOLD = 4;

function isCategoryEnabled(
  category: NotificationCategory,
  preferences: ReminderPreferences,
): boolean {
  switch (category) {
    case 'daily_reminder':
      return preferences.dailyReminderEnabled;
    case 'streak_reminder':
      return preferences.streakReminderEnabled;
    case 'goal_reminder':
      return preferences.goalReminderEnabled;
    case 'todays_ayah':
      return preferences.todaysAyahEnabled;
    case 'prayer_reminder':
      return preferences.prayerRemindersEnabled;
    case 'weather_reminder':
      return preferences.weatherRemindersEnabled;
    case 'announcement':
      return true;
  }
}

export function isInQuietHours(time: TimeOfDay, preferences: ReminderPreferences): boolean {
  if (!preferences.quietHoursEnabled) return false;
  return isWithinWindow(time, preferences.quietHoursStart, preferences.quietHoursEnd);
}

/** Minutes since the most recent notification, or Infinity if there was none. */
export function minutesSinceLastNotification(
  notifications: readonly NotificationRecord[],
  now: Date,
): number {
  if (notifications.length === 0) return Number.POSITIVE_INFINITY;

  const mostRecent = notifications.reduce((latest, record) =>
    record.sentAt > latest.sentAt ? record : latest,
  );

  return (now.getTime() - mostRecent.sentAt.getTime()) / 60_000;
}

/**
 * Has the user stopped engaging?
 *
 * Looks at the last few notifications and backs off if none were opened. This
 * is the difference between a helpful app and a nagging one: if the reminders
 * are not working, sending more of them is the wrong response.
 */
export function shouldBackOff(
  recentNotifications: readonly NotificationRecord[],
  preferences: ReminderPreferences,
): boolean {
  if (!preferences.adaptiveFrequencyEnabled) return false;
  if (recentNotifications.length < ADAPTIVE_IGNORE_THRESHOLD) return false;

  const window = [...recentNotifications]
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
    .slice(0, ADAPTIVE_WINDOW_SIZE);

  const ignored = window.filter((record) => !record.opened).length;
  return ignored >= ADAPTIVE_IGNORE_THRESHOLD;
}

/**
 * The checks that apply to every category, in order of how decisively they rule
 * a notification out.
 */
function findGlobalSuppression(
  context: ReminderContext,
  category: NotificationCategory,
): SuppressionReason | null {
  const { preferences, now, timezone, todaysNotifications, recentNotifications } = context;

  if (!context.permissionGranted) return 'permission_denied';
  if (!isCategoryEnabled(category, preferences)) return 'category_disabled';

  if (isInQuietHours(timeOfDayAt(now, timezone), preferences)) return 'quiet_hours';

  if (todaysNotifications.length >= preferences.maxNotificationsPerDay) {
    return 'daily_cap_reached';
  }

  if (
    minutesSinceLastNotification(todaysNotifications, now) <
    preferences.minMinutesBetweenNotifications
  ) {
    return 'cooldown_active';
  }

  // One of each category per day, maximum. Two "your streak is waiting"
  // messages in one evening is the fastest way to lose a user.
  if (todaysNotifications.some((record) => record.category === category)) {
    return 'duplicate_today';
  }

  if (shouldBackOff(recentNotifications, preferences)) return 'adaptive_backoff';

  return null;
}

function decision(
  category: NotificationCategory,
  templateKey: string,
  reason: SuppressionReason | null,
): ReminderDecision {
  return reason
    ? { shouldSend: false, category, templateKey, reason }
    : { shouldSend: true, category, templateKey };
}

/**
 * The plain daily reminder.
 *
 * Suppressed the moment today's minimum is met — the single most important
 * rule in the system. Telling someone to read when they already have is the
 * clearest possible signal that an app is not paying attention.
 */
export function evaluateDailyReminder(context: ReminderContext): ReminderDecision {
  const global = findGlobalSuppression(context, 'daily_reminder');
  if (global) return decision('daily_reminder', 'dailyReminder', global);

  if (context.minimumCompletedToday) {
    return decision('daily_reminder', 'dailyReminder', 'already_completed');
  }

  return decision('daily_reminder', 'dailyReminder', null);
}

/**
 * The streak rescue.
 *
 * Only fires for a user who actually has a streak, has not read today, and is
 * running out of day. Outside that narrow window it says nothing useful.
 */
export function evaluateStreakReminder(context: ReminderContext): ReminderDecision {
  const global = findGlobalSuppression(context, 'streak_reminder');
  if (global) return decision('streak_reminder', 'streakReminder', global);

  if (context.minimumCompletedToday) {
    return decision('streak_reminder', 'streakReminder', 'already_completed');
  }
  if (context.currentStreak < 1) {
    return decision('streak_reminder', 'streakReminder', 'nothing_to_say');
  }

  const minutesLeft = minutesUntilLocalMidnight(context.now, context.timezone);
  if (minutesLeft > STREAK_AT_RISK_MINUTES) {
    return decision('streak_reminder', 'streakReminder', 'nothing_to_say');
  }

  return decision('streak_reminder', 'streakReminder', null);
}

/**
 * The "almost there" nudge.
 *
 * Requires that the user has already started today — it encourages finishing,
 * never starting. A user who has not opened the app today gets the daily
 * reminder instead, not this.
 */
export function evaluateGoalReminder(context: ReminderContext): ReminderDecision {
  const global = findGlobalSuppression(context, 'goal_reminder');
  if (global) return decision('goal_reminder', 'goalReminder', global);

  if (context.goalCompletedToday) {
    return decision('goal_reminder', 'goalReminder', 'already_completed');
  }
  if (!context.minimumCompletedToday || context.remainingToGoal <= 0) {
    return decision('goal_reminder', 'goalReminder', 'nothing_to_say');
  }

  return decision('goal_reminder', 'goalReminder', null);
}

export function evaluatePrayerReminder(context: ReminderContext): ReminderDecision {
  const global = findGlobalSuppression(context, 'prayer_reminder');
  if (global) return decision('prayer_reminder', 'prayerReminder', global);

  if (context.minimumCompletedToday) {
    return decision('prayer_reminder', 'prayerReminder', 'already_completed');
  }
  return decision('prayer_reminder', 'prayerReminder', null);
}

export function evaluateWeatherReminder(context: ReminderContext): ReminderDecision {
  const global = findGlobalSuppression(context, 'weather_reminder');
  if (global) return decision('weather_reminder', 'weatherReminder', global);

  if (context.minimumCompletedToday) {
    return decision('weather_reminder', 'weatherReminder', 'already_completed');
  }
  return decision('weather_reminder', 'weatherReminder', null);
}

/** Minutes remaining in the user's local day. */
export function minutesUntilLocalMidnight(now: Date, timezone: string): number {
  const { hour, minute } = timeOfDayAt(now, timezone);
  return 24 * 60 - (hour * 60 + minute);
}

/**
 * Learns the user's habitual reading time.
 *
 * Given when they have finished reading on past days, returns the most common
 * hour so a reminder can be scheduled shortly before it. Requires a real
 * sample: with too little data the "learned" time is noise, and moving someone's
 * reminder based on noise is worse than leaving it where they set it.
 */
export const MIN_SAMPLES_FOR_LEARNED_TIME = 5;

export function inferPreferredHour(readingTimes: readonly Date[], timezone: string): number | null {
  if (readingTimes.length < MIN_SAMPLES_FOR_LEARNED_TIME) return null;

  const histogram = new Map<number, number>();
  for (const time of readingTimes) {
    const { hour } = timeOfDayAt(time, timezone);
    histogram.set(hour, (histogram.get(hour) ?? 0) + 1);
  }

  let bestHour: number | null = null;
  let bestCount = 0;

  for (const [hour, count] of histogram) {
    if (count > bestCount) {
      bestHour = hour;
      bestCount = count;
    }
  }

  // A mode that is barely more common than chance is not a habit.
  const isMeaningful = bestCount >= Math.ceil(readingTimes.length * 0.3);
  return isMeaningful ? bestHour : null;
}

/**
 * Chooses when the daily reminder should fire.
 *
 * The user's explicit choice always wins. A learned time is only used when they
 * never set one, and the result is nudged out of quiet hours rather than being
 * cancelled outright.
 */
export function resolveDailyReminderTime(
  preferences: ReminderPreferences,
  learnedHour: number | null,
  userSetTimeExplicitly: boolean,
): TimeOfDay {
  const base: TimeOfDay =
    userSetTimeExplicitly || learnedHour === null
      ? preferences.dailyReminderTime
      : { hour: learnedHour, minute: 0 };

  if (!isInQuietHours(base, preferences)) return base;
  return preferences.quietHoursEnd;
}

/** Stable per day and category, so the same reminder is never queued twice. */
export function buildDedupeKey(category: NotificationCategory, localDate: string): string {
  return `${category}:${localDate}`;
}

export function hasAlreadyPlanned(planned: readonly PlannedReminder[], dedupeKey: string): boolean {
  return planned.some((reminder) => reminder.dedupeKey === dedupeKey);
}
