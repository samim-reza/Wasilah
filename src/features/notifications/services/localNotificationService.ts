/**
 * Local notification scheduling.
 *
 * Local rather than push wherever possible: a daily reminder at 8pm needs no
 * server, keeps working with no connectivity, and never leaks a user's reading
 * schedule to a backend. Push is reserved for decisions that genuinely require
 * server state.
 *
 * All access is through `notificationsGateway`, so on a runtime where
 * notifications are unavailable these become no-ops rather than throwing.
 */
import { Platform } from 'react-native';

import { logger } from '@/lib/monitoring/logger';

import { categoryChannels } from '../types/notification.types';
import type { NotificationContent } from '../types/notification.types';
import { withNotifications } from './notificationsGateway';

export interface ScheduledNotification {
  identifier: string;
  category: string;
  /** When it will fire, for the settings screen's "next reminder" line. */
  scheduledFor: Date;
}

/**
 * Schedules a one-off notification at an absolute instant.
 *
 * A DATE trigger is used rather than a repeating daily trigger because the
 * reminder engine re-evaluates every day: whether to send at all depends on the
 * streak, the day's progress and recent notification history, none of which a
 * fixed recurring trigger can take into account.
 */
export async function scheduleAt(
  content: NotificationContent,
  fireAt: Date,
): Promise<ScheduledNotification | null> {
  // A trigger in the past fires immediately on some platforms, which would spam
  // the user on launch.
  if (fireAt.getTime() <= Date.now()) {
    logger.debug('notifications.skippedPastTrigger', { category: content.data.category });
    return null;
  }

  return withNotifications(async (notifications) => {
    const identifier = await notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: { ...content.data, scheduledFor: fireAt.toISOString() },
        sound: true,
        ...(Platform.OS === 'android'
          ? { channelId: categoryChannels[content.data.category] }
          : {}),
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });

    logger.debug('notifications.scheduled', {
      category: content.data.category,
      fireAt: fireAt.toISOString(),
    });

    return { identifier, category: content.data.category, scheduledFor: fireAt };
  }, null);
}

export async function cancel(identifier: string): Promise<void> {
  // Cancelling an already-fired notification is expected, not an error, so the
  // gateway's own swallow-and-log behaviour is the right one here.
  await withNotifications(
    (notifications) => notifications.cancelScheduledNotificationAsync(identifier),
    undefined,
  );
}

export async function cancelMany(identifiers: string[]): Promise<void> {
  await Promise.all(identifiers.map(cancel));
}

export async function cancelAll(): Promise<void> {
  await withNotifications(async (notifications) => {
    await notifications.cancelAllScheduledNotificationsAsync();
    logger.debug('notifications.allCancelled');
  }, undefined);
}

/** Everything currently queued with the OS, used to reconcile after a restart. */
export async function listScheduled(): Promise<unknown[]> {
  return withNotifications(
    (notifications) => notifications.getAllScheduledNotificationsAsync(),
    [],
  );
}
