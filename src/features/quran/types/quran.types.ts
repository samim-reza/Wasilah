/**
 * The app's own Quran domain models.
 *
 * Kept separate from the raw `Qf*` API types so that UI components never depend
 * on the upstream response shape. If Quran Foundation changes a field name, the
 * mapper in `quranMapper.ts` absorbs it and nothing else changes.
 */

/** A canonical ayah address, e.g. '2:255'. */
export type VerseKey = string;

export type RevelationPlace = 'makkah' | 'madinah';

export interface Chapter {
  id: number;
  /** Latin transliteration, e.g. 'Al-Baqarah'. */
  nameSimple: string;
  /** Arabic script name. */
  nameArabic: string;
  /** Translated meaning in the requested language, e.g. 'The Cow'. */
  translatedName: string;
  versesCount: number;
  revelationPlace: RevelationPlace;
  revelationOrder: number;
  /** Whether the Bismillah precedes this surah (false only for At-Tawbah). */
  hasBismillah: boolean;
  firstPage: number;
  lastPage: number;
}

export interface WordSegment {
  id: number;
  position: number;
  /** Arabic glyph(s) for this word. */
  text: string;
  translation: string | null;
  transliteration: string | null;
  /** The ayah-number marker is a 'end' glyph, not a word; styled differently. */
  isEndMarker: boolean;
  audioUrl: string | null;
}

export interface VerseTranslation {
  /** Quran Foundation resource id of the edition, kept for attribution. */
  resourceId: number;
  resourceName: string | null;
  /** Plain text with footnote markup already removed. */
  text: string;
}

export interface VerseTafsir {
  resourceId: number;
  resourceName: string | null;
  text: string;
}

export interface Verse {
  id: number;
  verseKey: VerseKey;
  chapterId: number;
  verseNumber: number;
  /** Uthmani script, exactly as supplied. Never modified. */
  arabicText: string;
  translations: VerseTranslation[];
  tafsirs: VerseTafsir[];
  words: WordSegment[];
  juzNumber: number | null;
  hizbNumber: number | null;
  rukuNumber: number | null;
  pageNumber: number | null;
  /** Present when this ayah contains a prostration. */
  sajdahNumber: number | null;
}

export interface PageInfo {
  currentPage: number;
  perPage: number;
  nextPage: number | null;
  totalPages: number;
  totalRecords: number;
}

export interface VersePage {
  verses: Verse[];
  page: PageInfo;
}

/**
 * One search hit, after its content has been resolved.
 *
 * `arabicText` and `translationText` are null while the second fetch is in
 * flight, so the list can render the reference immediately rather than waiting.
 */
export interface SearchResult {
  verseKey: VerseKey;
  chapterId: number;
  verseNumber: number;
  arabicText: string | null;
  translationText: string | null;
  translationName: string | null;
}

export interface SearchResultPage {
  query: string;
  /** Verse keys, in relevance order, before content is fetched. */
  verseKeys: VerseKey[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
}

export interface AyahAudio {
  verseKey: VerseKey;
  url: string;
  /** Word-level timings in ms, when the reciter provides them. */
  segments: number[][] | null;
}

export interface TranslationResource {
  id: number;
  name: string;
  authorName: string;
  languageName: string;
}

export interface ReciterResource {
  id: number;
  name: string;
  style: string | null;
}

export interface JuzSummary {
  juzNumber: number;
  versesCount: number;
  /** Chapter id → verse range, e.g. { 2: '1-141' }. */
  verseMapping: Record<number, string>;
  firstVerseKey: VerseKey;
}
