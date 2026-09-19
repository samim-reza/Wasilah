/**
 * Search response mapping.
 *
 * The Quran Foundation search service is a different API from the Content API:
 * a different host prefix (`/search/api/v1`), a different parameter vocabulary
 * (`query`/`mode` rather than `q`), a different OAuth scope — and, critically,
 * a response that contains verse KEYS and nothing else. No Arabic, no
 * translation, no highlight markers, regardless of the parameters sent.
 *
 * These tests pin that shape down, because the failure mode when it is
 * misunderstood is silent: the service answers 200 with an empty result set
 * rather than an error.
 */
import { mapSearchResponse } from '@/features/quran/services/quranMapper';
import type { QfSearchResponse } from '@/lib/quran/types';

function response(overrides: Partial<QfSearchResponse['result']> = {}): QfSearchResponse {
  return {
    result: {
      navigation: [],
      verses: [],
      ...overrides,
    },
    pagination: {
      per_page: 20,
      current_page: 1,
      next_page: null,
      total_pages: 1,
      total_records: 0,
    },
  } as QfSearchResponse;
}

describe('mapSearchResponse', () => {
  it('returns the keys in the order the service ranked them', () => {
    const mapped = mapSearchResponse(
      response({
        verses: [
          { key: '2:255', result_type: 'ayah', isArabic: false, isTransliteration: false },
          { key: '1:1', result_type: 'ayah', isArabic: false, isTransliteration: false },
        ],
      }),
    );

    // Not sorted: relevance order is the only thing the service gives us, and
    // re-ordering by verse number would throw the search result away.
    expect(mapped.verseKeys).toEqual(['2:255', '1:1']);
  });

  it('ignores non-ayah results', () => {
    // `navigation` entries are surah/juz/page jumps, which this screen does not
    // render. A non-ayah `result_type` inside `verses` would likewise not
    // resolve against the verse endpoint.
    const mapped = mapSearchResponse(
      response({
        navigation: [{ key: '2', result_type: 'surah' }],
        verses: [
          { key: '2:255', result_type: 'ayah', isArabic: false, isTransliteration: false },
          { key: '18', result_type: 'surah', isArabic: false, isTransliteration: false },
        ],
      }),
    );

    expect(mapped.verseKeys).toEqual(['2:255']);
  });

  it('carries pagination through so the list knows whether to fetch more', () => {
    const raw = response({
      verses: [{ key: '1:1', result_type: 'ayah', isArabic: false, isTransliteration: false }],
    });
    raw.pagination = {
      per_page: 20,
      current_page: 3,
      next_page: 4,
      total_pages: 10,
      total_records: 200,
    };

    const mapped = mapSearchResponse(raw);

    expect(mapped.currentPage).toBe(3);
    expect(mapped.totalPages).toBe(10);
    expect(mapped.totalResults).toBe(200);
  });

  it('survives a response with no result block at all', () => {
    // Defensive: a 200 with an unexpected body should render "no results",
    // not crash the screen.
    const mapped = mapSearchResponse({} as QfSearchResponse);

    expect(mapped.verseKeys).toEqual([]);
    expect(mapped.totalResults).toBe(0);
  });
});
