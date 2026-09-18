/**
 * Publishes the shared Today's Ayah for a date.
 *
 * The client has a deterministic local fallback, so this function is not
 * required for the feature to work. What it adds is a SHARED selection: everyone
 * seeing the same ayah on the same day is what makes sharing it meaningful, and
 * it leaves room for a curated choice during Ramadan or on a particular
 * occasion.
 *
 * GET  — returns today's selection (public; no account needed).
 * POST — publishes a selection for a date (service role only).
 */
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts';

/** Verse counts per surah, used to validate a published selection. */
const CHAPTER_VERSE_COUNTS: Record<number, number> = {
  1: 7,
  2: 286,
  3: 200,
  4: 176,
  5: 120,
  6: 165,
  7: 206,
  8: 75,
  9: 129,
  10: 109,
  11: 123,
  12: 111,
  13: 43,
  14: 52,
  15: 99,
  16: 128,
  17: 111,
  18: 110,
  19: 98,
  20: 135,
  21: 112,
  22: 78,
  23: 118,
  24: 64,
  25: 77,
  26: 227,
  27: 93,
  28: 88,
  29: 69,
  30: 60,
  31: 34,
  32: 30,
  33: 73,
  34: 54,
  35: 45,
  36: 83,
  37: 182,
  38: 88,
  39: 75,
  40: 85,
  41: 54,
  42: 53,
  43: 89,
  44: 59,
  45: 37,
  46: 35,
  47: 38,
  48: 29,
  49: 18,
  50: 45,
  51: 60,
  52: 49,
  53: 62,
  54: 55,
  55: 78,
  56: 96,
  57: 29,
  58: 22,
  59: 24,
  60: 13,
  61: 14,
  62: 11,
  63: 11,
  64: 18,
  65: 12,
  66: 12,
  67: 30,
  68: 52,
  69: 52,
  70: 44,
  71: 28,
  72: 28,
  73: 20,
  74: 56,
  75: 40,
  76: 31,
  77: 50,
  78: 40,
  79: 46,
  80: 42,
  81: 29,
  82: 19,
  83: 36,
  84: 25,
  85: 22,
  86: 17,
  87: 19,
  88: 26,
  89: 30,
  90: 20,
  91: 15,
  92: 21,
  93: 11,
  94: 8,
  95: 8,
  96: 19,
  97: 5,
  98: 8,
  99: 8,
  100: 11,
  101: 11,
  102: 8,
  103: 3,
  104: 9,
  105: 5,
  106: 4,
  107: 7,
  108: 3,
  109: 6,
  110: 3,
  111: 5,
  112: 4,
  113: 5,
  114: 6,
};

function isValidSelection(chapterId: number, verseNumber: number): boolean {
  const total = CHAPTER_VERSE_COUNTS[chapterId];
  return total !== undefined && verseNumber >= 1 && verseNumber <= total;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (request: Request): Promise<Response> => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  const supabase = createAdminClient();
  const url = new URL(request.url);

  if (request.method === 'GET') {
    // The date is supplied by the client, because only the device knows the
    // user's local day. It is validated rather than trusted.
    const requested = url.searchParams.get('date') ?? todayUtc();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requested)) {
      return errorResponse(400, 'invalid_date', 'date must be YYYY-MM-DD.');
    }

    const { data, error } = await supabase
      .from('daily_ayah_selections')
      .select('selection_date, verse_key, chapter_id, verse_number, curator_note')
      .eq('selection_date', requested)
      .maybeSingle();

    if (error) return errorResponse(500, 'query_failed', 'Could not load the selection.');
    if (!data) return jsonResponse({ selection: null }, { cacheSeconds: 300 });

    // Cacheable for the rest of the day: a published selection does not change.
    return jsonResponse({ selection: data }, { cacheSeconds: 3600 });
  }

  if (request.method === 'POST') {
    const body = (await request.json().catch(() => null)) as {
      date?: string;
      verseKey?: string;
      curatorNote?: string;
    } | null;

    if (!body?.date || !body.verseKey) {
      return errorResponse(400, 'invalid_body', 'date and verseKey are required.');
    }

    const match = /^(\d{1,3}):(\d{1,3})$/.exec(body.verseKey);
    if (!match) return errorResponse(400, 'invalid_verse_key', 'verseKey must look like "2:255".');

    const chapterId = Number(match[1]);
    const verseNumber = Number(match[2]);

    // Refuse to publish a reference that does not exist. A Today's Ayah card
    // pointing at a non-existent ayah would be both broken and disrespectful.
    if (!isValidSelection(chapterId, verseNumber)) {
      return errorResponse(400, 'out_of_range', `${body.verseKey} is not a valid ayah.`);
    }

    const { error } = await supabase.from('daily_ayah_selections').upsert({
      selection_date: body.date,
      verse_key: body.verseKey,
      chapter_id: chapterId,
      verse_number: verseNumber,
      curator_note: body.curatorNote ?? null,
    });

    if (error) return errorResponse(500, 'write_failed', 'Could not publish the selection.');
    return jsonResponse({ published: body.verseKey, date: body.date });
  }

  return errorResponse(405, 'method_not_allowed', 'Use GET or POST.');
});
