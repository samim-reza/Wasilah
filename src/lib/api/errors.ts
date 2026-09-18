/**
 * The application's error taxonomy.
 *
 * Every failure that crosses a service boundary is normalised into an
 * `AppError` so UI code can branch on a small, stable set of kinds instead of
 * inspecting fetch/Supabase/QF error shapes. The `userMessageKey` points at an
 * i18n string, keeping technical detail out of what the user reads.
 */
export type AppErrorKind =
  | 'offline'
  | 'timeout'
  | 'rate_limited'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_response'
  | 'server'
  | 'permission_denied'
  | 'audio_unavailable'
  | 'storage'
  /** The app is running, but a required backend piece is not configured yet. */
  | 'not_configured'
  | 'unknown';

export interface AppErrorOptions {
  /** Original error, preserved for monitoring but never shown to the user. */
  cause?: unknown;
  /** Extra diagnostic context. Redacted by the logger before it is emitted. */
  context?: Record<string, unknown>;
  /** Whether retrying the same request could plausibly succeed. */
  retryable?: boolean;
  /** Seconds to wait before retrying, when the server told us. */
  retryAfterSeconds?: number;
}

/** i18n keys for each kind, so a new error kind cannot ship without a message. */
const userMessageKeys: Record<AppErrorKind, string> = {
  offline: 'errors.offline',
  timeout: 'errors.timeout',
  rate_limited: 'errors.rateLimited',
  unauthorized: 'errors.unauthorized',
  forbidden: 'errors.forbidden',
  not_found: 'errors.notFound',
  invalid_response: 'errors.invalidResponse',
  server: 'errors.server',
  permission_denied: 'errors.permissionDenied',
  audio_unavailable: 'errors.audioUnavailable',
  storage: 'errors.storage',
  not_configured: 'errors.notConfigured',
  unknown: 'errors.unknown',
};

/** Kinds worth retrying automatically; the rest need the user to act. */
const retryableKinds: ReadonlySet<AppErrorKind> = new Set<AppErrorKind>([
  'offline',
  'timeout',
  'rate_limited',
  'server',
]);

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly userMessageKey: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
  readonly context?: Record<string, unknown>;

  constructor(kind: AppErrorKind, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.kind = kind;
    this.userMessageKey = userMessageKeys[kind];
    this.retryable = options.retryable ?? retryableKinds.has(kind);
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.context = options.context;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Maps an HTTP status onto the closest error kind. */
export function kindFromStatus(status: number): AppErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 408) return 'timeout';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * Last-resort normaliser for values caught in a `catch` block, which TypeScript
 * types as `unknown` and which may be anything at all.
 */
export function toAppError(value: unknown, fallbackMessage = 'Unexpected error'): AppError {
  if (isAppError(value)) return value;

  if (value instanceof Error) {
    // Fetch surfaces connectivity failures as a bare TypeError with this text.
    const isNetworkFailure =
      value.name === 'TypeError' && /network|fetch|connection/i.test(value.message);
    if (isNetworkFailure) {
      return new AppError('offline', value.message, { cause: value });
    }
    if (value.name === 'AbortError') {
      return new AppError('timeout', value.message, { cause: value });
    }
    return new AppError('unknown', value.message, { cause: value });
  }

  return new AppError('unknown', fallbackMessage, { cause: value });
}
