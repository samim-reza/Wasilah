/**
 * Crash and error reporting.
 *
 * Wrapped rather than used directly for two reasons: Sentry must be a complete
 * no-op when no DSN is configured (so the app runs for a contributor who has
 * not set one up), and every event passes through a scrubber first.
 *
 * What is NEVER sent: note bodies, search queries, precise coordinates, auth
 * tokens, or which ayahs a person reads. A crash report should say what broke,
 * not what someone was reading.
 */
import * as Sentry from '@sentry/react-native';

import { env, isProduction, isSentryEnabled } from '@/config/env';
import { logger, registerLogSink } from './logger';

let initialized = false;

/** Query/body keys stripped from breadcrumbs and request data. */
const SENSITIVE_KEYS = /(note|query|q|password|token|secret|lat|lon|latitude|longitude)/i;

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.request?.query_string) delete event.request.query_string;
  if (event.user) {
    // Keep the id for grouping; drop anything that identifies a person.
    event.user = { id: event.user.id };
  }

  event.breadcrumbs = event.breadcrumbs?.map((crumb) => {
    if (!crumb.data) return crumb;

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(crumb.data)) {
      data[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : value;
    }
    return { ...crumb, data };
  });

  return event;
}

export function initializeMonitoring(): void {
  if (initialized || !isSentryEnabled) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.appEnv,
    // Full traces in production would be expensive and are not needed; a 10%
    // sample is enough to spot a regression in screen-open latency.
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    // Session replay is not enabled: it would record Quran content and notes.
    enableAutoSessionTracking: true,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });

  // Mirror warnings and errors into Sentry as breadcrumbs so a crash arrives
  // with the app's own event trail attached.
  registerLogSink((level, event, context) => {
    if (level !== 'warn' && level !== 'error') return;
    Sentry.addBreadcrumb({
      category: 'app',
      level: level === 'error' ? 'error' : 'warning',
      message: event,
      data: context,
    });
  });

  initialized = true;
  logger.info('monitoring.initialized', { environment: env.appEnv });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, { extra: context });
}

/**
 * Associates events with a user by id only. Email and display name are
 * deliberately not sent.
 */
export function setMonitoringUser(userId: string | null): void {
  if (!initialized) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
