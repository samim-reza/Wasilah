/**
 * The allowlist of Quran Foundation Content API routes this proxy will forward.
 *
 * An allowlist rather than a pass-through: without one, anyone holding the
 * public anon key could use our credentials to call arbitrary QF endpoints,
 * burning our rate limit and putting us in breach of the developer terms.
 *
 * Each entry also declares how long its response may be cached. The Quran
 * Foundation developer terms cap ordinary Content API caching at one week, so
 * no value here may exceed that without a documented Content Sync exception.
 */

const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;

export interface RouteRule {
  /** Regular expression matched against the path after the API prefix. */
  readonly pattern: RegExp;
  /** Seconds this response may be cached at the edge and on device. */
  readonly cacheSeconds: number;
  /** Query parameters that may be forwarded. Everything else is dropped. */
  readonly allowedParams: readonly string[];
}

/** Parameters every content endpoint accepts. */
const COMMON_PARAMS = ['language', 'fields', 'page', 'per_page'] as const;

const VERSE_PARAMS = [
  ...COMMON_PARAMS,
  'translations',
  'translation_fields',
  'tafsirs',
  'audio',
  'words',
  'word_fields',
  'mushaf',
  'from',
  'to',
] as const;

export const routeRules: readonly RouteRule[] = [
  // --- Structure: effectively immutable, cache for the maximum permitted. ---
  { pattern: /^\/chapters$/, cacheSeconds: ONE_WEEK, allowedParams: COMMON_PARAMS },
  { pattern: /^\/chapters\/\d{1,3}$/, cacheSeconds: ONE_WEEK, allowedParams: COMMON_PARAMS },
  { pattern: /^\/chapters\/\d{1,3}\/info$/, cacheSeconds: ONE_WEEK, allowedParams: COMMON_PARAMS },
  { pattern: /^\/juzs$/, cacheSeconds: ONE_WEEK, allowedParams: COMMON_PARAMS },

  // --- Verses ---
  {
    pattern: /^\/verses\/by_chapter\/\d{1,3}$/,
    cacheSeconds: ONE_WEEK,
    allowedParams: VERSE_PARAMS,
  },
  { pattern: /^\/verses\/by_page\/\d{1,3}$/, cacheSeconds: ONE_WEEK, allowedParams: VERSE_PARAMS },
  { pattern: /^\/verses\/by_juz\/\d{1,2}$/, cacheSeconds: ONE_WEEK, allowedParams: VERSE_PARAMS },
  { pattern: /^\/verses\/by_hizb\/\d{1,2}$/, cacheSeconds: ONE_WEEK, allowedParams: VERSE_PARAMS },
  { pattern: /^\/verses\/by_rub\/\d{1,3}$/, cacheSeconds: ONE_WEEK, allowedParams: VERSE_PARAMS },
  {
    pattern: /^\/verses\/by_key\/\d{1,3}:\d{1,3}$/,
    cacheSeconds: ONE_WEEK,
    allowedParams: VERSE_PARAMS,
  },
  { pattern: /^\/verses\/random$/, cacheSeconds: 0, allowedParams: VERSE_PARAMS },

  // --- Quran text-only endpoints (lighter payloads for the Mushaf view) ---
  {
    pattern: /^\/quran\/verses\/(uthmani|uthmani_simple|imlaei|indopak)$/,
    cacheSeconds: ONE_WEEK,
    allowedParams: [...COMMON_PARAMS, 'chapter_number', 'juz_number', 'page_number', 'verse_key'],
  },
  {
    pattern: /^\/quran\/translations\/\d+$/,
    cacheSeconds: ONE_WEEK,
    allowedParams: [...COMMON_PARAMS, 'chapter_number', 'juz_number', 'page_number', 'verse_key'],
  },
  {
    pattern: /^\/quran\/tafsirs\/\d+$/,
    cacheSeconds: ONE_WEEK,
    allowedParams: [...COMMON_PARAMS, 'chapter_number', 'juz_number', 'page_number', 'verse_key'],
  },

  // --- Resource catalogues ---
  { pattern: /^\/resources\/translations$/, cacheSeconds: ONE_DAY, allowedParams: COMMON_PARAMS },
  { pattern: /^\/resources\/tafsirs$/, cacheSeconds: ONE_DAY, allowedParams: COMMON_PARAMS },
  { pattern: /^\/resources\/recitations$/, cacheSeconds: ONE_DAY, allowedParams: COMMON_PARAMS },
  { pattern: /^\/resources\/languages$/, cacheSeconds: ONE_WEEK, allowedParams: COMMON_PARAMS },
  {
    pattern: /^\/resources\/chapter_reciters$/,
    cacheSeconds: ONE_DAY,
    allowedParams: COMMON_PARAMS,
  },

  // --- Audio ---
  {
    pattern: /^\/recitations\/\d+\/by_chapter\/\d{1,3}$/,
    cacheSeconds: ONE_DAY,
    allowedParams: COMMON_PARAMS,
  },
  {
    pattern: /^\/recitations\/\d+\/by_juz\/\d{1,2}$/,
    cacheSeconds: ONE_DAY,
    allowedParams: COMMON_PARAMS,
  },
  {
    pattern: /^\/recitations\/\d+\/by_ayah\/\d{1,3}:\d{1,3}$/,
    cacheSeconds: ONE_DAY,
    allowedParams: COMMON_PARAMS,
  },
  {
    pattern: /^\/chapter_recitations\/\d+(\/\d{1,3})?$/,
    cacheSeconds: ONE_DAY,
    allowedParams: COMMON_PARAMS,
  },

  // --- Tafsir bodies ---
  {
    pattern: /^\/tafsirs\/\d+\/by_ayah\/\d{1,3}:\d{1,3}$/,
    cacheSeconds: ONE_WEEK,
    allowedParams: COMMON_PARAMS,
  },

  // --- Search: results are query-dependent and short-lived. ---
  { pattern: /^\/search$/, cacheSeconds: 10 * 60, allowedParams: [...COMMON_PARAMS, 'q', 'size'] },
];

export interface ResolvedRoute {
  path: string;
  cacheSeconds: number;
  allowedParams: readonly string[];
}

/**
 * Returns the rule for a path, or null if the path is not allowlisted.
 * Paths are normalised to a single leading slash with no trailing slash so
 * `//chapters` and `/chapters/` cannot slip past the patterns.
 */
export function resolveRoute(rawPath: string): ResolvedRoute | null {
  const path = `/${rawPath.replace(/^\/+/, '').replace(/\/+$/, '')}`;

  // Reject traversal outright rather than relying on the patterns to exclude it.
  if (path.includes('..') || path.includes('//')) return null;

  const rule = routeRules.find((candidate) => candidate.pattern.test(path));
  if (!rule) return null;

  return { path, cacheSeconds: rule.cacheSeconds, allowedParams: rule.allowedParams };
}

/** Drops any query parameter the matched route does not declare. */
export function filterParams(params: URLSearchParams, allowed: readonly string[]): URLSearchParams {
  const filtered = new URLSearchParams();
  for (const key of allowed) {
    const values = params.getAll(key);
    for (const value of values) {
      if (value !== '') filtered.append(key, value);
    }
  }
  return filtered;
}
