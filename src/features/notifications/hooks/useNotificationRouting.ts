/**
 * Turns a notification tap into a navigation.
 *
 * Mounted once, inside the navigator. Two delivery paths have to be handled and
 * they are easy to confuse:
 *   • the app was already running — `addNotificationResponseReceivedListener`
 *   • the app was launched BY the tap — `getLastNotificationResponseAsync`,
 *     which is the only way to see a response that arrived before any listener
 *     existed.
 *
 * `expo-notifications` is loaded lazily here rather than imported at the top of
 * the file. Importing it eagerly crashes Expo Go on Android — see
 * `notificationsGateway` for why — and this hook is mounted from the root
 * layout, so that crash took the entire app down before anything rendered.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';

import { trackEvent } from '@/lib/analytics/analytics';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

import { loadNotifications } from '../services/notificationsGateway';
import { configureForegroundBehaviour } from '../services/notificationService';
import { isStaleNotification, parseNotificationData } from '../utils/notificationPayload';

/** Records the open so the engine can learn what the user responds to. */
function recordOpen(historyId: string | undefined): void {
  if (!historyId) return;

  void supabase
    .rpc('record_notification_outcome', { p_notification_id: historyId, p_outcome: 'opened' })
    .then(({ error }) => {
      if (error) logger.debug('notifications.outcomeRecordFailed', { error });
    });
}

/** The payload shape the OS hands back; kept minimal to avoid importing types. */
interface NotificationResponseLike {
  notification: { request: { content: { data: unknown } } };
}

export function useNotificationRouting(): void {
  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    // Guards against the cold-start response also arriving through the
    // listener, which would navigate twice.
    let handledColdStart = false;

    function handleResponse(response: NotificationResponseLike): void {
      const data = parseNotificationData(response.notification.request.content.data);

      trackEvent('notification_opened', { category: data.category });
      recordOpen(data.historyId);

      // A reminder that sat in the tray overnight should still open the app,
      // but at home rather than at a destination chosen for yesterday.
      if (isStaleNotification(data)) {
        logger.debug('notifications.staleOpen', { category: data.category });
        router.push('/(tabs)/home');
        return;
      }

      logger.debug('notifications.routing', { category: data.category, route: data.route });
      router.push(data.route as never);
    }

    void (async () => {
      const notifications = await loadNotifications();
      // Expo Go on Android, or a build without the native module: the rest of
      // the app is unaffected.
      if (!notifications || cancelled) return;

      await configureForegroundBehaviour();

      const subscription = notifications.addNotificationResponseReceivedListener((response) =>
        handleResponse(response as NotificationResponseLike),
      );
      remove = () => subscription.remove();

      const initial = await notifications.getLastNotificationResponseAsync();
      if (initial && !handledColdStart && !cancelled) {
        handledColdStart = true;
        handleResponse(initial as NotificationResponseLike);
      }
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
}
