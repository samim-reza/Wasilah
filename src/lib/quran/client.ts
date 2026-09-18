/**
 * The only place the app talks to Quran content.
 *
 * Requests go to our Supabase edge proxy, never directly to Quran Foundation —
 * the Content API requires a client secret that cannot live in a mobile bundle.
 * See `supabase/functions/quran-proxy` for the server half.
 *
 *     hook → service → THIS CLIENT → edge proxy → Quran Foundation API
 *
 * Nothing above this layer should ever construct a URL or know that the proxy
 * exists.
 */
import { env } from '@/config/env';
import { AppError } from '@/lib/api/errors';
import { httpRequest } from '@/lib/api/httpClient';
import { logger } from '@/lib/monitoring/logger';

const PROXY_BASE_URL = `${env.supabaseUrl}/functions/v1/quran-proxy`;

export type QueryParams = Record<
  string,
  string | number | boolean | (string | number)[] | undefined | null
>;

/**
 * Serialises params the way the Content API expects: repeated values are
 * comma-joined (`translations=131,161`), and empty values are omitted entirely
 * so they do not become `?field=` and confuse the upstream parser.
 */
function buildQueryString(params: QueryParams | undefined): string {
  if (!params) return '';

  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      search.set(key, value.join(','));
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

interface ProxyErrorBody {
  error?: { code?: string; message?: string; status?: number };
}

/**
 * Distinguishes "Quran Foundation is not set up yet" from a genuine failure.
 *
 * Without this the two most common first-run states — the edge function not
 * deployed, and its credentials not set — both surface as a bare 404 or 502,
 * which reads as a bug rather than an unfinished setup step. Getting this wrong
 * costs whoever sets the project up next a long and pointless debugging session.
 */
function asConfigurationError(error: AppError, path: string): AppError {
  // Supabase returns 404 for a function that was never deployed. A deployed
  // proxy answers an unknown path with its own `route_not_allowed` body, and
  // every path this client builds is allowlisted — so a plain 404 here means
  // the function itself is missing.
  const isFunctionMissing =
    error.kind === 'not_found' && !error.message.includes('route_not_allowed');

  // The proxy reports a missing or rejected credential as a bad gateway.
  const isUpstreamUnconfigured =
    error.kind === 'server' && error.message.includes('upstream_unavailable');

  if (!isFunctionMissing && !isUpstreamUnconfigured) return error;

  return new AppError('not_configured', error.message, {
    cause: error,
    context: { path },
    retryable: false,
  });
}

export interface QuranRequestOptions {
  /** Cancels a superseded request, e.g. a search the user has typed past. */
  signal?: AbortSignal;
  /** Search is latency-sensitive; structure endpoints can afford to wait. */
  timeoutMs?: number;
}

/**
 * Performs one Content API request through the proxy.
 *
 * `path` is the Quran Foundation path without the `/content/api/v4` prefix,
 * e.g. `/verses/by_chapter/2`.
 */
export async function quranRequest<T>(
  path: string,
  params?: QueryParams,
  options: QuranRequestOptions = {},
): Promise<T> {
  const url = `${PROXY_BASE_URL}${path}${buildQueryString(params)}`;

  try {
    return await httpRequest<T>(url, {
      headers: {
        // The gateway requires the anon key even though the function itself
        // does not verify a user JWT.
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
      },
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  } catch (error) {
    if (error instanceof AppError) {
      const resolved = asConfigurationError(error, path);
      logger.warn('quran.requestFailed', { path, kind: resolved.kind });
      throw resolved;
    }
    throw error;
  }
}

/**
 * Extracts the proxy's structured error message, for the rare case a caller
 * wants to surface upstream detail (e.g. the pre-live "only Surah 1–2" hint)
 * rather than the generic translated message.
 */
export function proxyErrorMessage(error: unknown): string | null {
  if (!(error instanceof AppError)) return null;
  const body = error.context?.['body'] as ProxyErrorBody | undefined;
  return body?.error?.message ?? null;
}
