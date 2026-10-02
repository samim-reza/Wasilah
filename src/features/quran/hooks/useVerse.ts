/**
 * A single ayah, used by Today's Ayah, the share card and deep links.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys, type VerseQueryScope } from '@/lib/api/queryKeys';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { fetchVerse } from '../services/quranService';
import type { ArabicScript, Verse, VerseKey } from '../types/quran.types';

export interface UseVerseOptions {
  translationIds: number[];
  includeWords?: boolean;
  /** Defaults to Uthmani; the reader passes the user's choice. */
  script?: ArabicScript;
  enabled?: boolean;
}

/**
 * The query for one ayah, shared by `useVerse` and by prefetching, so an ayah
 * fetched ahead of time lands exactly where the hook will look for it.
 */
export function verseQueryOptions(
  verseKey: VerseKey | null,
  options: UseVerseOptions,
  locale: string,
) {
  const scope: VerseQueryScope = {
    translationIds: options.translationIds,
    includeWords: options.includeWords ?? false,
    language: locale,
    script: options.script ?? 'uthmani',
  };

  return {
    queryKey: queryKeys.quran.verse(verseKey ?? '', scope),
    queryFn: () =>
      fetchVerse(verseKey as VerseKey, {
        translationIds: options.translationIds,
        includeWords: options.includeWords,
        language: locale,
        script: options.script ?? 'uthmani',
      }),
    enabled: Boolean(verseKey) && (options.enabled ?? true),
    staleTime: Number.POSITIVE_INFINITY,
  };
}

export function useVerse(verseKey: VerseKey | null, options: UseVerseOptions) {
  const { locale } = useTranslation();
  return useQuery<Verse>(verseQueryOptions(verseKey, options, locale));
}
