/**
 * Session state for the whole app.
 *
 * Mounted above everything so `useAuth()` is available anywhere, and so the
 * splash screen can stay up until the stored session has been restored — which
 * is what prevents the app from flashing a signed-out home screen for a user
 * who is in fact signed in.
 */
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { queryClient } from '@/lib/api/queryClient';
import { identifyUser } from '@/lib/analytics/analytics';
import { logger } from '@/lib/monitoring/logger';
import { setMonitoringUser } from '@/lib/monitoring/sentry';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { userScopedStorageKeys } from '@/lib/storage/storageKeys';
import { startAuthAutoRefresh, supabase } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { signOut as signOutService, syncProfileTimezone } from '../services/authService';
import type { AuthState, AuthStatus } from '../types/auth.types';

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  /** True when the user is reading without an account. */
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function statusFor(session: Session | null, isReady: boolean): AuthStatus {
  if (!isReady) return 'loading';
  return session ? 'authenticated' : 'guest';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { locale } = useTranslation();

  useEffect(() => {
    let mounted = true;

    // `onAuthStateChange` fires with the restored session immediately after
    // subscribing, so it covers both the initial load and later changes. Using
    // only this (rather than also calling getSession) avoids a race where the
    // two resolve in the wrong order and the older value wins.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      logger.debug('auth.stateChanged', { event, hasSession: Boolean(nextSession) });
      setSession(nextSession);
      setIsReady(true);

      const userId = nextSession?.user.id ?? null;
      setMonitoringUser(userId);
      identifyUser(userId);

      if (event === 'SIGNED_OUT') {
        // Drop every cached query and on-device row belonging to the previous
        // user, so the next person to open the app never sees their data.
        queryClient.clear();
        void keyValueStore.removeMany(userScopedStorageKeys);
      }
    });

    const stopAutoRefresh = startAuthAutoRefresh();

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
      stopAutoRefresh();
    };
  }, []);

  // Keep the server's idea of the user's timezone current. Doing this on every
  // session change covers the common case of a user travelling and reopening
  // the app in a new zone.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    void syncProfileTimezone(userId, locale).catch((error: unknown) => {
      logger.warn('auth.timezoneSyncSkipped', { error });
    });
  }, [session?.user.id, locale]);

  const signOut = useCallback(async () => {
    await signOutService();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user: User | null = session?.user ?? null;
    const status = statusFor(session, isReady);

    return {
      status,
      session,
      user,
      isReady,
      isGuest: status === 'guest',
      signOut,
    };
  }, [session, isReady, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/**
 * The user id, or null in guest mode.
 *
 * Most data hooks need exactly this and nothing else from the auth context;
 * depending on it directly keeps them from re-rendering on unrelated session
 * churn such as a token refresh.
 */
export function useUserId(): string | null {
  return useAuth().user?.id ?? null;
}
