import type { Session, User } from '@supabase/supabase-js';

/**
 * How the app is currently being used.
 *
 * `guest` is a first-class state, not an error state: Wasilah lets anyone read
 * the Quran and build a streak on-device before deciding to create an account.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'guest';

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  /** Convenience: true once the initial session restore has finished. */
  isReady: boolean;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}
