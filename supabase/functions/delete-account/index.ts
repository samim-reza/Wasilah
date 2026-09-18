/**
 * Permanent account deletion.
 *
 * Deleting the auth user cascades through every table via ON DELETE CASCADE, so
 * this does not enumerate tables — a list here would silently miss any table
 * added later, leaving orphaned personal data behind.
 *
 * Runs with the service role because deleting an auth user is an admin
 * operation, but it verifies the caller's own JWT first and deletes only that
 * user. It can never be used to delete somebody else's account.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (request: Request): Promise<Response> => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  if (request.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', 'Only POST is supported.');
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return errorResponse(401, 'unauthenticated', 'Missing Authorization header.');
  }

  // Resolve the caller with THEIR token, not the service role, so the identity
  // being deleted is the identity that asked.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return errorResponse(401, 'unauthenticated', 'Could not verify the caller.');
  }

  const userId = userData.user.id;
  const admin = createAdminClient();

  // Invalidate push tokens first: if the delete somehow fails partway, the
  // device must still stop receiving notifications.
  await admin
    .from('push_tokens')
    .update({ invalidated_at: new Date().toISOString() })
    .eq('user_id', userId);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error('account deletion failed', deleteError.message);
    return errorResponse(500, 'delete_failed', 'Could not delete the account.');
  }

  return jsonResponse({ deleted: true });
});
