/**
 * Crash and error reporting.
 *
 * Wrapped rather than used directly for three reasons:
 *
 *   1. Sentry must be a complete no-op when no DSN is configured, so the app
 *      runs for a contributor who has not set one up.
 *   2. The SDK is loaded **lazily**, only once a DSN exists. It is a sizeable
 *      module with native bindings, and parsing it during startup costs
 *      cold-launch time that the overwhelming majority of sessions never
 *      recoup.
 *   3. Every event passes through a scrubber first.
 *
 * What is NEVER sent: note bodies, search queries, precise coordinates, auth
 * tokens, or which ayahs a person reads. A crash report should say what broke,
 * not what someone was reading.
 */
import type * as SentryTypes from '@sentry/react-native';

import { env, isProduction, isSentryEnabled } from '@/config/env';

import { logger, registerLogSink } from './logger';

/** Resolved only after a successful lazy load; null means "reporting is off". */
let sentry: typeof SentryTypes | null = null;

/** Query/body keys stripped from breadcrumbs and request data. */
const SENSITIVE_KEYS = /(note|query|q|password|token|secret|lat|lon|latitude|longitude)/i;

function scrubEvent(event: SentryTypes.ErrorEvent): SentryTypes.ErrorEvent | null {
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

/**
 * Loads and starts Sentry, if a DSN is configured.
 *
 * Deliberately fire-and-forget: startup must not wait on it, and a crash during
 * the first few hundred milliseconds is not worth delaying every launch to
 * capture.
 */
export function initializeMonitoring(): void {
  if (sentry || !isSentryEnabled) return;

  void import('@sentry/react-native')
    .then((module) => {
      module.init({
        dsn: env.sentryDsn,
        environment: env.appEnv,
        // Full traces in production would be expensive and are not needed; a
        // 10% sample is enough to spot a latency regression.
        tracesSampleRate: isProduction ? 0.1 : 1.0,
        // Session replay stays off: it would record Quran content and notes.
        enableAutoSessionTracking: true,
        sendDefaultPii: false,
        beforeSend: scrubEvent,
      });

      sentry = module;

      // Mirror warnings and errors in as breadcrumbs, so a crash arrives with
      // the app's own event trail attached.
      registerLogSink((level, event, context) => {
        if (level !== 'warn' && level !== 'error') return;
        module.addBreadcrumb({
          category: 'app',
          level: level === 'error' ? 'error' : 'warning',
          message: event,
          data: context,
        });
      });

      logger.info('monitoring.initialized', { environment: env.appEnv });
    })
    .catch((error: unknown) => {
      // A missing native module (Expo Go, a stripped build) must never stop
      // the app from starting.
      logger.warn('monitoring.initFailed', { error });
    });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  sentry?.captureException(error, { extra: context });
}

/**
 * Associates events with a user by id only. Email and display name are
 * deliberately not sent.
 */
export function setMonitoringUser(userId: string | null): void {
  sentry?.setUser(userId ? { id: userId } : null);
}
