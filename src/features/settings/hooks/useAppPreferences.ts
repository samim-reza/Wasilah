/**
 * App-level preferences: privacy consent and account actions.
 *
 * Consent is applied immediately, not on a save button. Turning analytics off
 * must stop collection at that instant, not after a round trip.
 */
import { useCallback, useEffect, useState } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { deleteAccount as deleteAccountService } from '@/features/auth/services/authService';
import {
  initializeAnalytics,
  setAnalyticsOptIn as applyAnalyticsOptIn,
} from '@/lib/analytics/analytics';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

export interface AppPreferencesState {
  analyticsOptIn: boolean;
  crashReportsOptIn: boolean;
  setAnalyticsOptIn: (value: boolean) => Promise<void>;
  setCrashReportsOptIn: (value: boolean) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export function useAppPreferences(): AppPreferencesState {
  const userId = useUserId();
  const [analyticsOptIn, setAnalyticsState] = useState(false);
  const [crashReportsOptIn, setCrashReportsState] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('analytics_opt_in, crash_reports_opt_in')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled || error || !data) return;

      setAnalyticsState(data.analytics_opt_in);
      setCrashReportsState(data.crash_reports_opt_in);
      // Start or stop collection to match what was stored.
      void initializeAnalytics(data.analytics_opt_in);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    async (patch: { analytics_opt_in?: boolean; crash_reports_opt_in?: boolean }) => {
      if (!userId) return;

      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });

      if (error) logger.warn('settings.persistFailed', { error });
    },
    [userId],
  );

  const setAnalyticsOptIn = useCallback(
    async (value: boolean) => {
      setAnalyticsState(value);
      // Applied before the write, so consent withdrawal takes effect even if
      // the network call fails.
      applyAnalyticsOptIn(value);
      await initializeAnalytics(value);
      await persist({ analytics_opt_in: value });
    },
    [persist],
  );

  const setCrashReportsOptIn = useCallback(
    async (value: boolean) => {
      setCrashReportsState(value);
      await persist({ crash_reports_opt_in: value });
    },
    [persist],
  );

  const deleteAccount = useCallback(async () => {
    await deleteAccountService();
  }, []);

  return {
    analyticsOptIn,
    crashReportsOptIn,
    setAnalyticsOptIn,
    setCrashReportsOptIn,
    deleteAccount,
  };
}
