/**
 * Parsing of incoming notification payloads.
 *
 * A payload arrives as `unknown` from the OS and may have been built by an older
 * app version, by the server, or by nothing we control. Every field is checked
 * before use.
 */
import type { NotificationCategory } from '@/lib/supabase/database.types';

import type { NotificationData } from '../types/notification.types';
import { routes, sanitizeRoute } from './notificationRouting';

const VALID_CATEGORIES: ReadonlySet<string> = new Set<NotificationCategory>([
  'daily_reminder',
  'goal_reminder',
  'streak_reminder',
  'todays_ayah',
  'prayer_reminder',
  'weather_reminder',
  'announcement',
]);

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Normalises an arbitrary payload into `NotificationData`.
 *
 * Never returns null: an unrecognised payload still opens the app at home,
 * which is a better outcome than a tap that appears to do nothing.
 */
export function parseNotificationData(raw: unknown): NotificationData {
  if (typeof raw !== 'object' || raw === null) {
    return { category: 'daily_reminder', templateKey: 'unknown', route: routes.home };
  }

  const record = raw as Record<string, unknown>;
  const category = asString(record['category']);

  return {
    category: (category && VALID_CATEGORIES.has(category)
      ? category
      : 'daily_reminder') as NotificationCategory,
    templateKey: asString(record['templateKey']) ?? 'unknown',
    route: sanitizeRoute(record['route']),
    historyId: asString(record['historyId']),
    scheduledFor: asString(record['scheduledFor']),
  };
}

/**
 * Is this delivery still relevant?
 *
 * A device that was off overnight can receive yesterday's "read today" reminder
 * at breakfast. Showing it would be confusing and would burn a slot against the
 * daily cap.
 */
export function isStaleNotification(data: NotificationData, now: Date = new Date()): boolean {
  if (!data.scheduledFor) return false;

  const scheduled = new Date(data.scheduledFor);
  if (Number.isNaN(scheduled.getTime())) return false;

  const ageHours = (now.getTime() - scheduled.getTime()) / 3_600_000;
  return ageHours > 12;
}
