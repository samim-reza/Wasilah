/**
 * Resolves which translation editions can actually be requested.
 *
 * A hardcoded resource ID is fragile in a way that is easy to miss: the Quran
 * Foundation pre-live and production environments carry different catalogues,
 * and an edition can be withdrawn or renumbered at any time. When the requested
 * ID is absent the API does not error — it returns the verses with an empty
 * `translations` array, so the reader silently shows Arabic only and nothing
 * anywhere says why.
 *
 * This resolves a preference against the catalogue the environment actually
 * offers, falling back to another edition in the same language rather than to
 * no translation at all. Pure, so every fallback path is testable.
 */
import type { TranslationResource } from '../types/quran.types';

/**
 * Preferred editions per language, best first.
 *
 * The first entry in each list is the production choice; later entries are
 * what the pre-live catalogue carries. Listing them in order means the same
 * build works against either environment without a config change.
 */
export const preferredTranslationsByLanguage: Record<string, number[]> = {
  // 131 = Dr. Mustafa Khattab, The Clear Quran (production)
  // 85  = M.A.S. Abdel Haleem (present in pre-live)
  en: [131, 85],
  // 161 = Taisirul Quran, available in both environments
  bn: [161],
};

/** Language name as the API reports it, keyed by our locale code. */
const apiLanguageNames: Record<string, string> = {
  en: 'english',
  bn: 'bengali',
};

export interface ResolveTranslationsInput {
  /** What the user chose, or the shipped default. */
  requested: readonly number[];
  /** The catalogue from `/resources/translations`. Empty while it loads. */
  available: readonly TranslationResource[];
  /** Used to pick a same-language fallback. */
  locale: string;
}

/**
 * Returns IDs that exist in the catalogue.
 *
 * While the catalogue is still loading it returns the request unchanged, so the
 * reader does not stall waiting for a validation it can do later.
 */
export function resolveTranslationIds({
  requested,
  available,
  locale,
}: ResolveTranslationsInput): number[] {
  if (available.length === 0) return [...requested];

  const availableIds = new Set(available.map((resource) => resource.id));
  const usable = requested.filter((id) => availableIds.has(id));

  // At least one of the user's choices exists; respect it exactly.
  if (usable.length > 0) return usable;

  // Try the configured alternatives for this language.
  for (const candidate of preferredTranslationsByLanguage[locale] ?? []) {
    if (availableIds.has(candidate)) return [candidate];
  }

  // Otherwise take any edition in the right language, so the user still gets a
  // translation they can read rather than none.
  const languageName = apiLanguageNames[locale];
  const sameLanguage = available.find(
    (resource) => resource.languageName.toLowerCase() === languageName,
  );
  if (sameLanguage) return [sameLanguage.id];

  // Last resort: English, which every catalogue carries.
  const english = available.find((resource) => resource.languageName.toLowerCase() === 'english');
  return english ? [english.id] : [];
}

/** The default edition list for a fresh install in the given locale. */
export function defaultTranslationIdsFor(locale: string): number[] {
  const preferred =
    preferredTranslationsByLanguage[locale] ?? preferredTranslationsByLanguage['en'];
  const first = preferred?.[0];
  return first === undefined ? [] : [first];
}
