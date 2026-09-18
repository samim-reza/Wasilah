/**
 * CORS headers for edge functions.
 *
 * The mobile app is not subject to CORS, but the same functions are called from
 * the web build and from local development tooling, both of which are.
 */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-wasilah-platform',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(
  body: unknown,
  init: { status?: number; cacheSeconds?: number } = {},
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  if (init.cacheSeconds && init.cacheSeconds > 0) {
    // `s-maxage` lets the edge cache serve repeat requests without a round trip
    // to Quran Foundation; `stale-while-revalidate` keeps the app fast during
    // revalidation.
    headers['Cache-Control'] =
      `public, max-age=${init.cacheSeconds}, s-maxage=${init.cacheSeconds}, stale-while-revalidate=86400`;
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

export function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse({ error: { code, message } }, { status });
}

export function handlePreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  return new Response('ok', { headers: corsHeaders });
}
