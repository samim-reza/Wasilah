/**
 * OAuth2 client-credentials token management for the Quran Foundation API.
 *
 * Tokens live for an hour. Caching one in module scope means a warm function
 * instance serves many requests per token; a cold instance simply fetches a new
 * one. The in-flight promise is cached too, so a burst of concurrent requests
 * on a cold instance triggers exactly one token request rather than dozens.
 */
import { getCredentials, getEndpoints, REQUESTED_SCOPES } from './qfConfig.ts';

interface CachedToken {
  accessToken: string;
  /** Epoch milliseconds after which the token must not be used. */
  expiresAt: number;
  /** What the server actually granted, which may be less than we asked for. */
  scopes: readonly string[];
}

let cached: CachedToken | null = null;
let inFlight: Promise<CachedToken> | null = null;

/**
 * Scopes a previous request proved this client cannot have.
 *
 * Remembered per function instance so the retry happens once on a cold start
 * rather than on every token refresh. A new instance re-tests, which is how an
 * approval that lands later gets picked up without a deploy.
 */
const rejectedScopes = new Set<string>();

/** Renew this long before expiry so a request never races the boundary. */
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface TokenErrorResponse {
  error?: string;
  error_description?: string;
}

/**
 * Pulls the offending scope out of an `invalid_scope` rejection.
 *
 * The description is prose — "The OAuth 2.0 Client is not allowed to request
 * scope 'search'." — so the name is matched against what we actually asked
 * for rather than trusting a quoted substring. If the scope cannot be
 * identified, nothing is dropped and the original error surfaces, because
 * blindly retrying with fewer scopes would hide a real credentials problem.
 */
function findRejectedScope(body: string, attempted: readonly string[]): string | null {
  let parsed: TokenErrorResponse;
  try {
    parsed = JSON.parse(body) as TokenErrorResponse;
  } catch {
    return null;
  }

  if (parsed.error !== 'invalid_scope') return null;

  const description = parsed.error_description ?? '';
  // Never drop the last scope: a token with no scope is useless, and this
  // would turn a credentials failure into a silent, permanent degradation.
  const droppable = attempted.filter((scope) => scope !== attempted[0]);

  return droppable.find((scope) => description.includes(`'${scope}'`)) ?? null;
}

async function requestWithScopes(scopes: readonly string[]): Promise<CachedToken> {
  const { clientId, clientSecret } = getCredentials();
  const { tokenUrl } = getEndpoints();

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      // HTTP Basic with the client credentials, per the QF quickstart.
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: scopes.join(' '),
    }).toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');

    const rejected = findRejectedScope(detail, scopes);
    if (rejected) {
      // Remember and retry without it. Logged at warn because search quietly
      // not working is exactly the kind of thing that goes unnoticed.
      rejectedScopes.add(rejected);
      console.warn(
        `Quran Foundation rejected scope '${rejected}'; retrying without it. ` +
          'Features needing it will be unavailable until it is granted.',
      );
      return requestWithScopes(scopes.filter((scope) => scope !== rejected));
    }

    throw new Error(
      `Quran Foundation token request failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as TokenResponse;

  if (!payload.access_token) {
    throw new Error('Quran Foundation token response did not include an access_token');
  }

  const lifetimeMs = (payload.expires_in ?? 3600) * 1000;

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + lifetimeMs - EXPIRY_SAFETY_MARGIN_MS,
    scopes: payload.scope ? payload.scope.split(' ') : scopes,
  };
}

function requestToken(): Promise<CachedToken> {
  const scopes = REQUESTED_SCOPES.filter((scope) => !rejectedScopes.has(scope));
  return requestWithScopes(scopes);
}

export async function getAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }

  inFlight ??= requestToken()
    .then((token) => {
      cached = token;
      return token;
    })
    .finally(() => {
      inFlight = null;
    });

  const token = await inFlight;
  return token.accessToken;
}

/** Drops the cached token so the next call re-authenticates. Used after a 401. */
export function invalidateToken(): void {
  cached = null;
}

/**
 * Whether the current token carries a scope.
 *
 * Lets the proxy answer "search is not available" outright instead of
 * forwarding a request the search service would answer with an empty result
 * set — which reads as "no matches" and is indistinguishable from a bad query.
 */
export async function hasScope(scope: string): Promise<boolean> {
  await getAccessToken();
  return cached?.scopes.includes(scope) ?? false;
}
