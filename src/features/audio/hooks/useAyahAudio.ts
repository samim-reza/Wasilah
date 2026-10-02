/**
 * Turns ayahs into playable tracks.
 *
 * The seam between the Quran feature and the audio feature: this is the only
 * place that knows both that an ayah has a recitation URL and that the player
 * takes tracks. The player stays ignorant of the Quran API, and the Quran
 * service stays ignorant of playback.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { queryKeys } from '@/lib/api/queryKeys';
import { parseVerseKey } from '@/features/quran/utils/verseKey';
import {
  fetchAyahRecitation,
  fetchChapterRecitation,
} from '@/features/quran/services/quranService';
import type { VerseKey } from '@/features/quran/types/quran.types';

import { useAudio } from './AudioPlayerProvider';
import {
  cancelDownload,
  downloadChapter,
  downloadState,
  downloadedTracks,
  removeDownload,
  subscribeToDownload,
  type DownloadState,
} from '../services/audioDownloads';
import { noRepeat, type RepeatOptions } from '../services/audioQueue';
import type { AudioTrack } from '../types/audio.types';

function toTrack(
  verseKey: VerseKey,
  url: string,
  segments: number[][] | null = null,
): AudioTrack | null {
  const address = parseVerseKey(verseKey);
  if (!address) return null;

  return {
    verseKey,
    url,
    chapterId: address.chapterId,
    verseNumber: address.verseNumber,
    segments,
  };
}

/** A day: the list of URLs for a surah's recitation does not change. */
const CHAPTER_AUDIO_STALE_MS = 24 * 60 * 60 * 1000;

async function loadChapterTracks(recitationId: number, chapterId: number): Promise<AudioTrack[]> {
  const files = await fetchChapterRecitation(recitationId, chapterId);
  return files
    .map((file) => toTrack(file.verseKey, file.url, file.segments))
    .filter((track): track is AudioTrack => track !== null);
}

/**
 * Loads every ayah's audio for a chapter.
 *
 * One request for the whole surah rather than one per ayah: the response is a
 * list of URLs, not audio data, so it is small, and having the full list up
 * front is what allows continuous playback and prefetching.
 */
export function useChapterAudio(recitationId: number, chapterId: number | null) {
  return useQuery({
    queryKey: queryKeys.audio.chapterRecitation(recitationId, chapterId ?? 0),
    queryFn: () => loadChapterTracks(recitationId, chapterId as number),
    enabled: chapterId !== null && chapterId > 0,
    staleTime: CHAPTER_AUDIO_STALE_MS,
  });
}

export interface UseAyahPlaybackResult {
  /** Plays one ayah on its own. Rejects when the ayah has no recitation. */
  playAyah: (verseKey: VerseKey) => Promise<void>;
  /** Plays a chapter from a given ayah onwards. */
  playFrom: (chapterId: number, verseKey: VerseKey) => Promise<void>;
  /**
   * Plays ayahs `fromVerse` to `toVerse` of a chapter, inclusive, repeated as
   * asked. The queue is still identified as the chapter's, so the reader
   * treats it as "this surah is playing".
   */
  playRange: (
    chapterId: number,
    fromVerse: number,
    toVerse: number,
    repeat?: RepeatOptions,
  ) => Promise<void>;
  isPlayingVerse: (verseKey: VerseKey) => boolean;
}

export function useAyahPlayback(recitationId: number): UseAyahPlaybackResult {
  const audio = useAudio();
  const queryClient = useQueryClient();

  // A downloaded surah plays from the device, with no network at all.
  // Otherwise through the query cache, so pressing play again — or repeating
  // a passage — reuses the list already fetched instead of waiting on it.
  const chapterTracks = useCallback(
    async (chapterId: number) =>
      (await downloadedTracks(recitationId, chapterId)) ??
      queryClient.fetchQuery({
        queryKey: queryKeys.audio.chapterRecitation(recitationId, chapterId),
        queryFn: () => loadChapterTracks(recitationId, chapterId),
        staleTime: CHAPTER_AUDIO_STALE_MS,
      }),
    [queryClient, recitationId],
  );

  const playAyah = useCallback(
    async (verseKey: VerseKey) => {
      const address = parseVerseKey(verseKey);
      const local = address ? await downloadedTracks(recitationId, address.chapterId) : null;
      const downloaded = local?.find((track) => track.verseKey === verseKey);
      if (downloaded) {
        audio.playTrack(downloaded);
        return;
      }

      // Single-ayah playback fetches just that file, so tapping the play icon
      // on one ayah does not pull the whole surah's audio list.
      const file = await fetchAyahRecitation(recitationId, verseKey);
      const track = file ? toTrack(verseKey, file.url, file.segments) : null;
      // Thrown, not swallowed: a silent return is what made a missing
      // recitation look like a play button that did nothing.
      if (!track) throw new Error(`No recitation for ${verseKey}`);

      audio.playTrack(track);
    },
    [recitationId, audio],
  );

  const playFrom = useCallback(
    async (chapterId: number, verseKey: VerseKey) => {
      const tracks = await chapterTracks(chapterId);

      const startIndex = Math.max(
        0,
        tracks.findIndex((track) => track.verseKey === verseKey),
      );
      audio.playQueue(tracks, startIndex, `chapter:${chapterId}`);
    },
    [chapterTracks, audio],
  );

  const playRange = useCallback(
    async (chapterId: number, fromVerse: number, toVerse: number, repeat = noRepeat) => {
      const tracks = await chapterTracks(chapterId);
      const low = Math.min(fromVerse, toVerse);
      const high = Math.max(fromVerse, toVerse);
      const range = tracks.filter((track) => track.verseNumber >= low && track.verseNumber <= high);
      if (range.length === 0) throw new Error(`No audio for ${chapterId}:${low}-${high}`);

      audio.playQueue(range, 0, `chapter:${chapterId}`, repeat);
    },
    [chapterTracks, audio],
  );

  const isPlayingVerse = useCallback(
    (verseKey: VerseKey) => audio.state === 'playing' && audio.currentTrack?.verseKey === verseKey,
    [audio.state, audio.currentTrack],
  );

  return { playAyah, playFrom, playRange, isPlayingVerse };
}

export interface ChapterDownload {
  state: DownloadState;
  start: () => Promise<void>;
  cancel: () => void;
  remove: () => Promise<void>;
}

/**
 * A surah's recitation as an offline download: where it stands, and the
 * buttons to fetch, stop or delete it. Follows a download already running,
 * so reopening the reader mid-download shows its progress.
 */
export function useChapterDownload(
  recitationId: number,
  chapterId: number | null,
): ChapterDownload {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DownloadState>({ status: 'none' });

  useEffect(() => {
    if (chapterId === null) return;
    let cancelled = false;
    void downloadState(recitationId, chapterId).then((initial) => {
      if (!cancelled) setState(initial);
    });
    const unsubscribe = subscribeToDownload(recitationId, chapterId, setState);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [recitationId, chapterId]);

  const start = useCallback(async () => {
    if (chapterId === null) return;
    const tracks = await queryClient.fetchQuery({
      queryKey: queryKeys.audio.chapterRecitation(recitationId, chapterId),
      queryFn: () => loadChapterTracks(recitationId, chapterId),
      staleTime: CHAPTER_AUDIO_STALE_MS,
    });
    await downloadChapter(recitationId, chapterId, tracks);
  }, [queryClient, recitationId, chapterId]);

  const cancel = useCallback(() => {
    if (chapterId !== null) cancelDownload(recitationId, chapterId);
  }, [recitationId, chapterId]);

  const remove = useCallback(async () => {
    if (chapterId !== null) await removeDownload(recitationId, chapterId);
  }, [recitationId, chapterId]);

  return { state, start, cancel, remove };
}
