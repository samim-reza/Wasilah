/**
 * Personal notes on ayahs.
 *
 * These are the most private thing in the app. Three rules follow from that and
 * are enforced here and in the schema:
 *   • a note is only ever readable by its author (RLS),
 *   • note text never appears in logs, analytics or crash reports,
 *   • nothing is ever pre-filled or generated — a note contains what the user
 *     wrote and nothing else.
 */
import { parseVerseKey } from '@/features/quran/utils/verseKey';
import { GUEST_USER_ID, enqueue } from '@/lib/offline/syncQueue';
import { supabase } from '@/lib/supabase/client';
import type { NoteRow } from '@/lib/supabase/database.types';
import { fromPostgrestError } from '@/lib/supabase/errors';

export interface Note {
  id: string;
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Matches the CHECK constraint on `notes.body`. */
export const MAX_NOTE_LENGTH = 10_000;

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    verseKey: row.verse_key,
    chapterId: row.chapter_id,
    verseNumber: row.verse_number,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw fromPostgrestError(error, { userId });
  return (data ?? []).map(toNote);
}

export async function saveNote(
  verseKey: string,
  body: string,
  userId: string | null,
): Promise<void> {
  const address = parseVerseKey(verseKey);
  if (!address) throw new Error(`Invalid verse key: ${verseKey}`);

  const trimmed = body.trim();
  if (trimmed.length === 0) {
    await deleteNote(verseKey, userId);
    return;
  }

  await enqueue(
    {
      type: 'note_save',
      data: {
        verseKey,
        chapterId: address.chapterId,
        verseNumber: address.verseNumber,
        body: trimmed.slice(0, MAX_NOTE_LENGTH),
      },
    },
    userId ?? GUEST_USER_ID,
  );
}

export async function deleteNote(verseKey: string, userId: string | null): Promise<void> {
  await enqueue({ type: 'note_delete', data: { verseKey } }, userId ?? GUEST_USER_ID);
}
