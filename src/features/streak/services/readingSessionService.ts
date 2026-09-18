/**
 * Recording reading activity.
 *
 * The single entry point for "the user read something". It works identically
 * online and offline: the write is always queued first, then flushed. That
 * ordering is what guarantees a session is never lost to a connection that
 * dropped mid-request, and it means the UI can update optimistically with no
 * special offline branch.
 */
import { GUEST_USER_ID, enqueue } from '@/lib/offline/syncQueue';
import { flushQueue } from '@/lib/offline/syncProcessor';
import { logger } from '@/lib/monitoring/logger';
import { toLocalDate, safeTimezone, getDeviceTimezone } from '@/lib/datetime/localDate';
import type { ReadingSessionPayload } from '@/lib/offline/types';
import type { SessionSource } from '@/lib/supabase/database.types';

export interface ReadingSessionInput {
  startedAt: Date;
  endedAt: Date;
  versesRead: number;
  pagesRead?: number;
  rukusRead?: number;
  chapterId?: number | null;
  startVerse?: number | null;
  endVerse?: number | null;
  source?: SessionSource;
  /** Overridable for tests; defaults to the device timezone. */
  timezone?: string;
}

/**
 * Generates the idempotency key for a session.
 *
 * Random rather than derived from the session's contents: two genuinely
 * separate readings of the same ayah range, minutes apart, must both count.
 */
function createClientSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildSessionPayload(input: ReadingSessionInput): ReadingSessionPayload {
  const timezone = safeTimezone(input.timezone ?? getDeviceTimezone());

  return {
    clientSessionId: createClientSessionId(),
    startedAt: input.startedAt.toISOString(),
    endedAt: input.endedAt.toISOString(),
    // The day is decided HERE, on the device, where the user's timezone is
    // known. Deriving it server-side from the timestamp would misattribute
    // late-night reading for most of the world.
    localDate: toLocalDate(input.endedAt, timezone),
    timezone,
    versesRead: Math.max(0, Math.round(input.versesRead)),
    pagesRead: Math.max(0, input.pagesRead ?? 0),
    rukusRead: Math.max(0, input.rukusRead ?? 0),
    chapterId: input.chapterId ?? null,
    startVerse: input.startVerse ?? null,
    endVerse: input.endVerse ?? null,
    source: input.source ?? 'reader',
  };
}

/**
 * Queues a session and attempts an immediate flush.
 *
 * Returns the payload so the caller can update local state optimistically
 * without waiting for the network.
 */
export async function recordReadingSession(
  input: ReadingSessionInput,
  userId: string | null,
): Promise<ReadingSessionPayload> {
  const payload = buildSessionPayload(input);

  // A guest's reading is queued under a placeholder id and adopted when they
  // sign in, so nothing read before creating an account is thrown away.
  await enqueue({ type: 'reading_session', data: payload }, userId ?? GUEST_USER_ID);

  if (userId) {
    // Fire and forget: the queue is durable, so a failure here just means the
    // flush happens on the next foreground or reconnect.
    void flushQueue(userId).catch((error: unknown) => {
      logger.debug('habit.immediateFlushFailed', { error });
    });
  }

  logger.debug('habit.sessionRecorded', {
    versesRead: payload.versesRead,
    source: payload.source,
  });

  return payload;
}

/**
 * The minimum meaningful session length, in seconds.
 *
 * Guards against a mis-tap being recorded as reading. Short enough that
 * genuinely reading one short ayah still counts.
 */
export const MIN_SESSION_SECONDS = 5;

/**
 * Caps a session's duration.
 *
 * A user who opens the reader and puts the phone down has not read for six
 * hours. Sessions are ended by the tracker on background/blur, but a device
 * that is killed without firing those events can otherwise produce an absurd
 * span.
 */
export const MAX_SESSION_SECONDS = 2 * 60 * 60;

export function clampSessionDuration(startedAt: Date, endedAt: Date): Date {
  const durationSeconds = (endedAt.getTime() - startedAt.getTime()) / 1000;
  if (durationSeconds <= MAX_SESSION_SECONDS) return endedAt;
  return new Date(startedAt.getTime() + MAX_SESSION_SECONDS * 1000);
}
