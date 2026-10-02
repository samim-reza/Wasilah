/**
 * Translates Supabase/PostgREST failures into the app's `AppError` taxonomy, so
 * screens branch on one error shape regardless of which backend produced it.
 */
import type { PostgrestError } from '@supabase/supabase-js';

import { AppError } from '@/lib/api/errors';

/** PostgREST codes that carry more meaning than their HTTP status. */
const postgrestCodeMap: Record<string, AppError['kind']> = {
  PGRST116: 'not_found', // no rows returned for a .single()
  '23505': 'unknown', // unique violation — usually a benign duplicate
  '42501': 'forbidden', // insufficient privilege, i.e. an RLS denial
  '23503': 'invalid_response', // foreign key violation
};

/**
 * What supabase-js returns, rather than throws, when the request never left
 * the phone: no code, and the fetch failure as the message.
 */
const NETWORK_FAILURE =
  /network request failed|failed to fetch|network ?error|load failed|timed? ?out/i;

export function isNetworkFailure(error: { code?: string; message?: string }): boolean {
  return !error.code && NETWORK_FAILURE.test(error.message ?? '');
}

export function fromPostgrestError(
  error: PostgrestError,
  context?: Record<string, unknown>,
): AppError {
  // Offline, not a server fault. Calling it "server" made the sync queue
  // spend an entry's retries on every failed flush while the phone had no
  // connection, and then throw the entry away — losing what was done offline.
  const kind = isNetworkFailure(error) ? 'offline' : (postgrestCodeMap[error.code] ?? 'server');
  return new AppError(kind, error.message, {
    cause: error,
    context: { ...context, code: error.code, details: error.details },
  });
}

/**
 * Auth errors carry user-facing meaning, so they are mapped individually rather
 * than collapsed into a generic failure.
 */
export function fromAuthError(error: { message: string; status?: number }): AppError {
  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return new AppError('unauthorized', error.message, { cause: error });
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return new AppError('forbidden', error.message, { cause: error });
  }
  if (error.status === 429) {
    return new AppError('rate_limited', error.message, { cause: error });
  }
  if (error.status && error.status >= 500) {
    return new AppError('server', error.message, { cause: error });
  }
  return new AppError('unknown', error.message, { cause: error });
}
