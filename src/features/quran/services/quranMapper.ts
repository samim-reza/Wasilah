/**
 * Maps Quran Foundation API responses onto the app's domain models.
 *
 * This is the only place upstream field names appear outside `lib/quran/types`.
 * Mapping defensively (with fallbacks for optional fields) rather than
 * validating strictly is a deliberate performance choice: a surah page carries
 * hundreds of verses and word segments, and running a schema validator over all
 * of them on every fetch is measurable on low-end Android devices. The envelope
 * is checked; individual fields degrade gracefully.
 *
 * Arabic text is passed through verbatim and never transformed.
 */
import type {
  QfChapter,
  QfPagination,
  QfRecitationResponse,
  QfSearchResponse,
  QfTranslationResource,
  QfRecitationResource,
  QfJuz,
  QfVerse,
  QfWord,
} from '@/lib/quran/types';

import { parseVerseKey } from '../utils/verseKey';
import { sanitizeTranslationText } from '../utils/sanitizeTranslation';
import type {
  AyahAudio,
  Chapter,
  JuzSummary,
  PageInfo,
  ReciterResource,
  SearchResultPage,
  TranslationResource,
  Verse,
  WordSegment,
} from '../types/quran.types';

export function mapChapter(raw: QfChapter): Chapter {
  return {
    id: raw.id,
    nameSimple: raw.name_simple,
    nameArabic: raw.name_arabic,
    translatedName: raw.translated_name?.name ?? raw.name_simple,
    versesCount: raw.verses_count,
    revelationPlace: raw.revelation_place,
    revelationOrder: raw.revelation_order,
    hasBismillah: raw.bismillah_pre,
    firstPage: raw.pages?.[0] ?? 1,
    lastPage: raw.pages?.[1] ?? 1,
  };
}

function mapWord(raw: QfWord): WordSegment {
  return {
    id: raw.id,
    position: raw.position,
    text: raw.text,
    translation: raw.translation?.text ?? null,
    transliteration: raw.transliteration?.text ?? null,
    isEndMarker: raw.char_type_name === 'end',
    audioUrl: raw.audio_url,
  };
}

export function mapVerse(raw: QfVerse): Verse {
  const address = parseVerseKey(raw.verse_key);

  return {
    id: raw.id,
    verseKey: raw.verse_key,
    // `verse_key` is authoritative; the standalone fields are only a fallback
    // for endpoints that omit it.
    chapterId: address?.chapterId ?? 0,
    verseNumber: address?.verseNumber ?? raw.verse_number,
    // Prefer Uthmani. Never substitute a different script silently — if the
    // requested script is missing the ayah renders empty rather than wrong.
    arabicText: raw.text_uthmani ?? raw.text_uthmani_simple ?? '',
    translations: (raw.translations ?? []).map((translation) => ({
      resourceId: translation.resource_id,
      resourceName: translation.resource_name ?? null,
      text: sanitizeTranslationText(translation.text),
    })),
    tafsirs: (raw.tafsirs ?? []).map((tafsir) => ({
      resourceId: tafsir.resource_id,
      resourceName: tafsir.resource_name ?? null,
      text: sanitizeTranslationText(tafsir.text),
    })),
    words: (raw.words ?? []).map(mapWord),
    juzNumber: raw.juz_number ?? null,
    hizbNumber: raw.hizb_number ?? null,
    rukuNumber: raw.ruku_number ?? null,
    pageNumber: raw.page_number ?? null,
    sajdahNumber: raw.sajdah_number ?? null,
  };
}

export function mapPagination(raw: QfPagination | undefined): PageInfo {
  return {
    currentPage: raw?.current_page ?? 1,
    perPage: raw?.per_page ?? 0,
    nextPage: raw?.next_page ?? null,
    totalPages: raw?.total_pages ?? 1,
    totalRecords: raw?.total_records ?? 0,
  };
}

export function mapSearchResponse(raw: QfSearchResponse): SearchResultPage {
  const search = raw.search;

  return {
    query: search.query,
    totalResults: search.total_results,
    currentPage: search.current_page,
    totalPages: search.total_pages,
    results: search.results.map((result) => {
      const address = parseVerseKey(result.verse_key);
      const firstTranslation = result.translations?.[0];

      return {
        verseKey: result.verse_key,
        chapterId: address?.chapterId ?? 0,
        verseNumber: address?.verseNumber ?? 0,
        arabicText: result.text,
        highlighted: result.highlighted ?? null,
        translationText: firstTranslation ? sanitizeTranslationText(firstTranslation.text) : null,
        translationName: firstTranslation?.name ?? null,
      };
    }),
  };
}

export function mapAudioFiles(raw: QfRecitationResponse): AyahAudio[] {
  return (raw.audio_files ?? []).map((file) => ({
    verseKey: file.verse_key,
    url: file.url,
    segments: file.segments ?? null,
  }));
}

export function mapTranslationResource(raw: QfTranslationResource): TranslationResource {
  return {
    id: raw.id,
    name: raw.translated_name?.name ?? raw.name,
    authorName: raw.author_name,
    languageName: raw.language_name,
  };
}

export function mapReciterResource(raw: QfRecitationResource): ReciterResource {
  return {
    id: raw.id,
    name: raw.translated_name?.name ?? raw.reciter_name,
    style: raw.style,
  };
}

export function mapJuz(raw: QfJuz): JuzSummary {
  const verseMapping: Record<number, string> = {};
  for (const [chapterId, range] of Object.entries(raw.verse_mapping ?? {})) {
    verseMapping[Number(chapterId)] = range;
  }

  const firstChapter = Object.keys(verseMapping)[0];
  const firstRange = firstChapter ? verseMapping[Number(firstChapter)] : undefined;
  const firstVerse = firstRange?.split('-')[0] ?? '1';

  return {
    juzNumber: raw.juz_number,
    versesCount: raw.verses_count,
    verseMapping,
    firstVerseKey: `${firstChapter ?? 1}:${firstVerse}`,
  };
}
