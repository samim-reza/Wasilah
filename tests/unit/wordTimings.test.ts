import {
  activeWordPosition,
  hasWordTimings,
  parseWordTimings,
} from '@/features/quran/utils/wordTimings';

describe('parseWordTimings', () => {
  it('returns nothing when the reciter supplies no timings', () => {
    expect(parseWordTimings(null)).toEqual([]);
    expect(parseWordTimings(undefined)).toEqual([]);
    expect(parseWordTimings([])).toEqual([]);
  });

  it('reads the common three-number tuple', () => {
    expect(
      parseWordTimings([
        [1, 0, 500],
        [2, 500, 900],
      ]),
    ).toEqual([
      { position: 1, startMs: 0, endMs: 500 },
      { position: 2, startMs: 500, endMs: 900 },
    ]);
  });

  it('reads a four-number tuple from both ends', () => {
    // Position first, start and end last; the extra middle value varies.
    expect(parseWordTimings([[3, 99, 1000, 1400]])).toEqual([
      { position: 3, startMs: 1000, endMs: 1400 },
    ]);
  });

  it('drops malformed rows rather than throwing', () => {
    const parsed = parseWordTimings([
      [1, 0, 500],
      [2, 500],
      // A reversed span would make the active-word lookup arbitrary.
      [3, 900, 900],
      [4, 1200, 800],
      [5, 1500, 1900],
    ]);
    expect(parsed.map((timing) => timing.position)).toEqual([1, 5]);
  });

  it('sorts by start time so playback order is reliable', () => {
    const parsed = parseWordTimings([
      [2, 500, 900],
      [1, 0, 500],
    ]);
    expect(parsed.map((timing) => timing.position)).toEqual([1, 2]);
  });
});

describe('activeWordPosition', () => {
  const timings = parseWordTimings([
    [1, 0, 500],
    [2, 500, 900],
    [3, 1000, 1400],
  ]);

  it('finds the word covering the position', () => {
    expect(activeWordPosition(timings, 0)).toBe(1);
    expect(activeWordPosition(timings, 499)).toBe(1);
    expect(activeWordPosition(timings, 500)).toBe(2);
  });

  it('highlights nothing in a gap between words', () => {
    expect(activeWordPosition(timings, 950)).toBeNull();
  });

  it('highlights nothing past the end', () => {
    expect(activeWordPosition(timings, 5000)).toBeNull();
  });

  it('highlights nothing when there are no timings', () => {
    expect(activeWordPosition([], 100)).toBeNull();
  });
});

describe('hasWordTimings', () => {
  it('distinguishes a reciter with timings from one without', () => {
    expect(hasWordTimings([[1, 0, 500]])).toBe(true);
    expect(hasWordTimings(null)).toBe(false);
    expect(hasWordTimings([[1, 500]])).toBe(false);
  });
});
