/**
 * Where an email confirmation or password-reset link lands.
 *
 * This route is what was missing: `signUp` has always asked Supabase to
 * redirect to `auth/callback`, but nothing existed here to receive it, and
 * nothing exchanged the code for a session. A user who clicked the link in
 * their email arrived nowhere and stayed signed out.
 *
 * The flow is PKCE (see `lib/supabase/client`), so the link carries a `code`
 * that has to be exchanged. `detectSessionInUrl` is off because that is a web
 * browser behaviour; on a device the exchange belongs here, explicitly.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

type State = 'exchanging' | 'done' | 'failed';

export default function AuthCallbackScreen() {
  // Supabase sends `code` on success and `error_description` on failure.
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [state, setState] = useState<State>('exchanging');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (params.error_description) {
        if (!cancelled) {
          setMessage(params.error_description);
          setState('failed');
        }
        return;
      }

      if (!params.code) {
        if (!cancelled) {
          // Most often an expired or already-used link.
          setMessage('This link is no longer valid. Request a new one and try again.');
          setState('failed');
        }
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(params.code);

      if (cancelled) return;

      if (error) {
        logger.warn('auth.codeExchangeFailed', { error });
        setMessage('We could not confirm this link. Request a new one and try again.');
        setState('failed');
        return;
      }

      logger.info('auth.confirmed');
      setState('done');
      // Replace rather than push: the callback should not sit in the history
      // where a back gesture would re-run a code that is now spent.
      router.replace('/(tabs)/home');
    })();

    return () => {
      cancelled = true;
    };
  }, [params.code, params.error_description]);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6 px-6">
        {state === 'exchanging' && (
          <>
            <ActivityIndicator />
            <Text tone="muted">Confirming your account…</Text>
          </>
        )}

        {state === 'failed' && (
          <>
            <Text variant="heading" className="text-center">
              Link expired
            </Text>
            <Text tone="muted" className="text-center">
              {message}
            </Text>
            <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
          </>
        )}
      </View>
    </Screen>
  );
}
