/**
 * Offline write queue, web variant.
 *
 * `expo-sqlite` has no web implementation in this setup — the web bundle
 * cannot even resolve it — so this file is the platform variant Metro picks.
 * Nothing imports it directly; `./syncQueue` resolves here on web.
 *
 * Backed by `localStorage` rather than IndexedDB. The native version chose
 * SQLite because a single JSON blob turns ordered reads, per-row deletion and
 * an attempt counter into read-modify-write races. That reasoning is weaker
 * here and IndexedDB would be a lot of machinery for the difference: a browser
 * tab is online almost by definition, so this queue drains within seconds of
 * being written, and only one tab is realistically mid-write at a time.
 *
 * Two tabs writing simultaneously can still lose an entry. That is a real
 * limitation, accepted because the alternative on web is an IndexedDB layer
 * whose complexity would exceed the queue it protects. If the web app ever
 * grows offline-first ambitions, this is the file to replace.
 *
 * The exported contract matches the native module exactly — order preserved,
 * entries removed only after the server confirms, repeated failures abandoned.
 */
import { logger } from '@/lib/monitoring/logger';

import type { QueuedOperation, SyncPayload } from './types';

const STORAGE_KEY = 'wasilah.offline.queue';

/** After this many failures an entry is discarded. Mirrors the native value. */
export const MAX_SYNC_ATTEMPTS = 5;

export const GUEST_USER_ID = '__guest__';

function read(): QueuedOperation[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedOperation[]) : [];
  } catch (error) {
    // Unparseable means unusable. Dropping it lets the app recover on the next
    // write rather than failing every sync forever.
    logger.warn('syncQueue.readFailed', { error });
    return [];
  }
}

function write(entries: QueuedOperation[]): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    logger.warn('syncQueue.writeFailed', { error });
  }
}

function nextId(entries: QueuedOperation[]): number {
  // Ascending ids are what preserve ordering for `peekBatch`.
  return entries.reduce((highest, entry) => Math.max(highest, entry.id), 0) + 1;
}

export async function enqueue(operation: SyncPayload, userId: string): Promise<void> {
  const entries = read();
  entries.push({
    id: nextId(entries),
    type: operation.type,
    payload: operation.data,
    userId,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  });
  write(entries);
}

export async function peekBatch(userId: string, limit = 50): Promise<QueuedOperation[]> {
  return read()
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => a.id - b.id)
    .slice(0, limit);
}

export async function remove(id: number): Promise<void> {
  write(read().filter((entry) => entry.id !== id));
}

/** Returns true when the entry was abandoned rather than kept for retry. */
export async function recordFailure(id: number, message: string): Promise<boolean> {
  const entries = read();
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) return false;

  entry.attempts += 1;
  entry.lastError = message;

  if (entry.attempts >= MAX_SYNC_ATTEMPTS) {
    logger.warn('syncQueue.abandoned', { id, attempts: entry.attempts });
    write(entries.filter((candidate) => candidate.id !== id));
    return true;
  }

  write(entries);
  return false;
}

export async function pendingCount(userId: string): Promise<number> {
  return read().filter((entry) => entry.userId === userId).length;
}

export async function clearForOtherUsers(currentUserId: string): Promise<void> {
  write(read().filter((entry) => entry.userId === currentUserId));
}

/** Hands anything queued while signed out to the account that just signed in. */
export async function adoptGuestEntries(userId: string): Promise<number> {
  const entries = read();
  let adopted = 0;

  for (const entry of entries) {
    if (entry.userId === GUEST_USER_ID) {
      entry.userId = userId;
      adopted += 1;
    }
  }

  if (adopted > 0) write(entries);
  return adopted;
}
