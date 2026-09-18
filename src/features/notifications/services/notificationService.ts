/**
 * Notification delivery: permissions, channels and the foreground handler.
 *
 * This module answers "HOW is a notification delivered". It never decides
 * whether one is warranted — that is the reminder engine's job
 * (`src/features/reminders`). Keeping the two apart is what stops scheduling
 * rules from leaking into UI code and vice versa.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/lib/i18n';
import { logger } from '@/lib/monitoring/logger';
import { getPalette } from '@/theme/palette';

import { notificationChannels } from '../types/notification.types';
import type { NotificationPermissionState, PermissionStatus } from '../types/notification.types';

/**
 * How a notification behaves while the app is open.
 *
 * Banners are suppressed in the foreground: the user is already reading, and a
 * "time to read" banner over the reader is exactly the kind of noise this app
 * is meant to avoid. The notification still lands in the tray.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function toPermissionState(
  permissions: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  const status = permissions.status as PermissionStatus;

  return {
    status,
    // On iOS a "provisional" grant delivers quietly with no banner.
    canShowAlerts:
      status === 'granted' && (Platform.OS !== 'ios' || permissions.ios?.allowsAlert !== false),
    // `canAskAgain === false` means the OS will ignore any further request, so
    // the UI must send the user to system settings instead of re-prompting.
    isBlocked: status === 'denied' && !permissions.canAskAgain,
  };
}

export async function getPermissionState(): Promise<NotificationPermissionState> {
  const permissions = await Notifications.getPermissionsAsync();
  return toPermissionState(permissions);
}

/**
 * Requests permission.
 *
 * Must only be called after the user has been told what the notifications are
 * for — the OS shows this prompt exactly once, and a denial is expensive to
 * recover from.
 */
export async function requestPermission(): Promise<NotificationPermissionState> {
  const existing = await Notifications.getPermissionsAsync();

  if (existing.status === 'granted') return toPermissionState(existing);
  if (!existing.canAskAgain) return toPermissionState(existing);

  const permissions = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  logger.info('notifications.permissionResult', { status: permissions.status });
  return toPermissionState(permissions);
}

/**
 * Creates the Android channels.
 *
 * Separate channels are not cosmetic: they are the only way an Android user can
 * mute streak nudges while keeping their daily reminder. A single channel would
 * force an all-or-nothing choice.
 */
export async function configureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const accent = getPalette('light').primary;

  await Notifications.setNotificationChannelAsync(notificationChannels.dailyReminders, {
    name: t('notifications.channelDailyReminders'),
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: accent,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync(notificationChannels.streak, {
    name: t('notifications.channelStreak'),
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: accent,
  });

  await Notifications.setNotificationChannelAsync(notificationChannels.prayer, {
    name: t('notifications.channelPrayer'),
    // Lower importance: prayer-adjacent nudges should never interrupt.
    importance: Notifications.AndroidImportance.LOW,
    lightColor: accent,
  });

  logger.debug('notifications.channelsConfigured');
}

/** Simulators cannot receive push messages; local notifications still work. */
export function canReceivePush(): boolean {
  return Device.isDevice;
}

export async function dismissAll(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
