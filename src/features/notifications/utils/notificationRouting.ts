/**
 * Deep-link routing for notifications.
 *
 * All navigation targets live here rather than being scattered through the
 * handlers that receive a tap. A notification declares WHERE it goes; this
 * module owns HOW that becomes a navigation.
 */
import { parseVerseKey } from '@/features/quran/utils/verseKey';

/** Canonical in-app destinations a notification may point at. */
export const routes = {
  home: '/(tabs)/home',
  todaysAyah: '/(tabs)/home?focus=todays-ayah',
  continueReading: '/(tabs)/home?focus=continue',
  progress: '/(tabs)/progress',
  bookmarks: '/bookmarks',
  settings: '/settings',
  notificationSettings: '/notification-settings',
} as const;

/** Builds a route to a specific ayah. */
export function verseRoute(verseKey: string): string {
  const address = parseVerseKey(verseKey);
  if (!address) return routes.home;
  return `/quran/${address.chapterId}?ayah=${address.verseNumber}`;
}

/**
 * Validates a route from a notification payload before navigating.
 *
 * A push payload is untrusted input. Without this, a malformed or hostile
 * payload could push the user to an arbitrary path, or to an external URL if
 * the router were ever configured to follow one.
 */
export function sanitizeRoute(route: unknown): string {
  if (typeof route !== 'string' || route.length === 0) return routes.home;

  // In-app paths only: no scheme, no protocol-relative URL, no traversal.
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('..')) {
    return routes.home;
  }

  const knownPrefixes = [
    '/(tabs)',
    '/quran/',
    '/bookmarks',
    '/notes',
    '/settings',
    '/notification-settings',
    '/reader-translations',
    '/reader-reciters',
    '/prayer-times',
    '/search',
    '/about',
  ];
  const isKnown = knownPrefixes.some((prefix) => route.startsWith(prefix));

  return isKnown ? route : routes.home;
}
