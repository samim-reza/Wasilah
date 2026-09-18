/**
 * Translation resolution tests.
 *
 * These exist because of a real failure: the shipped English default (131) is
 * absent from the Quran Foundation pre-live catalogue, and the API answers a
 * request for it with an empty `translations` array rather than an error — so
 * the reader rendered Arabic with no translation and nothing explained why.
 */
import {
  defaultTranslationIdsFor,
  resolveTranslationIds,
} from '@/features/quran/utils/resolveTranslations';
import type { TranslationResource } from '@/features/quran/types/quran.types';

function resource(id: number, languageName: string, name = `Edition ${id}`): TranslationResource {
  return { id, name, authorName: name, languageName };
}

/** What the pre-live environment actually returns. */
const prelive: TranslationResource[] = [
  resource(85, 'english', 'M.A.S. Abdel Haleem'),
  resource(57, 'english', 'Transliteration'),
  resource(161, 'bengali', 'Taisirul Quran'),
  resource(234, 'urdu', 'Fatah Muhammad Jalandhari'),
];

/** Production additionally carries the Clear Quran. */
const production: TranslationResource[] = [
  resource(131, 'english', 'Dr. Mustafa Khattab, The Clear Quran'),
  ...prelive,
];

describe('resolveTranslationIds', () => {
  it('keeps the requested edition when it exists', () => {
    expect(
      resolveTranslationIds({ requested: [131], available: production, locale: 'en' }),
    ).toEqual([131]);
  });

  it('falls back to an available English edition when the default is missing', () => {
    // The exact pre-live case that produced Arabic-only output.
    expect(resolveTranslationIds({ requested: [131], available: prelive, locale: 'en' })).toEqual([
      85,
    ]);
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
      resolveTranslationIds({ requested: [131, 161], available: prelive, locale: 'en' }),
    ).toEqual([161]);
  });

  it('passes the request through untouched while the catalogue is still loading', () => {
    // Blocking the reader on catalogue validation would be worse than briefly
    // requesting an edition that might not resolve.
    expect(resolveTranslationIds({ requested: [131], available: [], locale: 'en' })).toEqual([131]);
  });

  it('falls back to English when nothing matches the locale', () => {
    expect(resolveTranslationIds({ requested: [999], available: prelive, locale: 'ur' })).toEqual([
      85,
    ]);
  });

  it('returns nothing rather than guessing when the catalogue is unusable', () => {
    expect(
      resolveTranslationIds({
        requested: [131],
        available: [resource(1, 'klingon')],
        locale: 'en',
      }),
    ).toEqual([]);
  });

  it('never returns an id absent from the catalogue', () => {
    for (const locale of ['en', 'bn', 'ur']) {
      const ids = resolveTranslationIds({ requested: [131, 999], available: prelive, locale });
      const availableIds = new Set(prelive.map((r) => r.id));
      for (const id of ids) expect(availableIds.has(id)).toBe(true);
    }
  });
});

describe('defaultTranslationIdsFor', () => {
  it('prefers the production edition for a fresh install', () => {
    expect(defaultTranslationIdsFor('en')).toEqual([131]);
    expect(defaultTranslationIdsFor('bn')).toEqual([161]);
  });

  it('falls back to English for an unconfigured locale', () => {
    expect(defaultTranslationIdsFor('ur')).toEqual([131]);
  });
});
