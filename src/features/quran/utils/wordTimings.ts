/**
 * Mapping recitation position to the word being recited.
 *
 * The Quran Foundation API returns per-word timings on a recitation's audio
 * file as `segments`, but only for reciters who have them — most do not. Every
 * function here treats missing or malformed timings as "no highlight" rather
 * than as an error, because a reader that works without highlighting is far
 * better than one that breaks when a reciter lacks the data.
 *
 * Pure: position arrives as an argument, so the sync logic is testable without
 * a player.
 */

export interface WordTiming {
  /** 1-based word position within the ayah, matching `WordSegment.position`. */
  position: number;
  startMs: number;
  endMs: number;
}

/**
 * Normalises the raw `number[][]` into timings.
 *
 * The API is not consistent about tuple length — three entries in the common
 * case, occasionally four. The first entry is always the word position and the
 * last two are always the start and end, so reading from both ends survives
 * the variation rather than guessing at the middle.
 */
export function parseWordTimings(segments: number[][] | null | undefined): WordTiming[] {
  if (!segments) return [];

  const timings: WordTiming[] = [];

  for (const segment of segments) {
    if (!Array.isArray(segment) || segment.length < 3) continue;

    const position = segment[0];
    const startMs = segment[segment.length - 2];
    const endMs = segment[segment.length - 1];

    if (
      typeof position !== 'number' ||
      typeof startMs !== 'number' ||
      typeof endMs !== 'number' ||
      // A zero-length or reversed span cannot be matched against, and would
      // make `activeWordPosition` return an arbitrary word.
      endMs <= startMs
    ) {
      continue;
    }

    timings.push({ position, startMs, endMs });
  }

  return timings.sort((a, b) => a.startMs - b.startMs);
}

/**
 * The word being recited at a given position, or null.
 *
 * Null covers three real cases that all mean "highlight nothing": the reciter
 * supplied no timings, playback is in a gap between words, and playback has
 * run past the last word.
 */
export function activeWordPosition(
  timings: readonly WordTiming[],
  positionMs: number,
): number | null {
  for (const timing of timings) {
    if (positionMs >= timing.startMs && positionMs < timing.endMs) {
      return timing.position;
    }
  }
  return null;
}

/** Whether a reciter provides word timings for this ayah at all. */
export function hasWordTimings(segments: number[][] | null | undefined): boolean {
  return parseWordTimings(segments).length > 0;
}
