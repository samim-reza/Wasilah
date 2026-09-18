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
