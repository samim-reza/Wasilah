/**
 * Every persisted key in one namespace.
 *
 * Centralising them prevents silent collisions and makes it possible to clear
 * exactly the right set of keys on sign-out (see `clearUserScopedStorage`).
 */
const prefix = 'wasilah';

export const storageKeys = {
  themePreference: `${prefix}.theme.preference`,
  locale: `${prefix}.locale`,

  onboardingCompleted: `${prefix}.onboarding.completed`,

  /** Where the user last stopped reading, so "Continue" works before sync. */
  lastReadPosition: `${prefix}.reader.lastPosition`,

  /**
   * Bookmarks made before signing in. Its own key, not shared with anything:
   * this previously reused `lastReadPosition`, so saving a reading position
   * (an object) and listing guest bookmarks (an array) fought over one slot
   * and corrupted each other.
   */
  guestBookmarks: `${prefix}.bookmarks.guest`,
  readerPreferences: `${prefix}.reader.preferences`,

  /** Locally computed habit state; authoritative until the server confirms. */
  localStreak: `${prefix}.habit.streak`,
  localDailyProgress: `${prefix}.habit.dailyProgress`,

  /** Today's Ayah selection, keyed by local date to survive restarts. */
  dailyAyah: `${prefix}.dailyAyah`,

  /**
   * Reminder preferences held on the device.
   *
   * Written for every user, signed in or not. Guest mode has no row to save
   * to, so without this a guest's settings vanished the moment the screen
   * unmounted; and for a signed-in user it means a failed network write no
   * longer silently discards the change.
   */
  /**
   * Tasbeeh counters held on the device.
   *
   * Written for every user. A guest has no row to sync to, and for a
   * signed-in user this is what lets a press register instantly and survive
   * being offline — a counter that pauses for a round trip is unusable.
   */
  tasbeeh: `${prefix}.tasbeeh`,
  reminderPreferences: `${prefix}.reminders.preferences`,
  notificationPermissionAsked: `${prefix}.notifications.permissionAsked`,
  scheduledReminderIds: `${prefix}.notifications.scheduledIds`,
  notificationLog: `${prefix}.notifications.log`,

  featureFlagOverrides: `${prefix}.featureFlags`,

  /** TanStack Query disk cache, so a cold start can paint real content. */
  queryCache: `${prefix}.queryCache`,
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];

/**
 * Keys holding data that belongs to a signed-in user. Device preferences
 * (theme, locale, font size) deliberately survive sign-out.
 */
export const userScopedStorageKeys: StorageKey[] = [
  storageKeys.lastReadPosition,
  storageKeys.guestBookmarks,
  storageKeys.localStreak,
  storageKeys.localDailyProgress,
  storageKeys.dailyAyah,
  storageKeys.scheduledReminderIds,
  storageKeys.notificationLog,
  storageKeys.queryCache,
];
