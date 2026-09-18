/**
 * Remote notification copy.
 *
 * The app ships a complete set of local templates and always renders from them
 * first. Remote rows only *override* the wording, which is the whole point: a
 * phrase can be softened or a typo fixed without an app release, while a
 * missing row, a failed fetch or an offline device changes nothing.
 *
 * The override applies to title and body only. Which category a template
 * belongs to, and where it deep-links, stay in the shipped code — those are
 * behaviour, not copy, and a server row should not be able to redirect a
 * notification somewhere the app did not intend.
 */
import { getLocale } from '@/lib/i18n';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

export interface RemoteTemplateOverride {
  title: string;
  body: string;
}

/** Keyed by template key for the active locale. */
export type RemoteTemplateMap = Record<string, RemoteTemplateOverride>;

let cache: { locale: string; templates: RemoteTemplateMap } | null = null;

/**
 * Fetches the active overrides for a locale.
 *
 * Failures resolve to an empty map rather than throwing: notification copy is
 * the least important thing in the app to get from the network, and a reminder
 * with shipped wording is infinitely better than no reminder.
 */
export async function fetchRemoteTemplates(locale = getLocale()): Promise<RemoteTemplateMap> {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('key, title, body')
    .eq('locale', locale)
    .eq('is_active', true);

  if (error) {
    logger.debug('notifications.templateFetchFailed', { error });
    return {};
  }

  const templates: RemoteTemplateMap = {};
  for (const row of data ?? []) {
    // A row with empty copy would render a blank notification; skip it rather
    // than letting it override perfectly good shipped text.
    if (!row.title?.trim() || !row.body?.trim()) continue;
    templates[row.key] = { title: row.title, body: row.body };
  }

  return templates;
}

/**
 * Refreshes the cache. Called at startup and after a locale change; the
 * scheduler then reads synchronously via `getCachedTemplate`, because
 * rendering a notification must not wait on the network.
 */
export async function primeRemoteTemplates(locale = getLocale()): Promise<void> {
  const templates = await fetchRemoteTemplates(locale);
  cache = { locale, templates };
  logger.debug('notifications.templatesPrimed', { count: Object.keys(templates).length });
}

/** The override for a key, or null to use the shipped copy. */
export function getCachedTemplate(key: string): RemoteTemplateOverride | null {
  if (!cache) return null;
  // A stale locale must not leak another language's copy into a notification.
  if (cache.locale !== getLocale()) return null;
  return cache.templates[key] ?? null;
}

/** Test seam, and used when signing out. */
export function clearRemoteTemplates(): void {
  cache = null;
}
