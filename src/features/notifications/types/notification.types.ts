import type { NotificationCategory } from '@/lib/supabase/database.types';

export type { NotificationCategory };

/** Android notification channels. Users can mute these individually in system settings. */
//
// The ids carry a version. Android fixes a channel's importance and vibration
// the first time it is created and ignores later changes, so making the
// channels vibrate meant new channels; the old ones simply fall silent.
export const notificationChannels = {
  dailyReminders: 'daily-reminders-v2',
  streak: 'streak-reminders-v2',
  prayer: 'prayer-reminders-v2',
} as const;

export type NotificationChannelId =
  (typeof notificationChannels)[keyof typeof notificationChannels];

/** Which channel a category is delivered on. */
export const categoryChannels: Record<NotificationCategory, NotificationChannelId> = {
  daily_reminder: notificationChannels.dailyReminders,
  goal_reminder: notificationChannels.dailyReminders,
  todays_ayah: notificationChannels.dailyReminders,
  weather_reminder: notificationChannels.dailyReminders,
  streak_reminder: notificationChannels.streak,
  prayer_reminder: notificationChannels.prayer,
  announcement: notificationChannels.dailyReminders,
};

/**
 * The data travelling with every notification.
 *
 * Kept small and non-sensitive: it is readable by the OS, appears in logs, and
 * on Android is visible to other apps holding notification-listener access.
 */
export interface NotificationData {
  category: NotificationCategory;
  /** Which template produced the copy, for attribution and analytics. */
  templateKey: string;
  /** In-app path to open, e.g. '/quran/2?ayah=255'. */
  route: string;
  /** The `notification_history` row, so an open can be recorded. */
  historyId?: string;
  /** ISO date the notification was scheduled for, to detect stale deliveries. */
  scheduledFor?: string;
}

export interface NotificationContent {
  title: string;
  body: string;
  data: NotificationData;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface NotificationPermissionState {
  status: PermissionStatus;
  /** False on iOS when the user chose "provisional"/quiet delivery. */
  canShowAlerts: boolean;
  /** True when the OS will not show the prompt again. */
  isBlocked: boolean;
}
