/**
 * Quran content defaults.
 *
 * Translation and tafsir IDs are Quran Foundation resource IDs. They are listed
 * here rather than inline so switching the default edition is a one-line change
 * and so every shipped edition can be cross-referenced against
 * `docs/third-party-content-and-licenses.md`.
 */

/**
 * QF translation resource IDs for the editions Wasilah ships by default.
 *
 * These are the PRODUCTION choices. The pre-live catalogue does not carry 131,
 * so `resolveTranslationIds` falls back to an available edition in the same
 * language rather than silently rendering Arabic with no translation. See
 * `src/features/quran/utils/resolveTranslations.ts`.
 */
export const defaultTranslationIds = {
  en: 131, // Dr. Mustafa Khattab, The Clear Quran
  bn: 161, // Taisirul Quran
} as const;

/** Fallback used when the device language has no configured default. */
export const fallbackTranslationId = defaultTranslationIds.en;

/** QF recitation resource ID. Mishari Rashid al-Afasy — widely available. */
export const defaultRecitationId = 7;

/**
 * Base URL for recitation audio.
 *
 * The Content API returns audio paths RELATIVE to this host — `by_ayah` yields
 * `"Alafasy/mp3/001001.mp3"`, not a URL. Handing that straight to a player does
 * nothing, and no error explains why, so the base is resolved in the mapper
 * (`quranMapper.mapAudioFiles`) before a track ever reaches the audio module.
 */
export const audioBaseUrl = 'https://verses.quran.foundation/';

/** Total counts, used for progress maths and input validation. */
export const quranStructure = {
  chapterCount: 114,
  verseCount: 6236,
  juzCount: 30,
  hizbCount: 60,
  rubCount: 240,
  pageCount: 604,
  manzilCount: 7,
} as const;

/**
 * Verses fetched per reader page.
 *
 * Chosen to balance two costs: too small and scrolling stalls on every network
 * round-trip; too large and the first paint of a long surah is delayed. 20 keeps
 * the initial payload under ~60KB with translations attached.
 */
export const readerPageSize = 20;

/** Search results per page — matches the QF search API default. */
export const searchPageSize = 20;

/**
 * How long QF content may be cached on device.
 *
 * The Quran Foundation developer terms limit ordinary Content API caching to one
 * week unless a Content Sync exception applies. This constant is the single
 * place that limit is expressed; do not extend it without re-reading the
 * current terms.
 */
export const contentCacheMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

/** Short-lived cache for volatile responses such as search. */
export const searchCacheMaxAgeMs = 10 * 60 * 1000;
