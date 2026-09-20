/**
 * The single entry point to `expo-notifications`.
 *
 * WHY THIS EXISTS — importing `expo-notifications` anywhere at module scope
 * crashes the app in Expo Go on Android. Its barrel unconditionally re-exports
 * `DevicePushTokenAutoRegistration.fx`, which registers a push-token listener
 * while the module is evaluating; that listener calls `warnOfExpoGoPushUsage`,
 * which *throws* on Android since SDK 53. The crash therefore happens on import
 * — before any notification code runs, and regardless of whether the app only
 * wanted local notifications.
 *
 * So the module is loaded lazily and only where it can work. Two things follow:
 *
 *   1. Notifications become an optional capability the app asks for, rather
 *      than a hard dependency that can take the whole process down.
 *   2. `expo-notifications` leaves the startup import graph entirely, which is
 *      a meaningful cold-start saving for a module most sessions never touch.
 *
 * Everything else in the app — reading, streaks, bookmarks, audio, prayer
 * times — is unaffected when notifications are unavailable.
 */
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { logger } from '@/lib/monitoring/logger';

/** Type-only import: erased at build time, so it cannot trigger the side effect. */
import type * as ExpoNotifications from 'expo-notifications';

export type NotificationsModule = typeof ExpoNotifications;

/** Why notifications are unavailable, when they are. */
export type NotificationsUnavailableReason = 'expo_go_android' | 'web' | 'load_failed';

export interface NotificationsAvailability {
  available: boolean;
  reason?: NotificationsUnavailableReason;
}

/**
 * Can this runtime use notifications at all?
 *
 * Expo Go on Android cannot — not even for local notifications, because the
 * crash happens at import. iOS Expo Go only warns, so local notifications there
 * still work.
 *
 * The web cannot either. The module imports cleanly there, which is the trap:
 * it is each METHOD that throws, one at a time and asynchronously, so the
 * failure surfaces as unhandled promise rejections in the console rather than
 * as a missing feature. `getLastNotificationResponse` rejecting during startup
 * was doing exactly that. Web users get email reminders instead, which is why
 * refusing here costs them nothing.
 */
export function getNotificationsAvailability(): NotificationsAvailability {
  if (Platform.OS === 'web') {
    return { available: false, reason: 'web' };
  }
  if (isRunningInExpoGo() && Platform.OS === 'android') {
    return { available: false, reason: 'expo_go_android' };
  }
  return { available: true };
}

export function areNotificationsAvailable(): boolean {
  return getNotificationsAvailability().available;
}

/** Cached so the dynamic import happens at most once per launch. */
let modulePromise: Promise<NotificationsModule | null> | null = null;

/**
 * Loads `expo-notifications`, or resolves null where it cannot be used.
 *
 * Callers must handle null rather than assuming a module — that null IS the
 * Expo Go case, and it is the normal path during development.
 */
export function loadNotifications(): Promise<NotificationsModule | null> {
  if (!areNotificationsAvailable()) return Promise.resolve(null);

  modulePromise ??= import('expo-notifications')
    .then((module) => module as NotificationsModule)
    .catch((error: unknown) => {
      // A stripped build or a missing native module: report and degrade rather
      // than letting an import failure crash a screen.
      logger.warn('notifications.moduleLoadFailed', { error });
      return null;
    });

  return modulePromise;
}

/**
 * Runs `callback` with the module when it is usable, otherwise returns
 * `fallback`. Keeps the null check out of every call site.
 */
export async function withNotifications<T>(
  callback: (notifications: NotificationsModule) => Promise<T> | T,
  fallback: T,
): Promise<T> {
  const notifications = await loadNotifications();
  if (!notifications) return fallback;

  try {
    return await callback(notifications);
  } catch (error) {
    logger.warn('notifications.callFailed', { error });
    return fallback;
  }
}
