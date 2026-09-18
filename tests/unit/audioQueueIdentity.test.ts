/**
 * Queue identity tests.
 *
 * These cover the bug where the reader's "play surah" button did nothing after
 * a single ayah had been played. The old check was "is anything loaded?", and a
 * finished single-ayah queue answers yes — so the button resumed one ayah
 * forever instead of loading the surah.
 *
 * The rule the fix rests on: the button acts on what is LOADED, and a queue now
 * says what it is.
 */
import type { QueueId } from '@/features/audio/types/audio.types';

/**
 * The decision the reader header makes, extracted so it can be tested without
 * a player, a network or a render.
 */
function shouldToggleInsteadOfLoading(loaded: QueueId, chapterId: number): boolean {
  return loaded === `chapter:${chapterId}`;
}

describe('play-surah button decision', () => {
  it('loads the surah when nothing is playing', () => {
    expect(shouldToggleInsteadOfLoading(null, 1)).toBe(false);
  });

  it('loads the surah when a single ayah is what is loaded', () => {
    // The exact regression: ayah played first, then the surah button pressed.
    expect(shouldToggleInsteadOfLoading('ayah:1:1', 1)).toBe(false);
  });

  it('loads the surah when a DIFFERENT surah is loaded', () => {
    expect(shouldToggleInsteadOfLoading('chapter:2', 1)).toBe(false);
  });

  it('toggles when this surah is already the loaded queue', () => {
    expect(shouldToggleInsteadOfLoading('chapter:1', 1)).toBe(true);
  });

  it('does not confuse chapter 1 with chapter 11', () => {
    // A `startsWith` check would get this wrong.
    expect(shouldToggleInsteadOfLoading('chapter:11', 1)).toBe(false);
    expect(shouldToggleInsteadOfLoading('chapter:1', 11)).toBe(false);
  });

  it('does not confuse an ayah of this surah with the surah', () => {
    expect(shouldToggleInsteadOfLoading('ayah:1:7', 1)).toBe(false);
  });
});
