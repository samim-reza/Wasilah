/**
 * Turns a notification tap into a navigation.
 *
 * Mounted once, inside the navigator. Two paths have to be handled and they are
 * easy to confuse:
 *   • the app was already running — `addNotificationResponseReceivedListener`
 *   • the app was launched BY the tap — `getLastNotificationResponseAsync`,
 *     which is the only way to see a response that arrived before any listener
 *     existed.
 */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { trackEvent } from '@/lib/analytics/analytics';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

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

export function useNotificationRouting(): void {
  // Guards against the cold-start response being handled twice if the effect
  // re-runs (React 19 strict mode double-invokes effects in development).
  const handledColdStart = useRef(false);

  useEffect(() => {
    function handleResponse(response: Notifications.NotificationResponse): void {
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

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response || handledColdStart.current) return;
      handledColdStart.current = true;
      handleResponse(response);
    });

    return () => subscription.remove();
  }, []);
}
