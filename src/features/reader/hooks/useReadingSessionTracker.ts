/**
 * Tracks an in-progress reading session.
 *
 * Measuring "time spent reading" honestly is harder than it looks. This hook
 * takes three deliberate positions:
 *
 *   • The clock pauses when the app is backgrounded. A phone left face-down is
 *     not reading time, and counting it would let a minutes-based goal be met
 *     by doing nothing.
 *   • Ayahs are counted once each. Scrolling back over an ayah does not add to
 *     the total, so a session cannot be inflated by flicking up and down.
 *   • The session is flushed on unmount and on background, not on an interval,
 *     so a user who leaves mid-surah still has their reading recorded.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  useRecordReading,
  type RecordReadingResult,
} from '@/features/streak/hooks/useRecordReading';
import { trackEvent } from '@/lib/analytics/analytics';
import { logger } from '@/lib/monitoring/logger';
import type { SessionSource } from '@/lib/supabase/database.types';

interface SessionAccumulator {
  startedAt: Date;
  /** Foreground milliseconds accumulated so far. */
  activeMs: number;
  /** When the current foreground stretch began; null while backgrounded. */
  activeSince: number | null;
  /** Verse keys seen, so each ayah counts once. */
  seenVerses: Set<string>;
  chapterId: number | null;
  firstVerse: number | null;
  lastVerse: number | null;
}

function createAccumulator(): SessionAccumulator {
  return {
    startedAt: new Date(),
    activeMs: 0,
    activeSince: Date.now(),
    seenVerses: new Set(),
    chapterId: null,
    firstVerse: null,
    lastVerse: null,
  };
}

export interface ReadingSessionTracker {
  /** Called as ayahs become visible. Safe to call repeatedly for the same ayah. */
  markVerseRead: (chapterId: number, verseNumber: number) => void;
  /** Ends and records the session. Called automatically on unmount. */
  flush: () => Promise<RecordReadingResult | null>;
  /** Discards without recording, e.g. when the user was only browsing. */
  abandon: () => void;
}

export function useReadingSessionTracker(source: SessionSource = 'reader'): ReadingSessionTracker {
  const recordReading = useRecordReading();
  const sessionRef = useRef<SessionAccumulator | null>(null);
  const isFlushingRef = useRef(false);

  const ensureSession = useCallback((): SessionAccumulator => {
    sessionRef.current ??= createAccumulator();
    return sessionRef.current;
  }, []);

  const markVerseRead = useCallback(
    (chapterId: number, verseNumber: number) => {
      const session = ensureSession();
      const key = `${chapterId}:${verseNumber}`;

      if (session.seenVerses.has(key)) return;
      session.seenVerses.add(key);

      session.chapterId ??= chapterId;
      // Only track the range within a single chapter; a session spanning
      // chapters records the first one and an accurate verse count.
      if (session.chapterId === chapterId) {
        session.firstVerse =
          session.firstVerse === null ? verseNumber : Math.min(session.firstVerse, verseNumber);
        session.lastVerse =
          session.lastVerse === null ? verseNumber : Math.max(session.lastVerse, verseNumber);
      }
    },
    [ensureSession],
  );

  const flush = useCallback(async (): Promise<RecordReadingResult | null> => {
    const session = sessionRef.current;
    if (!session || isFlushingRef.current) return null;

    isFlushingRef.current = true;
    sessionRef.current = null;

    try {
      // Close out any open foreground stretch.
      const activeMs =
        session.activeMs + (session.activeSince ? Date.now() - session.activeSince : 0);

      const endedAt = new Date(session.startedAt.getTime() + activeMs);

      return await recordReading({
        startedAt: session.startedAt,
        endedAt,
        versesRead: session.seenVerses.size,
        chapterId: session.chapterId,
        startVerse: session.firstVerse,
        endVerse: session.lastVerse,
        source,
      });
    } catch (error) {
      logger.warn('reader.sessionFlushFailed', { error });
      return null;
    } finally {
      isFlushingRef.current = false;
    }
  }, [recordReading, source]);

  const abandon = useCallback(() => {
    sessionRef.current = null;
  }, []);

  // Pause the clock in the background, and flush so a session is not lost if
  // the OS kills the app while it is away.
  useEffect(() => {
    function handleAppStateChange(state: AppStateStatus) {
      const session = sessionRef.current;
      if (!session) return;

      if (state === 'active') {
        session.activeSince ??= Date.now();
        return;
      }

      if (session.activeSince) {
        session.activeMs += Date.now() - session.activeSince;
        session.activeSince = null;
      }
      void flush();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [flush]);

  // Leaving the reader ends the session.
  useEffect(() => {
    trackEvent('reading_session_started', { source });
    return () => {
      void flush();
    };
    // Intentionally runs once: the tracker's lifetime is the screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { markVerseRead, flush, abandon };
}
