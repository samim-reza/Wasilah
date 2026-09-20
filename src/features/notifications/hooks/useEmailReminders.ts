/**
 * The email reminder opt-in.
 *
 * Its own tiny hook rather than part of `useReminderSettings`, because it is
 * the only preference that lives in `notification_preferences` and the only
 * one that cannot work for a guest: there is no address to send to until
 * someone has an account.
 *
 * No local mirror either, deliberately. Every other preference is mirrored to
 * the device so it survives being offline, but this one is read by a server
 * job — a device-only value would be a switch that looks on and sends nothing.
 */
import { useCallback, useEffect, useState } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

export interface UseEmailRemindersResult {
  enabled: boolean;
  /** False for a guest: there is no account to send to. */
  isAvailable: boolean;
  isLoading: boolean;
  setEnabled: (value: boolean) => Promise<void>;
}

export function useEmailReminders(): UseEmailRemindersResult {
  const userId = useUserId();
  const [enabled, setEnabledState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!userId) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('notification_preferences')
        .select('email_enabled')
        .eq('user_id', userId)
        .maybeSingle();

      if (!cancelled) {
        setEnabledState(Boolean(data?.email_enabled));
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setEnabled = useCallback(
    async (value: boolean) => {
      if (!userId) return;
      setEnabledState(value);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: userId, email_enabled: value }, { onConflict: 'user_id' });

      if (error) {
        // Put the switch back: unlike the device-backed preferences, a failed
        // write here means the server genuinely does not have the change, and
        // showing it as on would be a lie.
        logger.warn('notifications.emailPreferenceFailed', { error });
        setEnabledState(!value);
      }
    },
    [userId],
  );

  return { enabled, isAvailable: Boolean(userId), isLoading, setEnabled };
}
