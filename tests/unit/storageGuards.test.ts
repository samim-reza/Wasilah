/**
 * Storage guard tests.
 *
 * The shapes below are not invented: `{verseKey, chapterId, verseNumber}` and
 * `[{verseKey}]` are precisely the two values that shared one key and crashed
 * the home screen. Each guard must reject the other one's shape.
 */
import { hasNumberKeys, hasStringKeys, isArrayOf, isRecord } from '@/lib/storage/guards';

describe('isRecord', () => {
  it('accepts a plain object', () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('rejects arrays, which are objects but not records', () => {
    // This is the distinction the crash turned on.
    expect(isRecord([])).toBe(false);
    expect(isRecord([{ verseKey: '2:255' }])).toBe(false);
  });

  it('rejects null and primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord('string')).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});

describe('isArrayOf', () => {
  const isVerseEntry = (entry: unknown): entry is { verseKey: string } =>
    isRecord(entry) && typeof entry['verseKey'] === 'string';
  const guard = isArrayOf(isVerseEntry);

  it('accepts a matching array', () => {
    expect(guard([{ verseKey: '2:255' }, { verseKey: '1:1' }])).toBe(true);
  });

  it('accepts an empty array', () => {
    expect(guard([])).toBe(true);
  });

  it('rejects an object — the exact shape that collided with this key', () => {
    expect(guard({ verseKey: '2:255', chapterId: 2, verseNumber: 255 })).toBe(false);
  });

  it('rejects an array with any bad entry', () => {
    expect(guard([{ verseKey: '2:255' }, { chapterId: 2 }])).toBe(false);
    expect(guard([null])).toBe(false);
  });
});

describe('hasStringKeys / hasNumberKeys', () => {
  it('requires every named key to be present and of the right type', () => {
    const guard = hasStringKeys('verseKey', 'updatedAt');

    expect(guard({ verseKey: '2:255', updatedAt: '2026-09-19' })).toBe(true);
    expect(guard({ verseKey: '2:255' })).toBe(false);
    expect(guard({ verseKey: 2, updatedAt: 'x' })).toBe(false);
  });

  it('rejects an array even when indices would coincidentally match', () => {
    expect(hasNumberKeys('0')([1, 2, 3])).toBe(false);
  });
});
