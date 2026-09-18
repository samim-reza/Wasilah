/**
 * "Continue reading" position.
 *
 * Written on every meaningful scroll, so it is throttled and stored locally
 * first: the home screen must be able to show where the user left off before
 * any network call completes, and on a device that has been offline for days.
 */
import { parseVerseKey } from '@/features/quran/utils/verseKey';
import { GUEST_USER_ID, enqueue } from '@/lib/offline/syncQueue';
import { isRecord } from '@/lib/storage/guards';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { supabase } from '@/lib/supabase/client';
import { fromPostgrestError } from '@/lib/supabase/errors';

export interface ReadingPosition {
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  updatedAt: string;
}

/**
 * A position must carry a usable chapter and verse, or "continue reading" sends
 * the user to `/quran/undefined`.
 */
function isReadingPosition(value: unknown): value is ReadingPosition {
  return (
    isRecord(value) &&
    typeof value['verseKey'] === 'string' &&
    typeof value['chapterId'] === 'number' &&
    typeof value['verseNumber'] === 'number'
  );
}

export async function getLocalPosition(): Promise<ReadingPosition | null> {
  return keyValueStore.get<ReadingPosition>(storageKeys.lastReadPosition, isReadingPosition);
}

/**
 * Records where the user is.
 *
 * Local storage is updated immediately; the server write is queued. If the
 * server has a NEWER position (another device), the sync processor keeps that
 * one rather than letting a stale local value win.
 */
export async function savePosition(verseKey: string, userId: string | null): Promise<void> {
  const address = parseVerseKey(verseKey);
  if (!address) return;

  const position: ReadingPosition = {
    verseKey,
    chapterId: address.chapterId,
    verseNumber: address.verseNumber,
    updatedAt: new Date().toISOString(),
  };

  await keyValueStore.set(storageKeys.lastReadPosition, position);
  await enqueue({ type: 'position_save', data: position }, userId ?? GUEST_USER_ID);
}

/** The server's position, used to adopt progress made on another device. */
export async function fetchRemotePosition(userId: string): Promise<ReadingPosition | null> {
  const { data, error } = await supabase
    .from('reading_positions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw fromPostgrestError(error, { userId });
  if (!data) return null;

  return {
    verseKey: data.verse_key,
    chapterId: data.chapter_id,
    verseNumber: data.verse_number,
    updatedAt: data.updated_at,
  };
}

/**
 * Resolves local and remote positions.
 *
 * Newest wins. A position is a "where was I" marker, and the most recent
 * reading is always the better answer.
 */
export function resolvePosition(
  local: ReadingPosition | null,
  remote: ReadingPosition | null,
): ReadingPosition | null {
  if (!local) return remote;
  if (!remote) return local;
  return remote.updatedAt > local.updatedAt ? remote : local;
}
