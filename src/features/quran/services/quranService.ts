/**
 * Quran content service.
 *
 * The boundary between "what the app wants" and "what the API offers". Hooks
 * call these functions; nothing here knows about React, and nothing above here
 * knows about Quran Foundation.
 */
import { readerPageSize, searchPageSize } from '@/config/quran';
import { quranRequest, type QuranRequestOptions } from '@/lib/quran/client';
import type {
  QfTafsirResource,
  QfChapterResponse,
  QfChaptersResponse,
  QfJuzsResponse,
  QfRecitationResponse,
  QfResourcesResponse,
  QfSearchResponse,
  QfTranslationResource,
  QfRecitationResource,
  QfVerseResponse,
  QfVersesResponse,
} from '@/lib/quran/types';

import type {
  AyahAudio,
  Chapter,
  JuzSummary,
  ReciterResource,
  SearchResultPage,
  TranslationResource,
  Verse,
  VerseKey,
  VersePage,
} from '../types/quran.types';
import {
  mapAudioFiles,
  mapChapter,
  mapJuz,
  mapPagination,
  mapReciterResource,
  mapSearchResponse,
  mapTranslationResource,
  mapVerse,
} from './quranMapper';

/**
 * The verse fields the reader needs. Requesting an explicit field list rather
 * than the default payload roughly halves the response size, which is the
 * single biggest lever on how fast a surah opens.
 */
const READER_VERSE_FIELDS =
  'text_uthmani,chapter_id,verse_number,verse_key,juz_number,page_number,sajdah_number,ruku_number,hizb_number';
const WORD_FIELDS = 'text_uthmani,translation,transliteration,char_type_name,position,audio_url';

export interface VerseQueryOptions extends QuranRequestOptions {
  /** Translation resource IDs to include. Empty means Arabic only. */
  translationIds?: number[];
  /** Word-by-word data roughly triples the payload; request it only when shown. */
  includeWords?: boolean;
  language?: string;
  page?: number;
  perPage?: number;
}

function verseParams(options: VerseQueryOptions) {
  return {
    language: options.language ?? 'en',
    fields: READER_VERSE_FIELDS,
    translations: options.translationIds?.length ? options.translationIds : undefined,
    words: options.includeWords ? true : undefined,
    word_fields: options.includeWords ? WORD_FIELDS : undefined,
    page: options.page ?? 1,
    per_page: options.perPage ?? readerPageSize,
  };
}

// --- Structure --------------------------------------------------------------

export async function fetchChapters(
  language = 'en',
  options: QuranRequestOptions = {},
): Promise<Chapter[]> {
  const response = await quranRequest<QfChaptersResponse>('/chapters', { language }, options);
  return response.chapters.map(mapChapter);
}

export async function fetchChapter(
  chapterId: number,
  language = 'en',
  options: QuranRequestOptions = {},
): Promise<Chapter> {
  const response = await quranRequest<QfChapterResponse>(
    `/chapters/${chapterId}`,
    { language },
    options,
  );
  return mapChapter(response.chapter);
}

export async function fetchJuzs(options: QuranRequestOptions = {}): Promise<JuzSummary[]> {
  const response = await quranRequest<QfJuzsResponse>('/juzs', undefined, options);
  return response.juzs.map(mapJuz);
}

// --- Verses -----------------------------------------------------------------

export async function fetchVersesByChapter(
  chapterId: number,
  options: VerseQueryOptions = {},
): Promise<VersePage> {
  const response = await quranRequest<QfVersesResponse>(
    `/verses/by_chapter/${chapterId}`,
    verseParams(options),
    options,
  );

  return {
    verses: response.verses.map(mapVerse),
    page: mapPagination(response.pagination),
  };
}

export async function fetchVersesByJuz(
  juzNumber: number,
  options: VerseQueryOptions = {},
): Promise<VersePage> {
  const response = await quranRequest<QfVersesResponse>(
    `/verses/by_juz/${juzNumber}`,
    verseParams(options),
    options,
  );

  return {
    verses: response.verses.map(mapVerse),
    page: mapPagination(response.pagination),
  };
}

export async function fetchVersesByPage(
  pageNumber: number,
  options: VerseQueryOptions = {},
): Promise<VersePage> {
  const response = await quranRequest<QfVersesResponse>(
    `/verses/by_page/${pageNumber}`,
    verseParams(options),
    options,
  );

  return {
    verses: response.verses.map(mapVerse),
    page: mapPagination(response.pagination),
  };
}

export async function fetchVerse(
  verseKey: VerseKey,
  options: VerseQueryOptions = {},
): Promise<Verse> {
  const response = await quranRequest<QfVerseResponse>(
    `/verses/by_key/${verseKey}`,
    {
      language: options.language ?? 'en',
      fields: READER_VERSE_FIELDS,
      translations: options.translationIds?.length ? options.translationIds : undefined,
      words: options.includeWords ? true : undefined,
      word_fields: options.includeWords ? WORD_FIELDS : undefined,
    },
    options,
  );

  return mapVerse(response.verse);
}

// --- Tafsir -----------------------------------------------------------------

export async function fetchTafsirForVerse(
  tafsirId: number,
  verseKey: VerseKey,
  options: QuranRequestOptions = {},
): Promise<string | null> {
  const response = await quranRequest<{ tafsir?: { text?: string } }>(
    `/tafsirs/${tafsirId}/by_ayah/${verseKey}`,
    undefined,
    options,
  );
  return response.tafsir?.text ?? null;
}

// --- Audio ------------------------------------------------------------------

export async function fetchChapterRecitation(
  recitationId: number,
  chapterId: number,
  options: QuranRequestOptions = {},
): Promise<AyahAudio[]> {
  const response = await quranRequest<QfRecitationResponse>(
    `/recitations/${recitationId}/by_chapter/${chapterId}`,
    { per_page: 300 },
    options,
  );
  return mapAudioFiles(response);
}

export async function fetchAyahRecitation(
  recitationId: number,
  verseKey: VerseKey,
  options: QuranRequestOptions = {},
): Promise<AyahAudio | null> {
  const response = await quranRequest<QfRecitationResponse>(
    `/recitations/${recitationId}/by_ayah/${verseKey}`,
    undefined,
    options,
  );
  return mapAudioFiles(response)[0] ?? null;
}

// --- Search -----------------------------------------------------------------

export interface SearchOptions extends QuranRequestOptions {
  page?: number;
  size?: number;
  language?: string;
}

export async function searchQuran(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResultPage> {
  const response = await quranRequest<QfSearchResponse>(
    '/search',
    {
      q: query,
      size: options.size ?? searchPageSize,
      page: options.page ?? 1,
      language: options.language ?? 'en',
    },
    // Search runs on every keystroke pause; fail fast rather than making the
    // user watch a spinner for the default timeout.
    { ...options, timeoutMs: options.timeoutMs ?? 8_000 },
  );

  return mapSearchResponse(response);
}

// --- Resource catalogues ----------------------------------------------------

export async function fetchTranslationResources(
  language = 'en',
  options: QuranRequestOptions = {},
): Promise<TranslationResource[]> {
  const response = await quranRequest<QfResourcesResponse<QfTranslationResource>>(
    '/resources/translations',
    { language },
    options,
  );
  return (response.translations ?? []).map(mapTranslationResource);
}

export async function fetchTafsirResources(
  language = 'en',
  options: QuranRequestOptions = {},
): Promise<TranslationResource[]> {
  const response = await quranRequest<QfResourcesResponse<QfTafsirResource>>(
    '/resources/tafsirs',
    { language },
    options,
  );
  // Tafsir resources carry the same identifying shape as translations, so the
  // same mapper applies and the picker can reuse the translation row UI.
  return (response.tafsirs ?? []).map(mapTranslationResource);
}

export async function fetchReciterResources(
  language = 'en',
  options: QuranRequestOptions = {},
): Promise<ReciterResource[]> {
  const response = await quranRequest<QfResourcesResponse<QfRecitationResource>>(
    '/resources/recitations',
    { language },
    options,
  );
  return (response.recitations ?? []).map(mapReciterResource);
}
