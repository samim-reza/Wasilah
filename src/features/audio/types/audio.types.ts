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

export interface AudioState {
  state: PlaybackState;
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
