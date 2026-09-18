/**
 * Structured logging.
 *
 * Two rules drive the design:
 *   1. Production must never log user content. Personal notes, note bodies,
 *      search queries and precise coordinates are redacted before anything is
 *      emitted, because logs can end up in crash reports.
 *   2. Every log has a stable dot-separated event name so logs can be grepped
 *      and correlated with analytics events.
 */
import { isDevelopment } from '@/config/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Debug noise is useful locally and pure cost in production. */
const minimumLevel: LogLevel = isDevelopment ? 'debug' : 'warn';

/**
 * Context keys whose values must never reach a log sink. Matched case-
 * insensitively against the key name so `noteBody` and `note_body` both hit.
 */
const redactedKeyPattern =
  /(note|password|token|secret|email|query|latitude|longitude|coords|address)/i;

function redact(context: LogContext | undefined): LogContext | undefined {
  if (!context) return undefined;

  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (redactedKeyPattern.test(key)) {
      safe[key] = '[redacted]';
      continue;
    }
    // Errors do not survive JSON serialisation; keep the useful parts.
    if (value instanceof Error) {
      safe[key] = { name: value.name, message: value.message };
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

type Sink = (level: LogLevel, event: string, context?: LogContext) => void;

/** Additional sinks (Sentry breadcrumbs) register here at startup. */
const sinks: Sink[] = [];

export function registerLogSink(sink: Sink): void {
  sinks.push(sink);
}

function emit(level: LogLevel, event: string, context?: LogContext): void {
  if (levelRank[level] < levelRank[minimumLevel]) return;

  const safeContext = redact(context);

  if (isDevelopment) {
    const method = level === 'debug' ? 'log' : level;
    // eslint-disable-next-line no-console -- the development console is the sink
    console[method](`[${level}] ${event}`, safeContext ?? '');
  }

  for (const sink of sinks) {
    try {
      sink(level, event, safeContext);
    } catch {
      // A failing sink must never break the code that logged.
    }
  }
}

export const logger = {
  debug: (event: string, context?: LogContext) => emit('debug', event, context),
  info: (event: string, context?: LogContext) => emit('info', event, context),
  warn: (event: string, context?: LogContext) => emit('warn', event, context),
  error: (event: string, context?: LogContext) => emit('error', event, context),
};
