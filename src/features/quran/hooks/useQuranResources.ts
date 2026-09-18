/**
 * The catalogue of available translations and reciters.
 *
 * Fetched from Quran Foundation rather than hardcoded, so a newly published
 * edition appears without an app release — and so the app never claims an
 * edition exists that the API cannot serve.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from '@/lib/api/queryKeys';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import {
  fetchReciterResources,
  fetchTafsirResources,
  fetchTranslationResources,
} from '../services/quranService';
import type { ReciterResource, TranslationResource } from '../types/quran.types';

const CATALOGUE_STALE_MS = 24 * 60 * 60 * 1000;

export interface GroupedTranslations {
  /** Editions in the user's interface language, listed first. */
  preferred: TranslationResource[];
  /** Everything else, grouped by language name. */
  byLanguage: { language: string; translations: TranslationResource[] }[];
}

export function useTranslationResources() {
  const { locale } = useTranslation();

  const query = useQuery<TranslationResource[]>({
    queryKey: queryKeys.quran.translationResources(locale),
    queryFn: () => fetchTranslationResources(locale),
    staleTime: CATALOGUE_STALE_MS,
  });

  // The catalogue is ~150 editions across dozens of languages. Surfacing the
  // ones matching the interface language first is the difference between a
  // usable picker and a wall of text.
  const grouped = useMemo<GroupedTranslations>(() => {
    const all = query.data ?? [];
    const preferredLanguage = locale === 'bn' ? 'bengali' : 'english';

    const preferred = all.filter(
      (resource) => resource.languageName.toLowerCase() === preferredLanguage,
    );

    const rest = new Map<string, TranslationResource[]>();
    for (const resource of all) {
      if (resource.languageName.toLowerCase() === preferredLanguage) continue;
      const bucket = rest.get(resource.languageName) ?? [];
      bucket.push(resource);
      rest.set(resource.languageName, bucket);
    }

    return {
      preferred,
      byLanguage: Array.from(rest.entries())
        .map(([language, translations]) => ({ language, translations }))
        .sort((a, b) => a.language.localeCompare(b.language)),
    };
  }, [query.data, locale]);

  return { ...query, grouped };
}

export function useTafsirResources() {
  const { locale } = useTranslation();

  return useQuery<TranslationResource[]>({
    queryKey: queryKeys.quran.tafsirResources(locale),
    queryFn: () => fetchTafsirResources(locale),
    staleTime: CATALOGUE_STALE_MS,
  });
}

export function useReciterResources() {
  const { locale } = useTranslation();

  return useQuery<ReciterResource[]>({
    queryKey: queryKeys.quran.reciterResources(locale),
    queryFn: () => fetchReciterResources(locale),
    staleTime: CATALOGUE_STALE_MS,
  });
}
