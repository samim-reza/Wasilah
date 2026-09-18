/**
 * Replays queued writes against Supabase.
 *
 * Conflict policy, chosen per operation rather than globally:
 *
 *   reading_session  Server merges. The RPC is idempotent on
 *                    `clientSessionId` and ADDS to the day's totals, so a
 *                    replay can never double-count and two devices reading the
 *                    same day both contribute.
 *
 *   bookmark / note  Last write wins, by `updatedAt`. These are small, personal
 *                    and rarely edited from two devices at once; anything more
 *                    elaborate would cost more than it saves.
 *
 *   position_save    Newest timestamp wins. A stale "continue reading" marker
 *                    is worse than an unsynced one.
 *
 * Nothing here blindly overwrites server state with a whole local snapshot.
 */
import { AppError, toAppError } from '@/lib/api/errors';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

import { peekBatch, recordFailure, remove } from './syncQueue';
import type {
  BookmarkPayload,
  NotePayload,
  PositionPayload,
  QueuedOperation,
  ReadingSessionPayload,
  SyncResult,
} from './types';

async function applyReadingSession(payload: ReadingSessionPayload): Promise<void> {
  const { error } = await supabase.rpc('record_reading_session', {
    p_client_session_id: payload.clientSessionId,
    p_started_at: payload.startedAt,
    p_ended_at: payload.endedAt,
    p_local_date: payload.localDate,
    p_timezone: payload.timezone,
    p_verses_read: payload.versesRead,
    p_pages_read: payload.pagesRead,
    p_rukus_read: payload.rukusRead,
    p_chapter_id: payload.chapterId,
    p_start_verse: payload.startVerse,
    p_end_verse: payload.endVerse,
    p_source: payload.source,
  });

  if (error) throw new AppError('server', error.message, { cause: error });
}

async function applyBookmarkAdd(payload: BookmarkPayload, userId: string): Promise<void> {
  const { error } = await supabase.from('bookmarks').upsert(
    {
      user_id: userId,
      verse_key: payload.verseKey,
      chapter_id: payload.chapterId,
      verse_number: payload.verseNumber,
      collection_id: payload.collectionId,
    },
    { onConflict: 'user_id,verse_key', ignoreDuplicates: true },
  );

  if (error) throw new AppError('server', error.message, { cause: error });
}

async function applyBookmarkRemove(verseKey: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('verse_key', verseKey);

  if (error) throw new AppError('server', error.message, { cause: error });
}

async function applyNoteSave(payload: NotePayload, userId: string): Promise<void> {
  const { error } = await supabase.from('notes').upsert(
    {
      user_id: userId,
      verse_key: payload.verseKey,
      chapter_id: payload.chapterId,
      verse_number: payload.verseNumber,
      body: payload.body,
    },
    { onConflict: 'user_id,verse_key' },
  );

  if (error) throw new AppError('server', error.message, { cause: error });
}

async function applyNoteDelete(verseKey: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('user_id', userId)
    .eq('verse_key', verseKey);

  if (error) throw new AppError('server', error.message, { cause: error });
}

async function applyPositionSave(payload: PositionPayload, userId: string): Promise<void> {
  // Guard against an older queued position overwriting a newer one that another
  // device already synced.
  const { data: existing } = await supabase
    .from('reading_positions')
    .select('updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.updated_at && existing.updated_at > payload.updatedAt) {
    logger.debug('sync.positionSkippedAsStale');
    return;
  }

  const { error } = await supabase.from('reading_positions').upsert({
    user_id: userId,
    verse_key: payload.verseKey,
    chapter_id: payload.chapterId,
    verse_number: payload.verseNumber,
  });

  if (error) throw new AppError('server', error.message, { cause: error });
}

async function applyOperation(operation: QueuedOperation): Promise<void> {
  switch (operation.type) {
    case 'reading_session':
      return applyReadingSession(operation.payload as ReadingSessionPayload);
    case 'bookmark_add':
      return applyBookmarkAdd(operation.payload as BookmarkPayload, operation.userId);
    case 'bookmark_remove':
      return applyBookmarkRemove(
        (operation.payload as { verseKey: string }).verseKey,
        operation.userId,
      );
    case 'note_save':
      return applyNoteSave(operation.payload as NotePayload, operation.userId);
    case 'note_delete':
      return applyNoteDelete(
        (operation.payload as { verseKey: string }).verseKey,
        operation.userId,
      );
    case 'position_save':
      return applyPositionSave(operation.payload as PositionPayload, operation.userId);
  }
}

/**
 * Drains the queue for one user.
 *
 * Stops at the first offline error rather than burning through every entry's
 * retry budget while there is no connection — those failures say nothing about
 * the entries themselves.
 */
export async function flushQueue(userId: string): Promise<SyncResult> {
  const result: SyncResult = { flushed: 0, failed: 0, discarded: 0 };
  const batch = await peekBatch(userId);

  for (const operation of batch) {
    try {
      await applyOperation(operation);
      await remove(operation.id);
      result.flushed += 1;
    } catch (error) {
      const appError = toAppError(error);

      if (appError.kind === 'offline' || appError.kind === 'timeout') {
        logger.debug('sync.pausedWhileOffline', { remaining: batch.length - result.flushed });
        break;
      }

      const discarded = await recordFailure(operation.id, appError.message);
      result.failed += 1;
      if (discarded) result.discarded += 1;
    }
  }

  if (result.flushed > 0 || result.failed > 0) {
    logger.info('sync.flushed', { ...result });
  }
  return result;
}
