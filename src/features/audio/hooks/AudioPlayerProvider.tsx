/**
 * The app's single audio player.
 *
 * One player instance for the whole app, provided via context. Creating a
 * player per screen would mean two recitations could overlap — the failure
 * mode is unmistakable and, for Quran audio, unacceptable.
 *
 * This module knows nothing about the Quran API: it is handed tracks with URLs
 * and plays them. `useAyahAudio` is what turns an ayah into a track.
 *
 * Note: this file previously carried a blanket `react-hooks/immutability`
 * exemption to allow `player.playbackRate = x`. That rule was right and the
 * assignment was a genuine bug — the native object has no setter. The exemption
 * is gone; if it seems necessary again, the mutation is probably the problem.
 */
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, preload } from 'expo-audio';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { trackEvent } from '@/lib/analytics/analytics';
import { logger } from '@/lib/monitoring/logger';

import {
  currentTrack as getCurrentTrack,
  emptyQueue,
  findTrackIndex,
  indexAfterCompletion,
  nextIndex,
  previousIndex,
  shouldRestartInsteadOfPrevious,
  trackToPrefetch,
  type QueueState,
} from '../services/audioQueue';
import type { AudioState, AudioTrack, RepeatMode } from '../types/audio.types';

export interface AudioControls extends AudioState {
  /** Loads a queue and starts at `startIndex`. */
  playQueue: (tracks: AudioTrack[], startIndex?: number) => void;
  /** Plays a single ayah, replacing any queue. */
  playTrack: (track: AudioTrack) => void;
  /** Jumps to an ayah already in the queue. */
  playVerse: (verseKey: string) => void;
  toggle: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setPlaybackRate: (rate: number) => void;
}

const AudioContext = createContext<AudioControls | null>(null);

/** How often the player reports progress. 500ms is smooth without waking JS constantly. */
const STATUS_UPDATE_INTERVAL_MS = 500;

/**
 * Sets playback speed on the native player.
 *
 * `player.playbackRate = x` is typed as writable and is what expo-audio's own
 * documentation shows, but the native SharedObject exposes only a getter — the
 * assignment throws `Cannot assign to property 'playbackRate' which has only a
 * getter` on a real device. `setPlaybackRate` is the working API.
 *
 * Pitch correction is requested at high quality deliberately. Changing speed
 * without it shifts the reciter's pitch, which for Quran recitation sounds
 * wrong in a way that matters more than the small extra processing cost.
 */
function applyPlaybackRate(
  player: { setPlaybackRate: (rate: number, quality?: 'low' | 'medium' | 'high') => void },
  rate: number,
): void {
  player.setPlaybackRate(rate, 'high');
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(undefined, { updateInterval: STATUS_UPDATE_INTERVAL_MS });
  const status = useAudioPlayerStatus(player);

  const [queue, setQueue] = useState<QueueState>(emptyQueue);
  const [playbackRate, setRateState] = useState(1);
  const [error, setError] = useState<unknown>(null);

  // Mirrors the queue for the completion and control callbacks, which must keep
  // a stable identity so the player's event subscription is not torn down and
  // rebuilt on every queue change. Updated in an effect, never during render.
  const queueRef = useRef(queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Recitation should keep playing when the screen locks, and should duck
  // rather than kill whatever else is playing.
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    }).catch((audioModeError: unknown) => {
      logger.warn('audio.modeSetupFailed', { error: audioModeError });
    });
  }, []);

  const loadIndex = useCallback(
    (index: number, tracks: AudioTrack[], autoPlay: boolean) => {
      const track = tracks[index];
      if (!track) return;

      try {
        player.replace({ uri: track.url });
        applyPlaybackRate(player, playbackRate);
        if (autoPlay) player.play();
        setError(null);
      } catch (replaceError) {
        logger.warn('audio.loadFailed', { error: replaceError });
        setError(replaceError);
      }
    },
    [player, playbackRate],
  );

  const playQueue = useCallback(
    (tracks: AudioTrack[], startIndex = 0) => {
      if (tracks.length === 0) return;

      const index = Math.min(Math.max(0, startIndex), tracks.length - 1);
      setQueue((current) => ({ ...current, tracks, currentIndex: index }));
      loadIndex(index, tracks, true);

      trackEvent('audio_started', { source: tracks.length > 1 ? 'queue' : 'single' });
    },
    [loadIndex],
  );

  const playTrack = useCallback((track: AudioTrack) => playQueue([track], 0), [playQueue]);

  const playVerse = useCallback(
    (verseKey: string) => {
      const index = findTrackIndex(queueRef.current, verseKey);
      if (index === -1) return;

      setQueue((current) => ({ ...current, currentIndex: index }));
      loadIndex(index, queueRef.current.tracks, true);
    },
    [loadIndex],
  );

  const toggle = useCallback(() => {
    if (status.playing) player.pause();
    else player.play();
  }, [player, status.playing]);

  const pause = useCallback(() => player.pause(), [player]);

  const stop = useCallback(() => {
    player.pause();
    player.seekTo(0);
    setQueue(emptyQueue);
  }, [player]);

  const next = useCallback(() => {
    const index = nextIndex(queueRef.current);
    if (index === null) {
      player.pause();
      return;
    }
    setQueue((current) => ({ ...current, currentIndex: index }));
    loadIndex(index, queueRef.current.tracks, true);
  }, [player, loadIndex]);

  const previous = useCallback(() => {
    // Past a few seconds in, "previous" restarts the current ayah — the
    // convention every media player follows.
    if (shouldRestartInsteadOfPrevious(status.currentTime)) {
      player.seekTo(0);
      return;
    }

    const index = previousIndex(queueRef.current);
    if (index === null) {
      player.seekTo(0);
      return;
    }
    setQueue((current) => ({ ...current, currentIndex: index }));
    loadIndex(index, queueRef.current.tracks, true);
  }, [player, status.currentTime, loadIndex]);

  const seekTo = useCallback(
    (seconds: number) => {
      void player.seekTo(Math.max(0, seconds));
    },
    [player],
  );

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setQueue((current) => ({ ...current, repeatMode: mode }));
  }, []);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      setRateState(rate);
      applyPlaybackRate(player, rate);
    },
    [player],
  );

  // Advance when a track finishes. `didJustFinish` fires once per completion,
  // so this cannot double-advance.
  useEffect(() => {
    if (!status.didJustFinish) return;

    const index = indexAfterCompletion(queueRef.current);
    if (index === null) {
      trackEvent('audio_completed', { duration_seconds: Math.round(status.duration ?? 0) });
      return;
    }

    setQueue((current) => ({ ...current, currentIndex: index }));
    loadIndex(index, queueRef.current.tracks, true);
  }, [status.didJustFinish, status.duration, loadIndex]);

  // Warm the next ayah's audio while the current one plays, so the transition
  // between ayahs has no audible gap.
  useEffect(() => {
    const upcoming = trackToPrefetch(queue);
    if (!upcoming) return;

    void preload({ uri: upcoming.url }).catch(() => {
      // Prefetch is an optimisation; a failure just means a short buffer later.
    });
  }, [queue]);

  const value = useMemo<AudioControls>(() => {
    const track = getCurrentTrack(queue);

    return {
      state: error
        ? 'error'
        : status.playing
          ? 'playing'
          : status.isBuffering
            ? 'loading'
            : track
              ? 'paused'
              : 'idle',
      currentTrack: track,
      currentIndex: queue.currentIndex,
      queueLength: queue.tracks.length,
      positionSeconds: status.currentTime ?? 0,
      durationSeconds: status.duration ?? 0,
      repeatMode: queue.repeatMode,
      playbackRate,
      error,
      playQueue,
      playTrack,
      playVerse,
      toggle,
      pause,
      stop,
      next,
      previous,
      seekTo,
      setRepeatMode,
      setPlaybackRate,
    };
  }, [
    queue,
    status.playing,
    status.isBuffering,
    status.currentTime,
    status.duration,
    playbackRate,
    error,
    playQueue,
    playTrack,
    playVerse,
    toggle,
    pause,
    stop,
    next,
    previous,
    seekTo,
    setRepeatMode,
    setPlaybackRate,
  ]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioControls {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used inside <AudioPlayerProvider>');
  return context;
}
