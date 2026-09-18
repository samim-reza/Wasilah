/**
 * Tafsir for one ayah.
 *
 * Fetched on demand rather than alongside the verse: tafsir bodies are long,
 * most ayahs are read without opening it, and loading them with every page
 * would multiply the reader's payload for content nobody asked for.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/queryKeys';
import { sanitizeTranslationText } from '../utils/sanitizeTranslation';
import { fetchTafsirForVerse } from '../services/quranService';
import type { VerseKey } from '../types/quran.types';

export function useTafsir(tafsirId: number | null, verseKey: VerseKey | null) {
  return useQuery<string | null>({
    queryKey: queryKeys.quran.tafsir(tafsirId ?? 0, verseKey ?? ''),
    queryFn: async () => {
      const text = await fetchTafsirForVerse(tafsirId as number, verseKey as VerseKey);
      // Tafsir bodies carry the same inline markup translations do.
      return text ? sanitizeTranslationText(text) : null;
    },
    enabled: tafsirId !== null && verseKey !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
