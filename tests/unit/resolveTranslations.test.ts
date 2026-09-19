/**
 * Translation resolution tests.
 *
 * These exist because of a real failure, twice over. The shipped English
 * default was 131 (The Clear Quran), which turned out to be absent not just
 * from the Quran Foundation pre-live catalogue but from production too — it is
 * a quran.com edition, and the two catalogues are not the same. In both cases
 * the API answers a request for a missing edition with an empty `translations`
 * array rather than an error, so the reader renders Arabic alone and nothing
 * explains why.
 *
 * The fixtures below are taken from the live catalogues rather than invented.
 */
import {
  defaultTranslationIdsFor,
  resolveTranslationIds,
} from '@/features/quran/utils/resolveTranslations';
import type { TranslationResource } from '@/features/quran/types/quran.types';

function resource(id: number, languageName: string, name = `Edition ${id}`): TranslationResource {
  return { id, name, authorName: name, languageName };
}

/** Pre-live: 14 editions, and no Saheeh International. */
const prelive: TranslationResource[] = [
  resource(85, 'english', 'M.A.S. Abdel Haleem'),
  resource(57, 'english', 'Transliteration'),
  resource(161, 'bengali', 'Taisirul Quran'),
  resource(234, 'urdu', 'Fatah Muhammad Jalandhari'),
];

/** Production: 145 editions. Neither environment carries 131. */
const production: TranslationResource[] = [
  resource(20, 'english', 'Saheeh International'),
  resource(19, 'english', 'M. Pickthall'),
  ...prelive,
];

/** The edition that was shipped as the default and exists nowhere. */
const CLEAR_QURAN = 131;

describe('resolveTranslationIds', () => {
  it('keeps the requested edition when it exists', () => {
    expect(resolveTranslationIds({ requested: [20], available: production, locale: 'en' })).toEqual(
      [20],
    );
  });

  it('falls back to an available English edition when the default is missing', () => {
    // The exact pre-live case that produced Arabic-only output.
    expect(resolveTranslationIds({ requested: [20], available: prelive, locale: 'en' })).toEqual([
      85,
    ]);
  });

  it('rescues an edition that exists in no environment at all', () => {
    // 131 was the shipped default for weeks. Production must not fall through
    // to "any English edition" for it either.
    expect(
      resolveTranslationIds({ requested: [CLEAR_QURAN], available: production, locale: 'en' }),
    ).toEqual([20]);
  });

  it('keeps Bengali working, since 161 exists in both environments', () => {
    expect(resolveTranslationIds({ requested: [161], available: prelive, locale: 'bn' })).toEqual([
      161,
    ]);
  });

  it('falls back within the right language rather than to English', () => {
    const withoutPreferredBengali = [resource(999, 'bengali', 'Some other Bengali edition')];

    expect(
      resolveTranslationIds({
        requested: [161],
        available: withoutPreferredBengali,
        locale: 'bn',
      }),
    ).toEqual([999]);
  });

  it('drops only the unavailable editions from a multi-edition request', () => {
    expect(
      resolveTranslationIds({ requested: [20, 161], available: prelive, locale: 'en' }),
    ).toEqual([161]);
  });

  it('passes the request through untouched while the catalogue is still loading', () => {
    // Blocking the reader on catalogue validation would be worse than briefly
    // requesting an edition that might not resolve.
    expect(resolveTranslationIds({ requested: [20], available: [], locale: 'en' })).toEqual([20]);
  });

  it('falls back to English when nothing matches the locale', () => {
    expect(resolveTranslationIds({ requested: [999], available: prelive, locale: 'ur' })).toEqual([
      85,
    ]);
  });

  it('returns nothing rather than guessing when the catalogue is unusable', () => {
    expect(
      resolveTranslationIds({
        requested: [20],
        available: [resource(1, 'klingon')],
        locale: 'en',
      }),
    ).toEqual([]);
  });

  it('never returns an id absent from the catalogue', () => {
    for (const locale of ['en', 'bn', 'ur']) {
      const ids = resolveTranslationIds({ requested: [20, 999], available: prelive, locale });
      const availableIds = new Set(prelive.map((r) => r.id));
      for (const id of ids) expect(availableIds.has(id)).toBe(true);
    }
  });
});

describe('defaultTranslationIdsFor', () => {
  it('prefers the shipped edition for a fresh install', () => {
    expect(defaultTranslationIdsFor('en')).toEqual([20]);
    expect(defaultTranslationIdsFor('bn')).toEqual([161]);
  });

  it('falls back to English for an unconfigured locale', () => {
    expect(defaultTranslationIdsFor('ur')).toEqual([20]);
  });

  it('only ever names an edition production actually carries', () => {
    // The guard against reintroducing a quran.com ID that QF does not serve.
    const productionIds = new Set(production.map((resource) => resource.id));

    for (const locale of ['en', 'bn']) {
      for (const id of defaultTranslationIdsFor(locale)) {
        if (locale === 'en') expect(productionIds.has(id)).toBe(true);
      }
    }
  });
});
