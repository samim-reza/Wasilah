import type { LocalDate } from '@/lib/datetime/localDate';
import type { TimeOfDay } from '@/lib/datetime/timeOfDay';
import type { NotificationCategory } from '@/lib/supabase/database.types';

/** What the user has asked for. Mirrors `reminder_preferences`. */
export interface ReminderPreferences {
  dailyReminderEnabled: boolean;
  dailyReminderTime: TimeOfDay;
  streakReminderEnabled: boolean;
  goalReminderEnabled: boolean;
  todaysAyahEnabled: boolean;
  prayerRemindersEnabled: boolean;
  weatherRemindersEnabled: boolean;

  quietHoursEnabled: boolean;
  quietHoursStart: TimeOfDay;
  quietHoursEnd: TimeOfDay;

  maxNotificationsPerDay: number;
  minMinutesBetweenNotifications: number;
  adaptiveFrequencyEnabled: boolean;
}

/** One previously sent notification, as the rules need to see it. */
export interface NotificationRecord {
  category: NotificationCategory;
  sentAt: Date;
  localDate: LocalDate;
  opened: boolean;
}

/**
 * Everything the decision needs, gathered by the caller.
 *
 * Passed in rather than read from stores so the rules stay pure and every
 * branch is reachable from a test.
 */
export interface ReminderContext {
  now: Date;
  timezone: string;
  today: LocalDate;
  preferences: ReminderPreferences;

  /** True once the day's minimum has been met. */
  minimumCompletedToday: boolean;
  /** True once the fuller goal has been met. */
  goalCompletedToday: boolean;
  /** How much of the goal remains, in the goal's own unit. */
  remainingToGoal: number;

  currentStreak: number;
  /** Notifications already sent today, newest first. */
  todaysNotifications: readonly NotificationRecord[];
  /** Recent history used to detect disengagement. */
  recentNotifications: readonly NotificationRecord[];

  /** Whether the OS will actually deliver anything. */
  permissionGranted: boolean;
}

export type SuppressionReason =
  | 'permission_denied'
  | 'category_disabled'
  | 'already_completed'
  | 'quiet_hours'
  | 'daily_cap_reached'
  | 'cooldown_active'
  | 'duplicate_today'
  | 'adaptive_backoff'
  | 'nothing_to_say';

export interface ReminderDecision {
  shouldSend: boolean;
  category: NotificationCategory;
  templateKey: string;
  /** Present only when `shouldSend` is false. */
  reason?: SuppressionReason;
}

/** A reminder the scheduler should queue with the OS. */
export interface PlannedReminder {
  category: NotificationCategory;
  templateKey: string;
  fireAt: Date;
  /** Prevents the same reminder being queued twice for one day. */
  dedupeKey: string;
}
