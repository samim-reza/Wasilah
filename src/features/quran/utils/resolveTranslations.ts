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
 * The first entry is the shipped choice; later entries cover environments whose
 * catalogue lacks it. Listing them in order means the same build works against
 * pre-live and production without a config change.
 *
 * Every ID here was verified against the live catalogues, which differ sharply:
 * production carries 145 editions, pre-live 14.
 */
export const preferredTranslationsByLanguage: Record<string, number[]> = {
  // 20 = Saheeh International (production; absent from pre-live)
  // 85 = M.A.S. Abdel Haleem (the only prose English edition in pre-live)
  // 19 = M. Pickthall (1930) — the public-domain option, if 20's licence
  //      cannot be confirmed for distribution. See
  //      docs/third-party-content-and-licenses.md.
  en: [20, 85, 19],
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
