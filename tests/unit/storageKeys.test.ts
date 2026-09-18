/**
 * Guards against two features sharing a storage slot.
 *
 * This is not hypothetical. Guest bookmarks were pointed at
 * `storageKeys.lastReadPosition`, so the reader wrote a position *object* to
 * the key the bookmarks list read as an *array*. Saving a reading position
 * corrupted the bookmark list, bookmarking corrupted "continue reading", and
 * the home screen crashed with `undefined is not a function` when it tried to
 * map over an object.
 *
 * Nothing caught it: both usages typecheck, both lint cleanly, and the values
 * are only ever the wrong shape at runtime.
 */
import { storageKeys, userScopedStorageKeys, type StorageKey } from '@/lib/storage/storageKeys';

describe('storageKeys', () => {
  const entries = Object.entries(storageKeys) as [string, StorageKey][];

  it('has no duplicate values', () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];

    for (const [name, value] of entries) {
      const existing = seen.get(value);
      if (existing) collisions.push(`${existing} and ${name} both use "${value}"`);
      else seen.set(value, name);
    }

    expect(collisions).toEqual([]);
  });

  it('namespaces every key, so nothing can collide with another app', () => {
    for (const [name, value] of entries) {
      expect(`${name}: ${value}`).toMatch(/: wasilah\./);
    }
  });

  it('keeps the reading position and guest bookmarks apart', () => {
    // The exact collision that shipped. Named explicitly so a future
    // "simplification" that merges them fails loudly.
    expect(storageKeys.guestBookmarks).not.toBe(storageKeys.lastReadPosition);
  });

  it('only lists real keys as user-scoped', () => {
    const values = new Set(entries.map(([, value]) => value));
    for (const key of userScopedStorageKeys) expect(values.has(key)).toBe(true);
  });

  it('clears both reading position and guest bookmarks on sign-out', () => {
    // Both hold the previous user's reading; leaving either behind would show
    // one person's data to the next.
    expect(userScopedStorageKeys).toContain(storageKeys.lastReadPosition);
    expect(userScopedStorageKeys).toContain(storageKeys.guestBookmarks);
  });
});
