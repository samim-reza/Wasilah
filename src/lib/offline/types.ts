/**
 * Types for the offline write queue.
 *
 * Reads work offline through the TanStack Query disk cache. Writes are a
 * different problem: they must survive an app restart, replay in order, and be
 * safe to retry. That is what this queue provides.
 */

/**
 * The operations that may be queued.
 *
 * Each is idempotent on the server, which is what makes blind retry safe:
 *   reading_session  — deduplicated by `clientSessionId`
 *   bookmark_add     — unique (user, verse_key), so a repeat is a no-op
 *   bookmark_remove  — deleting an absent row succeeds
 *   note_save        — upsert on (user, verse_key)
 *   note_delete      — same as bookmark_remove
 *   position_save    — last write wins, which is the correct semantic here
 */
export type SyncOperationType =
  | 'reading_session'
  | 'bookmark_add'
  | 'bookmark_remove'
  | 'note_save'
  | 'note_delete'
  | 'position_save';

export interface ReadingSessionPayload {
  clientSessionId: string;
  startedAt: string;
  endedAt: string;
  localDate: string;
  timezone: string;
  versesRead: number;
  pagesRead: number;
  rukusRead: number;
  chapterId: number | null;
  startVerse: number | null;
  endVerse: number | null;
  source: 'reader' | 'daily_ayah' | 'audio' | 'search';
}

export interface BookmarkPayload {
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  collectionId: string | null;
}

export interface NotePayload {
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  body: string;
}

export interface PositionPayload {
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  updatedAt: string;
}

export type SyncPayload =
  | { type: 'reading_session'; data: ReadingSessionPayload }
  | { type: 'bookmark_add'; data: BookmarkPayload }
  | { type: 'bookmark_remove'; data: { verseKey: string } }
  | { type: 'note_save'; data: NotePayload }
  | { type: 'note_delete'; data: { verseKey: string } }
  | { type: 'position_save'; data: PositionPayload };

export interface QueuedOperation {
  id: number;
  type: SyncOperationType;
  payload: SyncPayload['data'];
  /** Whose queue this is; entries are dropped when a different user signs in. */
  userId: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export interface SyncResult {
  flushed: number;
  failed: number;
  /** Entries abandoned after exhausting their retries. */
  discarded: number;
}
