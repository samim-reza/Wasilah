/**
 * Minimal fetch wrapper shared by every outbound HTTP call.
 *
 * Provides the three things bare `fetch` lacks and that every caller would
 * otherwise reimplement: a hard timeout, normalised `AppError`s, and bounded
 * retry with exponential backoff for transient failures.
 */
import { AppError, kindFromStatus, toAppError } from './errors';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  /** Abort and fail with a `timeout` error after this many ms. */
  timeoutMs?: number;
  /** Retry attempts for transient failures, on top of the initial request. */
  retries?: number;
  /** Lets a caller cancel, e.g. a superseded search request. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const BASE_BACKOFF_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Combines the caller's signal with our timeout signal, so whichever fires
 * first aborts the request. `AbortSignal.any` is not available in Hermes.
 */
function createAbortController(
  timeoutMs: number,
  external?: AbortSignal,
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  external?.addEventListener('abort', onExternalAbort);

  return {
    controller,
    cleanup: () => {
      clearTimeout(timeoutId);
      external?.removeEventListener('abort', onExternalAbort);
    },
  };
}

async function parseErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return '';
  }
}

export async function httpRequest<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    signal,
  } = options;

  let lastError: AppError | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    // A caller-initiated abort is final — never retry past it.
    if (signal?.aborted) {
      throw new AppError('timeout', 'Request cancelled by caller');
    }

    const { controller, cleanup } = createAbortController(timeoutMs, signal);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const kind = kindFromStatus(response.status);
        const retryAfterHeader = response.headers.get('retry-after');
        const detail = await parseErrorBody(response);

        throw new AppError(kind, `HTTP ${response.status}: ${detail}`, {
          context: { url, status: response.status },
          retryAfterSeconds: retryAfterHeader ? Number(retryAfterHeader) : undefined,
        });
      }

      // 204 and empty bodies are legitimate; callers type those as void.
      if (response.status === 204) return undefined as T;

      const text = await response.text();
      if (!text) return undefined as T;

      try {
        return JSON.parse(text) as T;
      } catch (error) {
        throw new AppError('invalid_response', 'Response was not valid JSON', {
          cause: error,
          context: { url },
        });
      }
    } catch (error) {
      lastError = toAppError(error);

      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !lastError.retryable) throw lastError;

      // Honour Retry-After when the server sent one, otherwise back off
      // exponentially so a struggling service is not hammered.
      const backoff =
        lastError.retryAfterSeconds != null
          ? lastError.retryAfterSeconds * 1000
          : BASE_BACKOFF_MS * 2 ** attempt;

      await delay(backoff);
    } finally {
      cleanup();
    }
  }

  throw lastError ?? new AppError('unknown', 'Request failed');
}
