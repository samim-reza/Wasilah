/**
 * Typed JSON key-value storage backed by AsyncStorage.
 *
 * Wrapped rather than used directly so that: reads never throw into calling
 * code (a corrupt value should degrade to "no value", not crash a screen), and
 * so the backing store can later be swapped for MMKV without touching callers.
 *
 * `get` accepts an optional validator, and callers reading anything structured
 * should pass one. The type parameter is a compile-time promise about a value
 * that was serialised by some *earlier* build — it says nothing about what is
 * actually on disk. A value written by a previous version, or by a bug,
 * deserialises into whatever it is, and the first `.map` or property access
 * crashes the screen. The validator turns that into "no value", which every
 * caller already handles.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/lib/monitoring/logger';

import type { StorageKey } from './storageKeys';

async function get<T>(
  key: StorageKey,
  /** Narrows the parsed value; anything it rejects is treated as absent. */
  validate?: (value: unknown) => value is T,
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);

    if (validate && !validate(parsed)) {
      // Not corrupt JSON — valid JSON of the wrong shape, which is what a key
      // collision or an older schema produces.
      logger.warn('storage.unexpectedShape', { key });
      return null;
    }

    return parsed as T;
  } catch (error) {
    // A parse failure means the stored value is unusable; drop it so the app
    // recovers on the next write instead of failing forever.
    logger.warn('storage.readFailed', { key, error });
    await AsyncStorage.removeItem(key).catch(() => undefined);
    return null;
  }
}

async function set<T>(key: StorageKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.warn('storage.writeFailed', { key, error });
  }
}

async function remove(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logger.warn('storage.removeFailed', { key, error });
  }
}

async function removeMany(keys: StorageKey[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    logger.warn('storage.removeManyFailed', { keys, error });
  }
}

export const keyValueStore = { get, set, remove, removeMany };
