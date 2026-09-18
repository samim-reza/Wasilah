/**
 * The Supabase client singleton.
 *
 * Two React Native specifics are handled here and nowhere else:
 *   - `react-native-url-polyfill` must be imported before the client is
 *     constructed, because Hermes ships an incomplete URL implementation that
 *     supabase-js relies on for building request URLs.
 *   - Sessions are persisted in SecureStore rather than AsyncStorage. A refresh
 *     token is a credential; keeping it in plain app storage would make it
 *     readable from a device backup.
 */
import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from '@/config/env';
import { secureStore } from '@/lib/storage/secureStore';

import type { Database } from './database.types';

export type WasilahSupabaseClient = SupabaseClient<Database>;

export const supabase: WasilahSupabaseClient = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      storage: secureStore,
      autoRefreshToken: true,
      persistSession: true,
      // There is no URL to parse a session out of on native; leaving this on
      // makes supabase-js touch `window.location`, which does not exist.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'x-wasilah-platform': Platform.OS,
      },
    },
    // Realtime is not used yet; the habit data is pull-based. Throttling the
    // (unused) socket keeps it from waking the radio.
    realtime: {
      params: { eventsPerSecond: 2 },
    },
  },
);

/**
 * Supabase refreshes tokens on a timer that the OS suspends in the background.
 * Tying the refresher to foreground/background means a user returning after
 * hours gets a valid token immediately instead of one failed request first.
 */
export function startAuthAutoRefresh(): () => void {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });

  void supabase.auth.startAutoRefresh();

  return () => {
    subscription.remove();
    void supabase.auth.stopAutoRefresh();
  };
}
