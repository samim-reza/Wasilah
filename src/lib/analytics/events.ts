/**
 * The analytics event catalogue.
 *
 * Every event the app can emit is declared here with its exact payload type.
 * A typo in an event name or a missing property becomes a compile error rather
 * than a gap discovered weeks later in a dashboard.
 *
 * Privacy rule, enforced by the types themselves: no event carries WHICH ayah a
 * person read, what they searched for, or what they wrote. Counts and
 * categories only.
 */
export interface AnalyticsEventMap {
  app_opened: { cold_start: boolean };
  onboarding_started: Record<string, never>;
  onboarding_completed: { goal_unit: string; goal_amount: number; reminder_enabled: boolean };
  onboarding_skipped: { step: string };

  /** Chapter id is included: it is public structure, not private behaviour. */
  reading_session_started: { source: string };
  reading_session_completed: { verses_read: number; duration_seconds: number; source: string };

  daily_minimum_completed: { streak_after: number };
  goal_completed: { goal_unit: string; goal_amount: number };
  streak_extended: { streak_length: number };
  streak_broken: { previous_length: number };
  achievement_unlocked: { achievement_key: string };

  ayah_viewed: { source: string };
  todays_ayah_viewed: Record<string, never>;
  todays_ayah_completed: Record<string, never>;

  audio_started: { source: string };
  audio_completed: { duration_seconds: number };
  reciter_changed: { recitation_id: number };

  bookmark_created: Record<string, never>;
  bookmark_removed: Record<string, never>;
  note_saved: { length_bucket: 'short' | 'medium' | 'long' };

  /** The query itself is never sent — only whether it found anything. */
  search_performed: { has_results: boolean; result_count_bucket: string };
  search_result_opened: { position: number };

  notification_permission_requested: Record<string, never>;
  notification_permission_result: { granted: boolean };
  notification_scheduled: { category: string };
  notification_opened: { category: string };
  notification_dismissed: { category: string };

  goal_changed: { goal_unit: string; goal_amount: number };
  reminder_time_changed: Record<string, never>;
  translation_changed: { translation_id: number };
  theme_changed: { theme: string };
  language_changed: { locale: string };

  offline_queue_flushed: { item_count: number };
  sync_conflict_resolved: { strategy: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

/** Buckets a count so an exact figure never becomes a fingerprint. */
export function bucketCount(count: number): string {
  if (count === 0) return '0';
  if (count <= 5) return '1-5';
  if (count <= 20) return '6-20';
  if (count <= 50) return '21-50';
  return '50+';
}

export function bucketLength(length: number): 'short' | 'medium' | 'long' {
  if (length < 100) return 'short';
  if (length < 500) return 'medium';
  return 'long';
}
