/**
 * Per-prayer reminder rules.
 *
 * A row exists only for a prayer the user has enabled, so the absence of a row
 * is meaningful rather than a default to be inferred.
 */
import { supabase } from '@/lib/supabase/client';
import { fromPostgrestError } from '@/lib/supabase/errors';
import type { PrayerReminderRule } from '@/features/reminders/services/prayerReminderPlanner';

import type { PrayerName } from '../types/prayer.types';

export async function fetchPrayerRules(userId: string): Promise<PrayerReminderRule[]> {
  const { data, error } = await supabase
    .from('prayer_reminder_rules')
    .select('prayer, direction, offset_minutes, enabled')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (error) throw fromPostgrestError(error, { userId });

  return (data ?? []).map((row) => ({
    prayer: row.prayer,
    direction: row.direction,
    offsetMinutes: row.offset_minutes,
    enabled: row.enabled,
  }));
}

export async function savePrayerRule(
  userId: string,
  rule: {
    prayer: PrayerName;
    direction: 'before' | 'after';
    offsetMinutes: number;
    enabled: boolean;
  },
): Promise<void> {
  const { error } = await supabase.from('prayer_reminder_rules').upsert(
    {
      user_id: userId,
      prayer: rule.prayer,
      direction: rule.direction,
      offset_minutes: rule.offsetMinutes,
      enabled: rule.enabled,
    },
    { onConflict: 'user_id,prayer' },
  );

  if (error) throw fromPostgrestError(error, { userId });
}
