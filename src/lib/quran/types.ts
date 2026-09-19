/**
 * Quran Foundation Content API response types (v4).
 *
 * Mirrors the upstream shapes rather than renaming fields, so a response can be
 * compared against the API documentation without a translation step. The app's
 * own domain models live in `src/features/quran/types` and are mapped from
 * these at the service boundary.
 *
 * Fields the API only returns when explicitly requested are optional here —
 * asking for `translations` does not guarantee `tafsirs` comes back.
 */

export interface QfTranslatedName {
  language_name: string;
  name: string;
}

export interface QfChapter {
  id: number;
  revelation_place: 'makkah' | 'madinah';
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  /** `[firstPage, lastPage]` in the standard 604-page Mushaf. */
  pages: [number, number];
  translated_name: QfTranslatedName;
}

export interface QfWord {
  id: number;
  position: number;
  audio_url: string | null;
  /** 'word' for actual words, 'end' for the ayah-number glyph. */
  char_type_name: string;
  line_number?: number;
  page_number?: number;
  text: string;
  translation?: { text: string; language_name: string };
  transliteration?: { text: string | null; language_name: string };
}

export interface QfTranslation {
  id: number;
  resource_id: number;
  /** May contain `<sup foot_note=...>` markup; sanitised before display. */
  text: string;
  resource_name?: string;
}

export interface QfTafsir {
  id: number;
  resource_id: number;
  text: string;
  resource_name?: string;
  language_name?: string;
}

export interface QfVerse {
  id: number;
  verse_number: number;
  /** '2:255' — the canonical cross-API identifier for an ayah. */
  verse_key: string;
  hizb_number?: number;
  rub_el_hizb_number?: number;
  ruku_number?: number;
  manzil_number?: number;
  sajdah_number?: number | null;
  page_number?: number;
  juz_number?: number;
  text_uthmani?: string;
  text_uthmani_simple?: string;
  text_imlaei?: string;
  text_indopak?: string;
  words?: QfWord[];
  translations?: QfTranslation[];
  tafsirs?: QfTafsir[];
}

export interface QfPagination {
  per_page: number;
  current_page: number;
  next_page: number | null;
  total_pages: number;
  total_records: number;
}

export interface QfChaptersResponse {
  chapters: QfChapter[];
}

export interface QfChapterResponse {
  chapter: QfChapter;
}

export interface QfVersesResponse {
  verses: QfVerse[];
  pagination: QfPagination;
}

export interface QfVerseResponse {
  verse: QfVerse;
}

/**
 * A search hit.
 *
 * The Search API returns verse KEYS and nothing else — no text, no translation,
 * no highlight, regardless of the parameters passed. Displaying results
 * therefore takes a second step: fetch the content for the page of keys about
 * to be shown.
 */
export interface QfSearchResultVerse {
  key: string;
  result_type: string;
  isArabic: boolean;
  isTransliteration: boolean;
}

export interface QfSearchResponse {
  result: {
    /** Chapter/juz/page matches, e.g. searching a surah name. */
    navigation: { key: string; result_type: string }[];
    verses: QfSearchResultVerse[];
  };
  pagination: QfPagination;
}

export interface QfAudioFile {
  verse_key: string;
  url: string;
  /** Millisecond word timings, when the reciter has them. */
  segments?: number[][];
}

export interface QfRecitationResponse {
  audio_files: QfAudioFile[];
  pagination?: QfPagination;
}

export interface QfChapterRecitationResponse {
  audio_file: {
    id: number;
    chapter_id: number;
    file_size: number | null;
    format: string;
    audio_url: string;
  };
}

export interface QfTranslationResource {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: QfTranslatedName;
}

export interface QfTafsirResource extends QfTranslationResource {
  /** 'tafsir' or 'translation' depending on the edition. */
  text_type?: string;
}

export interface QfRecitationResource {
  id: number;
  reciter_name: string;
  style: string | null;
  translated_name: QfTranslatedName;
}

export interface QfResourcesResponse<T> {
  translations?: T[];
  tafsirs?: T[];
  recitations?: T[];
}

export interface QfJuz {
  id: number;
  juz_number: number;
  first_verse_id: number;
  last_verse_id: number;
  verses_count: number;
  /** Map of chapter id → verse range string, e.g. `{ "2": "1-141" }`. */
  verse_mapping: Record<string, string>;
}

export interface QfJuzsResponse {
  juzs: QfJuz[];
}
