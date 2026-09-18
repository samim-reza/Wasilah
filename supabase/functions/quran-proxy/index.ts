/**
 * Quran Foundation Content API proxy.
 *
 * Why this exists: the QF Content API authenticates with an OAuth2 client
 * secret, and a secret shipped inside a mobile bundle is a published secret.
 * Every Quran request in the app therefore goes:
 *
 *     Expo app  →  this function  →  Quran Foundation API
 *
 * Responsibilities, in order:
 *   1. Reject anything outside the route allowlist (`_shared/qfRoutes.ts`).
 *   2. Attach a cached OAuth token and the required QF headers.
 *   3. Return the upstream JSON with a Cache-Control window that respects the
 *      one-week caching limit in the QF developer terms.
 *
 * Deliberately NOT authenticated with a user JWT: reading the Quran must not
 * require an account. `verify_jwt = false` is set in `supabase/config.toml`;
 * the Supabase anon key is still required, and a per-IP limiter caps abuse.
 */
import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { CONTENT_API_PREFIX, getEndpoints, resolveEnvironment } from '../_shared/qfConfig.ts';
import { filterParams, resolveRoute } from '../_shared/qfRoutes.ts';
import { getAccessToken, invalidateToken } from '../_shared/qfToken.ts';

/**
 * Per-instance sliding-window rate limit.
 *
 * This is a guard rail, not a security boundary: edge instances do not share
 * state, so the effective global limit is this multiplied by the instance
 * count. It is enough to stop a single misbehaving client from exhausting our
 * upstream quota. Anything stricter belongs in front of the function.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const requestLog = new Map<string, number[]>();

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  const timestamps = (requestLog.get(clientKey) ?? []).filter((t) => t > cutoff);
  timestamps.push(now);
  requestLog.set(clientKey, timestamps);

  // Bound memory on a long-lived instance: drop other clients' stale entries.
  if (requestLog.size > 5_000) {
    for (const [key, entries] of requestLog) {
      if (entries.every((t) => t <= cutoff)) requestLog.delete(key);
    }
  }

  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function clientKeyFor(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/** Performs the upstream call, retrying once if the cached token was rejected. */
async function callQuranFoundation(url: string): Promise<Response> {
  const clientId = Deno.env.get('QF_CLIENT_ID') ?? '';

  const attempt = async (): Promise<Response> =>
    fetch(url, {
      headers: {
        'x-auth-token': await getAccessToken(),
        'x-client-id': clientId,
        Accept: 'application/json',
      },
    });

  const response = await attempt();

  // A 401 on a token we believed was valid means it was revoked or rotated
  // upstream; drop it and try once more before surfacing the failure.
  if (response.status === 401) {
    invalidateToken();
    return attempt();
  }

  return response;
}

Deno.serve(async (request: Request): Promise<Response> => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  if (request.method !== 'GET') {
    return errorResponse(405, 'method_not_allowed', 'Only GET is supported.');
  }

  if (isRateLimited(clientKeyFor(request))) {
    return errorResponse(429, 'rate_limited', 'Too many requests. Please slow down.');
  }

  const requestUrl = new URL(request.url);

  // The function is mounted at /functions/v1/quran-proxy; everything after that
  // is the QF path being requested, e.g. /verses/by_chapter/2.
  const proxiedPath = requestUrl.pathname.replace(/^.*\/quran-proxy/, '');

  const route = resolveRoute(proxiedPath);
  if (!route) {
    return errorResponse(
      404,
      'route_not_allowed',
      `'${proxiedPath}' is not an allowlisted Quran Foundation route.`,
    );
  }

  try {
    const { apiBaseUrl } = getEndpoints();
    const params = filterParams(requestUrl.searchParams, route.allowedParams);
    const query = params.toString();
    const upstreamUrl = `${apiBaseUrl}${CONTENT_API_PREFIX}${route.path}${query ? `?${query}` : ''}`;

    const upstream = await callQuranFoundation(upstreamUrl);

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');

      // Search is a separately approved permission. Until it is granted the
      // upstream answers with a 500, which is indistinguishable from an outage
      // by status alone — but the consequence is the same either way: search
      // does not work and retrying in a few seconds will not change that.
      // Naming it stops the app offering a retry loop that can never succeed.
      if (route.path === '/search' && upstream.status >= 500) {
        return jsonResponse(
          {
            error: {
              code: 'search_unavailable',
              status: upstream.status,
              message:
                'Quran Foundation search is unavailable. If this app is new, the ' +
                '`search` permission may still be awaiting approval in the Developer Console.',
            },
          },
          { status: 503 },
        );
      }

      // Upstream 404s are expected on pre-live, which only holds Surah 1 and 2.
      const hint =
        upstream.status === 404 && resolveEnvironment() === 'prelive'
          ? ' The pre-live dataset only contains Surah 1 and Surah 2.'
          : '';

      return jsonResponse(
        {
          error: {
            code: 'upstream_error',
            status: upstream.status,
            message: `Quran Foundation returned ${upstream.status}.${hint}`,
            detail: detail.slice(0, 300),
          },
        },
        { status: upstream.status >= 500 ? 502 : upstream.status },
      );
    }

    const payload = await upstream.json();
    return jsonResponse(payload, { cacheSeconds: route.cacheSeconds });
  } catch (error) {
    // Configuration problems (missing secrets) and network failures land here.
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('quran-proxy failure', { path: route.path, message });

    return errorResponse(502, 'upstream_unavailable', 'Quran content is temporarily unavailable.');
  }
});
