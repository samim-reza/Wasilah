/**
 * Typed JSON key-value storage backed by AsyncStorage.
 *
 * Wrapped rather than used directly so that: reads never throw into calling
 * code (a corrupt value should degrade to "no value", not crash a screen), and
 * so the backing store can later be swapped for MMKV without touching callers.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/lib/monitoring/logger';

import type { StorageKey } from './storageKeys';

async function get<T>(key: StorageKey): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
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
