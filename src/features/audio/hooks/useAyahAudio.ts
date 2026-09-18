/**
 * Turns ayahs into playable tracks.
 *
 * The seam between the Quran feature and the audio feature: this is the only
 * place that knows both that an ayah has a recitation URL and that the player
 * takes tracks. The player stays ignorant of the Quran API, and the Quran
 * service stays ignorant of playback.
 */
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/lib/api/queryKeys';
import { parseVerseKey } from '@/features/quran/utils/verseKey';
import {
  fetchAyahRecitation,
  fetchChapterRecitation,
} from '@/features/quran/services/quranService';
import type { VerseKey } from '@/features/quran/types/quran.types';

import { useAudio } from './AudioPlayerProvider';
import type { AudioTrack } from '../types/audio.types';

function toTrack(verseKey: VerseKey, url: string): AudioTrack | null {
  const address = parseVerseKey(verseKey);
  if (!address) return null;

  return {
    verseKey,
    url,
    chapterId: address.chapterId,
    verseNumber: address.verseNumber,
  };
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
    queryFn: async () => {
      const files = await fetchChapterRecitation(recitationId, chapterId as number);
      return files
        .map((file) => toTrack(file.verseKey, file.url))
        .filter((track): track is AudioTrack => track !== null);
    },
    enabled: chapterId !== null && chapterId > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export interface UseAyahPlaybackResult {
  /** Plays one ayah on its own. */
  playAyah: (verseKey: VerseKey) => Promise<void>;
  /** Plays a chapter from a given ayah onwards. */
  playFrom: (chapterId: number, verseKey: VerseKey) => Promise<void>;
  isPlayingVerse: (verseKey: VerseKey) => boolean;
}

export function useAyahPlayback(recitationId: number): UseAyahPlaybackResult {
  const audio = useAudio();

  const playAyah = useCallback(
    async (verseKey: VerseKey) => {
      // Single-ayah playback fetches just that file, so tapping the play icon
      // on one ayah does not pull the whole surah's audio list.
      const file = await fetchAyahRecitation(recitationId, verseKey);
      if (!file) return;

      const track = toTrack(verseKey, file.url);
      if (track) audio.playTrack(track);
    },
    [recitationId, audio],
  );

  const playFrom = useCallback(
    async (chapterId: number, verseKey: VerseKey) => {
      const files = await fetchChapterRecitation(recitationId, chapterId);
      const tracks = files
        .map((file) => toTrack(file.verseKey, file.url))
        .filter((track): track is AudioTrack => track !== null);

      const startIndex = Math.max(
        0,
        tracks.findIndex((track) => track.verseKey === verseKey),
      );
      audio.playQueue(tracks, startIndex);
    },
    [recitationId, audio],
  );

  const isPlayingVerse = useCallback(
    (verseKey: VerseKey) => audio.state === 'playing' && audio.currentTrack?.verseKey === verseKey,
    [audio.state, audio.currentTrack],
  );

  return { playAyah, playFrom, isPlayingVerse };
}
