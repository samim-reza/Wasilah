/**
 * Quran Foundation environment configuration.
 *
 * Pre-live and production are entirely separate systems: a token issued by one
 * is rejected by the other. Pairing each environment's auth and API base URLs
 * in a single record makes mixing them impossible.
 *
 * NOTE: the pre-live dataset contains only Surah 1 (Al-Fatihah) and Surah 2
 * (Al-Baqarah), and 14 translations. Production carries the full Quran and 145
 * translations. The catalogues are not supersets of one another and neither
 * matches quran.com's, so a resource ID must be verified per environment.
 */
export type QuranFoundationEnvironment = 'prelive' | 'production';

interface QuranFoundationEndpoints {
  readonly tokenUrl: string;
  readonly apiBaseUrl: string;
}

const environments: Record<QuranFoundationEnvironment, QuranFoundationEndpoints> = {
  prelive: {
    tokenUrl: 'https://prelive-oauth2.quran.foundation/oauth2/token',
    apiBaseUrl: 'https://apis-prelive.quran.foundation',
  },
  production: {
    tokenUrl: 'https://oauth2.quran.foundation/oauth2/token',
    apiBaseUrl: 'https://apis.quran.foundation',
  },
};

export function resolveEnvironment(): QuranFoundationEnvironment {
  const value = Deno.env.get('QF_ENV')?.toLowerCase();
  return value === 'production' ? 'production' : 'prelive';
}

export function getEndpoints(): QuranFoundationEndpoints {
  return environments[resolveEnvironment()];
}

export function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get('QF_CLIENT_ID');
  const clientSecret = Deno.env.get('QF_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error(
      'QF_CLIENT_ID and QF_CLIENT_SECRET must be set as edge function secrets. ' +
        'Run: supabase secrets set QF_CLIENT_ID=... QF_CLIENT_SECRET=...',
    );
  }

  return { clientId, clientSecret };
}

/** The Content API is versioned in the path; kept here so it changes in one place. */
export const CONTENT_API_PREFIX = '/content/api/v4';

/**
 * Search is a separate service with its own prefix and version.
 *
 * It is not `/content/api/v4/search`. That path exists and answers 500, which
 * is a considerably worse failure than a 404 — it looks like an outage rather
 * than a wrong address.
 */
export const SEARCH_API_PREFIX = '/search/api/v1';

/**
 * Scopes to request when minting a token.
 *
 * This is a WISH LIST, not a guarantee. Ory — the OAuth server QF runs —
 * rejects the entire token request if any requested scope is ungranted:
 *
 *   {"error":"invalid_scope","error_description":"... not allowed to request
 *    scope 'search'."}
 *
 * which means asking for a scope still under review takes down every request,
 * not just the feature that needs it. Production granted `content` but has
 * `search` pending, so a fixed `content search` would black out the whole app.
 *
 * `qfToken` therefore drops a rejected scope and retries. Listing search here
 * is what lets it start working the moment QF approves it, with no deploy.
 */
export const REQUESTED_SCOPES = ['content', 'search'] as const;
