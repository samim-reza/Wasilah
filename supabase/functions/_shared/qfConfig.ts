/**
 * Quran Foundation environment configuration.
 *
 * Pre-live and production are entirely separate systems: a token issued by one
 * is rejected by the other. Pairing each environment's auth and API base URLs
 * in a single record makes mixing them impossible.
 *
 * NOTE: the pre-live dataset contains only Surah 1 (Al-Fatihah) and Surah 2
 * (Al-Baqarah). Requests for other chapters will legitimately return no data
 * until production access is granted.
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
