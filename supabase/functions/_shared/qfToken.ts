/**
 * OAuth2 client-credentials token management for the Quran Foundation API.
 *
 * Tokens live for an hour. Caching one in module scope means a warm function
 * instance serves many requests per token; a cold instance simply fetches a new
 * one. The in-flight promise is cached too, so a burst of concurrent requests
 * on a cold instance triggers exactly one token request rather than dozens.
 */
import { getCredentials, getEndpoints } from './qfConfig.ts';

interface CachedToken {
  accessToken: string;
  /** Epoch milliseconds after which the token must not be used. */
  expiresAt: number;
}

let cached: CachedToken | null = null;
let inFlight: Promise<CachedToken> | null = null;

/** Renew this long before expiry so a request never races the boundary. */
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

async function requestToken(): Promise<CachedToken> {
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
      scope: 'content',
    }).toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
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
  };
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
