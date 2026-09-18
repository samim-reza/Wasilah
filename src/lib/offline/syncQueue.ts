/**
 * Durable offline write queue, backed by SQLite.
 *
 * SQLite rather than AsyncStorage because the queue needs ordered reads,
 * per-row deletion and an attempt counter — all of which become read-modify-
 * write races on a single JSON blob, and a lost write here is a lost reading
 * session.
 *
 * The contract every consumer relies on:
 *   • order is preserved (ascending id),
 *   • an entry is removed only after the server confirms it,
 *   • an entry that keeps failing is abandoned rather than blocking the queue.
 */
import * as SQLite from 'expo-sqlite';

import { logger } from '@/lib/monitoring/logger';

import type { QueuedOperation, SyncPayload, SyncOperationType } from './types';

const DATABASE_NAME = 'wasilah-offline.db';

/**
 * After this many failures an entry is discarded.
 *
 * Retrying forever would mean one malformed entry (say, from a version that
 * shipped a bad payload) permanently blocks every later write.
 */
export const MAX_SYNC_ATTEMPTS = 5;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // WAL keeps a queue write from blocking a concurrent read, which matters
  // because the UI reads the pending count while the flush is running.
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS sync_queue_user_idx ON sync_queue (user_id, id);
  `);

  return database;
}

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= openDatabase();
  return databasePromise;
}

interface QueueRow {
  id: number;
  type: string;
  payload: string;
  user_id: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

function toOperation(row: QueueRow): QueuedOperation | null {
  try {
    return {
      id: row.id,
      type: row.type as SyncOperationType,
      payload: JSON.parse(row.payload) as SyncPayload['data'],
      userId: row.user_id,
      createdAt: row.created_at,
      attempts: row.attempts,
      lastError: row.last_error,
    };
  } catch (error) {
    // An unparseable payload can never succeed; report it and let the caller
    // drop it rather than retrying a corrupt row forever.
    logger.warn('sync.payloadUnparseable', { id: row.id, error });
    return null;
  }
}

export async function enqueue(operation: SyncPayload, userId: string): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    'INSERT INTO sync_queue (type, payload, user_id, created_at) VALUES (?, ?, ?, ?)',
    operation.type,
    JSON.stringify(operation.data),
    userId,
    new Date().toISOString(),
  );

  logger.debug('sync.enqueued', { type: operation.type });
}

/** Oldest-first, so writes replay in the order the user made them. */
export async function peekBatch(userId: string, limit = 50): Promise<QueuedOperation[]> {
  const database = await getDatabase();

  const rows = await database.getAllAsync<QueueRow>(
    'SELECT * FROM sync_queue WHERE user_id = ? ORDER BY id ASC LIMIT ?',
    userId,
    limit,
  );

  const operations: QueuedOperation[] = [];
  for (const row of rows) {
    const operation = toOperation(row);
    if (operation) operations.push(operation);
    else await remove(row.id);
  }
  return operations;
}

export async function remove(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
}

export async function recordFailure(id: number, message: string): Promise<boolean> {
  const database = await getDatabase();

  await database.runAsync(
    'UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
    message.slice(0, 500),
    id,
  );

  const row = await database.getFirstAsync<{ attempts: number }>(
    'SELECT attempts FROM sync_queue WHERE id = ?',
    id,
  );

  const exhausted = (row?.attempts ?? 0) >= MAX_SYNC_ATTEMPTS;
  if (exhausted) {
    logger.warn('sync.entryDiscarded', { id, attempts: row?.attempts });
    await remove(id);
  }
  return exhausted;
}

export async function pendingCount(userId: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ?',
    userId,
  );
  return row?.count ?? 0;
}

/**
 * Clears another user's leftovers. Called on sign-in so a shared device never
 * replays one person's reading into another person's account.
 */
export async function clearForOtherUsers(currentUserId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sync_queue WHERE user_id != ?', currentUserId);
}

/**
 * Entries recorded before sign-in are stored under this id and adopted by the
 * first user to sign in, so a guest's reading is not lost when they create an
 * account.
 */
export const GUEST_USER_ID = '__guest__';

export async function adoptGuestEntries(userId: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'UPDATE sync_queue SET user_id = ? WHERE user_id = ?',
    userId,
    GUEST_USER_ID,
  );
  return result.changes;
}
