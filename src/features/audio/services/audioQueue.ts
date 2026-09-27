/**
 * Queue arithmetic for recitation playback.
 *
 * Pure functions over an index and a list, kept apart from the player so the
 * rules about what plays next — especially the repeat modes, which are easy to
 * get subtly wrong at the boundaries — can be tested without any audio
 * subsystem.
 */
import type { AudioTrack, RepeatMode } from '../types/audio.types';

export interface QueueState {
  tracks: AudioTrack[];
  currentIndex: number;
  repeatMode: RepeatMode;
  /** How many times each ayah is recited before moving on. At least 1. */
  repeatEach: number;
  /** How many times the whole queue is played. 0 means until stopped. */
  repeatRange: number;
  /** Completed recitations of the current ayah in this pass. */
  plays: number;
  /** Completed passes through the whole queue. */
  passes: number;
}

/** How a queue repeats, as chosen in the reader's play sheet. */
export interface RepeatOptions {
  repeatEach: number;
  repeatRange: number;
}

export const noRepeat: RepeatOptions = { repeatEach: 1, repeatRange: 1 };

export const emptyQueue: QueueState = {
  tracks: [],
  currentIndex: -1,
  repeatMode: 'off',
  ...noRepeat,
  plays: 0,
  passes: 0,
};

export function currentTrack(queue: QueueState): AudioTrack | null {
  return queue.tracks[queue.currentIndex] ?? null;
}

/**
 * The queue after the current ayah finishes NATURALLY, or null when playback
 * is over.
 *
 * Distinct from `nextIndex`: repeat-one replays the same ayah when it ends on
 * its own, but pressing "next" must still advance. Conflating the two makes the
 * skip button appear broken in repeat-one mode.
 *
 * The counters live in the returned state rather than in the player, so the
 * memorisation case — "each ayah three times, the whole passage twice" — is
 * decided here, where it can be tested without any audio.
 */
export function stepAfterCompletion(queue: QueueState): QueueState | null {
  if (queue.tracks.length === 0) return null;

  if (queue.repeatMode === 'one') return { ...queue, plays: queue.plays + 1 };

  const plays = queue.plays + 1;
  if (plays < Math.max(1, queue.repeatEach)) return { ...queue, plays };

  const next = queue.currentIndex + 1;
  if (next < queue.tracks.length) return { ...queue, currentIndex: next, plays: 0 };

  const passes = queue.passes + 1;
  const passesLeft = queue.repeatRange <= 0 || passes < queue.repeatRange;
  if (queue.repeatMode === 'all' || passesLeft) {
    return { ...queue, currentIndex: 0, plays: 0, passes };
  }
  return null;
}

/** The index `stepAfterCompletion` moves to, or null when playback is over. */
export function indexAfterCompletion(queue: QueueState): number | null {
  return stepAfterCompletion(queue)?.currentIndex ?? null;
}

/** The index for an explicit "next" press. */
export function nextIndex(queue: QueueState): number | null {
  if (queue.tracks.length === 0) return null;

  const next = queue.currentIndex + 1;
  if (next < queue.tracks.length) return next;

  return queue.repeatMode === 'all' ? 0 : null;
}

export function previousIndex(queue: QueueState): number | null {
  if (queue.tracks.length === 0) return null;

  const previous = queue.currentIndex - 1;
  if (previous >= 0) return previous;

  return queue.repeatMode === 'all' ? queue.tracks.length - 1 : null;
}

/**
 * Whether pressing "previous" should restart the current ayah instead of
 * stepping back.
 *
 * Matches the convention every music player uses: past a couple of seconds in,
 * "previous" means "start this again".
 */
export const RESTART_THRESHOLD_SECONDS = 3;

export function shouldRestartInsteadOfPrevious(positionSeconds: number): boolean {
  return positionSeconds > RESTART_THRESHOLD_SECONDS;
}

export function findTrackIndex(queue: QueueState, verseKey: string): number {
  return queue.tracks.findIndex((track) => track.verseKey === verseKey);
}

/** The track to prefetch, so the next ayah starts without a buffering gap. */
export function trackToPrefetch(queue: QueueState): AudioTrack | null {
  const next = indexAfterCompletion(queue);
  // No point prefetching a repeat of what is already loaded.
  if (next === null || next === queue.currentIndex) return null;
  return queue.tracks[next] ?? null;
}
