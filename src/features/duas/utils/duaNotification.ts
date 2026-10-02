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

/** Arabic longer than this is left to the dua's screen; the meaning stands in. */
const NOTIFICATION_ARABIC_LENGTH = 110;
/** The meaning is cut at a sentence, or at this many characters. */
const NOTIFICATION_MEANING_LENGTH = 140;

/** The first sentence of `text`, or its first `limit` characters. */
function shortened(text: string, limit: number): string {
  const sentence = /^.+?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
  if (sentence.length <= limit) return sentence;
  return `${sentence.slice(0, limit).replace(/\s+\S*$/, '')}…`;
}

/**
 * The dua itself, as compact as it can be while still being the words: the
 * Arabic when it is short, then its meaning, cut to its first sentence when
 * long. The full text, transliteration and source are one tap away.
 */
export function compactDuaText(occasion: DuaOccasion): string {
  const { arabic, translation } = occasion.text;
  const meaning = translation ? shortened(translation, NOTIFICATION_MEANING_LENGTH) : '';
  const lines = [
    arabic && arabic.length <= NOTIFICATION_ARABIC_LENGTH ? arabic : null,
    meaning || null,
  ].filter((line): line is string => line !== null);
  return lines.join('\n');
}

/**
 * Builds the notification for an occasion.
 *
 * Direct and short: the title says when ("Say this when you leave the
 * house."), and the body is the dua. It used to ask "Do you know the dua
 * for…?" and hold the words back behind a tap — which meant a reminder that
 * did not, on its own, remind anyone of anything.
 */
export function buildDuaNotification(occasion: DuaOccasion): NotificationContent {
  return {
    title: occasion.prompt,
    body: compactDuaText(occasion) || occasion.title,
    data: {
      category: 'daily_reminder',
      templateKey: `dua:${occasion.id}`,
      route: duaRoute(occasion.id),
    },
  };
}
