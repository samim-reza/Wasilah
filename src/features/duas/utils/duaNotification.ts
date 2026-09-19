/**
 * Turning a chosen occasion into a notification.
 *
 * Content only. Whether to send is decided in `features/reminders`, and
 * delivery is `features/notifications` — this module sits between them and
 * owns nothing but the words and the destination.
 */
import type { NotificationContent } from '@/features/notifications/types/notification.types';

import type { DuaImagery, DuaOccasion } from '../types/dua.types';

/** Route prefix for the detail screen. Must stay in step with `src/app/dua/`. */
export const DUA_ROUTE_PREFIX = '/dua/';

export function duaRoute(occasionId: string): string {
  return `${DUA_ROUTE_PREFIX}${occasionId}`;
}

/**
 * Artwork bundled with the app, keyed by imagery.
 *
 * Bundled rather than fetched: a notification has to render the instant it
 * fires, including offline and on a locked phone, so there is no opportunity
 * to download anything first.
 *
 * `null` means no artwork for that key, which is the correct state for the
 * everyday-action duas — an image of nothing in particular would be noise.
 */
export const duaImageAssets: Record<DuaImagery, number | null> = {
  rain: null,
  sun: null,
  moon: null,
  night: null,
  dawn: null,
  mosque: null,
  none: null,
};

/**
 * Builds the notification for an occasion.
 *
 * The body is the occasion's prompt, never the dua itself. Two reasons: the
 * words should be met deliberately rather than glanced at on a lock screen
 * among other alerts, and a lock-screen preview is visible to anyone holding
 * the phone. Tapping through is the point.
 */
export function buildDuaNotification(occasion: DuaOccasion): NotificationContent {
  return {
    title: occasion.title,
    body: occasion.prompt,
    data: {
      category: 'daily_reminder',
      templateKey: `dua:${occasion.id}`,
      route: duaRoute(occasion.id),
    },
  };
}
