/**
 * Service-role Supabase client for edge functions.
 *
 * Bypasses Row Level Security, so it must only ever be constructed inside a
 * function that a client cannot invoke directly (see `verify_jwt` in
 * supabase/config.toml). Never return raw rows fetched with this client to a
 * caller without filtering them yourself.
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
