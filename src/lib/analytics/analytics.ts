/**
 * Product analytics.
 *
 * Opt-in: nothing is captured until the user turns it on in settings. The
 * client is created lazily so that a user who never opts in never loads it.
 */
import PostHog from 'posthog-react-native';

import { env, isAnalyticsEnabled } from '@/config/env';
import { logger } from '@/lib/monitoring/logger';

import type { AnalyticsEventMap, AnalyticsEventName } from './events';

let client: PostHog | null = null;
let optedIn = false;

export async function initializeAnalytics(userOptedIn: boolean): Promise<void> {
  optedIn = userOptedIn;

  if (!isAnalyticsEnabled || !userOptedIn) {
    // Stop an already-running client if consent was withdrawn.
    client?.optOut();
    return;
  }

  if (client) {
    client.optIn();
    return;
  }

  try {
    client = new PostHog(env.posthogKey as string, {
      host: env.posthogHost || 'https://us.i.posthog.com',
      // Autocapture would record screen contents and touch targets, which for
      // this app means Quran text. Every event is explicit instead.
      captureAppLifecycleEvents: false,
      disabled: false,
    });
    logger.info('analytics.initialized');
  } catch (error) {
    logger.warn('analytics.initFailed', { error });
    client = null;
  }
}

export function trackEvent<N extends AnalyticsEventName>(
  name: N,
  properties: AnalyticsEventMap[N],
): void {
  if (!optedIn || !client) return;

  try {
    // Every payload in the catalogue is JSON-safe by construction; the cast
    // bridges our exact event types to PostHog's looser JSON signature.
    client.capture(name, properties as Record<string, string | number | boolean>);
  } catch (error) {
    // Analytics must never break a user flow.
    logger.warn('analytics.captureFailed', { name, error });
  }
}

/**
 * Associates events with a stable id. PostHog's own anonymous id is used until
 * this is called, so signed-out usage is never linked to an account.
 */
export function identifyUser(userId: string | null): void {
  if (!optedIn || !client) return;

  if (userId) client.identify(userId);
  else void client.reset();
}

export function setAnalyticsOptIn(value: boolean): void {
  optedIn = value;
  if (!client) return;
  if (value) client.optIn();
  else client.optOut();
}
