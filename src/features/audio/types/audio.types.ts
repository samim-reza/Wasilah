import type { VerseKey } from '@/features/quran/types/quran.types';

/** One item in the recitation queue. */
export interface AudioTrack {
  verseKey: VerseKey;
  url: string;
  chapterId: number;
  verseNumber: number;
}

export type RepeatMode =
  /** Play through and stop. */
  | 'off'
  /** Repeat the current ayah. */
  | 'one'
  /** Repeat the whole queue. */
  | 'all';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/**
 * What a loaded queue represents.
 *
 * Without this, "is the whole surah loaded?" can only be guessed from the
 * current track, and a finished single-ayah queue is indistinguishable from a
 * chapter queue paused on its first ayah — which made the reader's play-surah
 * button silently resume one ayah instead.
 */
export type QueueId = `chapter:${number}` | `ayah:${string}` | null;

export interface AudioState {
  state: PlaybackState;
  /** Identifies what is loaded, not merely what is playing. */
  queueId: QueueId;
  currentTrack: AudioTrack | null;
  /** Index within the queue, or -1 when nothing is queued. */
  currentIndex: number;
  queueLength: number;
  positionSeconds: number;
  durationSeconds: number;
  repeatMode: RepeatMode;
  playbackRate: number;
  error: unknown;
}

/** Playback speeds offered in the UI. */
export const playbackRates = [0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackRate = (typeof playbackRates)[number];
