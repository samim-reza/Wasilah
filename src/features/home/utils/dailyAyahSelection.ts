/**
 * Deterministic Today's Ayah selection.
 *
 * Two properties matter, and a naive `Math.random()` gives neither:
 *
 *   Stability — the ayah must not change when the user pulls to refresh, opens
 *   the app again after lunch, or reopens it from a notification. A different
 *   ayah each time makes "Today's Ayah" meaningless.
 *
 *   Shareability — everyone sees the same ayah on the same day, so sharing it
 *   refers to something others recognise.
 *
 * Both follow from deriving the choice from the date alone, through a stable
 * hash. No state, no storage, no network.
 */
import type { LocalDate } from '@/lib/datetime/localDate';

/**
 * FNV-1a, 32-bit.
 *
 * Chosen for being tiny, dependency-free and well-distributed over short
 * strings. It is not a cryptographic hash and does not need to be — the only
 * requirement is that consecutive dates land far apart.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    // The FNV prime, applied with shifts to stay inside 32-bit integer maths
    // (a direct multiply overflows into float territory in JS).
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }

  return hash >>> 0;
}

export interface ChapterVerseCount {
  id: number;
  versesCount: number;
}

/**
 * Picks the ayah for a date.
 *
 * Selects uniformly across every ayah in the Quran by walking the cumulative
 * verse counts, so a long surah is proportionally more likely than a short one
 * — picking a random surah then a random ayah within it would over-represent
 * the short surahs by a wide margin.
 *
 * `salt` allows a per-user variant if that is ever wanted; leaving it empty
 * keeps the selection shared, which is the default.
 */
export function selectDailyVerseKey(
  date: LocalDate,
  chapters: readonly ChapterVerseCount[],
  salt = '',
): string | null {
  if (chapters.length === 0) return null;

  const totalVerses = chapters.reduce((sum, chapter) => sum + chapter.versesCount, 0);
  if (totalVerses <= 0) return null;

  const index = hashString(`${date}${salt}`) % totalVerses;

  let cursor = 0;
  for (const chapter of chapters) {
    if (index < cursor + chapter.versesCount) {
      return `${chapter.id}:${index - cursor + 1}`;
    }
    cursor += chapter.versesCount;
  }

  // Unreachable while the counts sum to `totalVerses`, but a deterministic
  // fallback beats returning null on an arithmetic surprise.
  const last = chapters[chapters.length - 1];
  return last ? `${last.id}:${last.versesCount}` : null;
}
