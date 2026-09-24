/**
 * Notification delivery: permissions, channels and the foreground handler.
 *
 * This module answers "HOW is a notification delivered". It never decides
 * whether one is warranted — that is the reminder engine's job
 * (`src/features/reminders`). Keeping the two apart is what stops scheduling
 * rules from leaking into UI code and vice versa.
 *
 * Every call goes through `notificationsGateway`, so this works unchanged on a
 * runtime where notifications are unavailable (Expo Go on Android): the
 * functions resolve to sensible "nothing is possible" values instead of
 * throwing.
 */
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { t } from '@/lib/i18n';
import { logger } from '@/lib/monitoring/logger';
import { getPalette } from '@/theme/palette';

import { notificationChannels } from '../types/notification.types';
import type { NotificationPermissionState, PermissionStatus } from '../types/notification.types';
import {
  areNotificationsAvailable,
  loadNotifications,
  withNotifications,
  type NotificationsModule,
} from './notificationsGateway';

/** Shape used when the module cannot be loaded at all. */
const unavailablePermissionState: NotificationPermissionState = {
  status: 'denied',
  canShowAlerts: false,
  // Not "blocked": the OS never refused, the runtime simply cannot ask.
  isBlocked: false,
};

function toPermissionState(
  permissions: Awaited<ReturnType<NotificationsModule['getPermissionsAsync']>>,
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

/**
 * Installs the foreground presentation rule.
 *
 * Banners are suppressed while the app is open: the user is already reading,
 * and a "time to read" banner over the reader is exactly the kind of noise this
 * app exists to avoid. The notification still lands in the tray.
 *
 * Called once at startup. Previously this ran at module scope, which is what
 * made merely importing this file fatal in Expo Go.
 */
export async function configureForegroundBehaviour(): Promise<void> {
  const notifications = await loadNotifications();
  if (!notifications) return;

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getPermissionState(): Promise<NotificationPermissionState> {
  return withNotifications(
    async (notifications) => toPermissionState(await notifications.getPermissionsAsync()),
    unavailablePermissionState,
  );
}

/**
 * Requests permission.
 *
 * Must only be called after the user has been told what the notifications are
 * for — the OS shows this prompt exactly once, and a denial is expensive to
 * recover from.
 */
export async function requestPermission(): Promise<NotificationPermissionState> {
  return withNotifications(async (notifications) => {
    const existing = await notifications.getPermissionsAsync();

    if (existing.status === 'granted') return toPermissionState(existing);
    if (!existing.canAskAgain) return toPermissionState(existing);

    const permissions = await notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });

    logger.info('notifications.permissionResult', { status: permissions.status });
    return toPermissionState(permissions);
  }, unavailablePermissionState);
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

  await withNotifications(async (notifications) => {
    const accent = getPalette('light').primary;

    // HIGH importance is what makes a notification heads-up and felt: it
    // buzzes and shows over whatever is open. The pattern is two firm pulses.
    // A rain dua or a prayer that arrives silently is a notification nobody
    // saw. The user can still quieten a channel in system settings.
    const felt = {
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      enableVibrate: true,
      lightColor: accent,
      sound: 'default',
    };

    await notifications.setNotificationChannelAsync(notificationChannels.dailyReminders, {
      name: t('notifications.channelDailyReminders'),
      ...felt,
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await notifications.setNotificationChannelAsync(notificationChannels.streak, {
      name: t('notifications.channelStreak'),
      ...felt,
    });

    await notifications.setNotificationChannelAsync(notificationChannels.prayer, {
      name: t('notifications.channelPrayer'),
      ...felt,
    });

    logger.debug('notifications.channelsConfigured');
  }, undefined);
}

/**
 * Can this device receive PUSH specifically?
 *
 * Distinct from `areNotificationsAvailable`: a simulator supports local
 * notifications but can never receive a push message.
 */
export function canReceivePush(): boolean {
  return Device.isDevice && areNotificationsAvailable();
}

export async function dismissAll(): Promise<void> {
  await withNotifications(
    (notifications) => notifications.dismissAllNotificationsAsync(),
    undefined,
  );
}

export { areNotificationsAvailable, getNotificationsAvailability } from './notificationsGateway';
