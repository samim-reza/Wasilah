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

export function fromPostgrestError(
  error: PostgrestError,
  context?: Record<string, unknown>,
): AppError {
  const kind = postgrestCodeMap[error.code] ?? 'server';
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
