/**
 * Authentication operations.
 *
 * Every function returns or throws an `AppError`, so screens never see a
 * Supabase error shape. Nothing here touches React.
 */
import type { Session } from '@supabase/supabase-js';

import { branding } from '@/config/branding';
import { AppError } from '@/lib/api/errors';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';
import { fromAuthError, fromPostgrestError } from '@/lib/supabase/errors';
import { getDeviceTimezone } from '@/lib/datetime/localDate';

import type { SignInInput, SignUpInput } from '../types/auth.types';

export async function signUp(input: SignUpInput): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: { display_name: input.displayName?.trim() || null },
      emailRedirectTo: `${branding.scheme}://auth/callback`,
    },
  });

  if (error) throw fromAuthError(error);

  // With email confirmation enabled there is no session yet; the caller shows
  // "check your inbox" rather than treating this as a failure.
  logger.info('auth.signedUp', { hasSession: Boolean(data.session) });
  return data.session;
}

export async function signIn(input: SignInInput): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  if (error) throw fromAuthError(error);
  if (!data.session) {
    throw new AppError('unauthorized', 'Sign-in returned no session');
  }

  logger.info('auth.signedIn');
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw fromAuthError(error);
  logger.info('auth.signedOut');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${branding.scheme}://auth/reset-password`,
  });

  if (error) throw fromAuthError(error);
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // A failure to restore a session is not fatal — the app falls back to guest
    // mode rather than blocking the user at a login wall.
    logger.warn('auth.getSessionFailed', { error });
    return null;
  }
  return data.session;
}

/**
 * Stores the device timezone on the profile.
 *
 * The notification engine runs server-side with no device present, so it can
 * only schedule a user's local 8pm if the server knows their zone. Called on
 * every sign-in and whenever the device timezone changes.
 */
export async function syncProfileTimezone(userId: string, locale: string): Promise<void> {
  const timezone = getDeviceTimezone();

  const { error } = await supabase.from('profiles').update({ timezone, locale }).eq('id', userId);

  if (error) {
    logger.warn('auth.timezoneSyncFailed', { error });
    throw fromPostgrestError(error, { userId });
  }
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw fromPostgrestError(error, { userId });
}

/** Deletes the account and, by cascade, every row belonging to it. */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) {
    throw new AppError('server', 'Account deletion failed', { cause: error });
  }
  await supabase.auth.signOut();
}
