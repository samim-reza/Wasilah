/**
 * Bookmark and collection persistence.
 *
 * Writes go through the offline queue so bookmarking works with no connection,
 * which matters more here than almost anywhere else: people bookmark an ayah in
 * the moment they read it, not when they happen to have signal.
 */
import { GUEST_USER_ID, enqueue } from '@/lib/offline/syncQueue';
import { parseVerseKey } from '@/features/quran/utils/verseKey';
import { supabase } from '@/lib/supabase/client';
import { fromPostgrestError } from '@/lib/supabase/errors';
import type { BookmarkCollectionRow, BookmarkRow } from '@/lib/supabase/database.types';

export interface Bookmark {
  id: string;
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  collectionId: string | null;
  createdAt: string;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
}

function toBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    verseKey: row.verse_key,
    chapterId: row.chapter_id,
    verseNumber: row.verse_number,
    collectionId: row.collection_id,
    createdAt: row.created_at,
  };
}

function toCollection(row: BookmarkCollectionRow): BookmarkCollection {
  return { id: row.id, name: row.name, color: row.color, sortOrder: row.sort_order };
}

export async function fetchBookmarks(userId: string): Promise<Bookmark[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw fromPostgrestError(error, { userId });
  return (data ?? []).map(toBookmark);
}

export async function addBookmark(
  verseKey: string,
  userId: string | null,
  collectionId: string | null = null,
): Promise<void> {
  const address = parseVerseKey(verseKey);
  if (!address) throw new Error(`Invalid verse key: ${verseKey}`);

  await enqueue(
    {
      type: 'bookmark_add',
      data: {
        verseKey,
        chapterId: address.chapterId,
        verseNumber: address.verseNumber,
        collectionId,
      },
    },
    userId ?? GUEST_USER_ID,
  );
}

export async function removeBookmark(verseKey: string, userId: string | null): Promise<void> {
  await enqueue({ type: 'bookmark_remove', data: { verseKey } }, userId ?? GUEST_USER_ID);
}

export async function fetchCollections(userId: string): Promise<BookmarkCollection[]> {
  const { data, error } = await supabase
    .from('bookmark_collections')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) throw fromPostgrestError(error, { userId });
  return (data ?? []).map(toCollection);
}

export async function createCollection(
  userId: string,
  name: string,
  color: string | null = null,
): Promise<BookmarkCollection> {
  const { data, error } = await supabase
    .from('bookmark_collections')
    .insert({ user_id: userId, name: name.trim(), color, sort_order: 0 })
    .select()
    .single();

  if (error) throw fromPostgrestError(error, { userId });
  return toCollection(data);
}

export async function deleteCollection(userId: string, collectionId: string): Promise<void> {
  // Bookmarks survive: the foreign key is ON DELETE SET NULL, so they are
  // un-filed rather than destroyed along with the folder.
  const { error } = await supabase
    .from('bookmark_collections')
    .delete()
    .eq('user_id', userId)
    .eq('id', collectionId);

  if (error) throw fromPostgrestError(error, { userId });
}
