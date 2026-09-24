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
import { router, useRootNavigationState } from 'expo-router';
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

/**
 * Navigates once the router can, retrying briefly if it cannot yet.
 *
 * A tap that launches the app arrives before the root layout has mounted:
 * fonts and the session are still loading and the navigator is not on
 * screen. Navigating then throws, the throw is swallowed inside the async
 * response handling, and the app sits on the splash with nowhere to go —
 * which is exactly how a tapped bedtime reminder looked.
 */
function navigateWhenReady(route: string, attempt = 0): void {
  try {
    router.push(route as never);
  } catch (error) {
    if (attempt >= 20) {
      logger.warn('notifications.routingGaveUp', { route, error });
      return;
    }
    setTimeout(() => navigateWhenReady(route, attempt + 1), 250);
  }
}

/**
 * @param enabled False until the root navigator is mounted. The cold-start
 * response is read only once it is true, so the navigation has somewhere to
 * land; a response that arrives while the app is running is handled as it
 * comes.
 */
export function useNotificationRouting(enabled: boolean): void {
  // The root navigation state has a key once the navigator has mounted.
  const rootState = useRootNavigationState();
  const navigatorReady = enabled && Boolean(rootState?.key);

  useEffect(() => {
    if (!navigatorReady) return;

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
        navigateWhenReady('/(tabs)/home');
        return;
      }

      logger.debug('notifications.routing', { category: data.category, route: data.route });
      navigateWhenReady(data.route);
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
  }, [navigatorReady]);
}
