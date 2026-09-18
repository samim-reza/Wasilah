/**
 * Notes state, with optimistic saves so the editor closes instantly.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { queryKeys } from '@/lib/api/queryKeys';
import { trackEvent } from '@/lib/analytics/analytics';
import { bucketLength } from '@/lib/analytics/events';

import { deleteNote, fetchNotes, saveNote, type Note } from '../services/noteService';

export interface UseNotesResult {
  notes: Note[];
  notesByVerse: Map<string, Note>;
  isLoading: boolean;
  error: unknown;
  getNote: (verseKey: string) => Note | undefined;
  save: (verseKey: string, body: string) => Promise<void>;
  remove: (verseKey: string) => Promise<void>;
}

export function useNotes(): UseNotesResult {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.library.notes(userId ?? 'guest');

  const query = useQuery<Note[]>({
    queryKey,
    // Guests have no notes list: notes require an account, because a note lost
    // to a reinstall is worse than one that needed a sign-in.
    queryFn: () => (userId ? fetchNotes(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  });

  const notesByVerse = useMemo(() => {
    const map = new Map<string, Note>();
    for (const note of query.data ?? []) map.set(note.verseKey, note);
    return map;
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: ({ verseKey, body }: { verseKey: string; body: string }) =>
      saveNote(verseKey, body, userId),
    onSuccess: (_result, { body }) => {
      // Only the length bucket is reported — never the text.
      trackEvent('note_saved', { length_bucket: bucketLength(body.length) });
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (verseKey: string) => deleteNote(verseKey, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const getNote = useCallback((verseKey: string) => notesByVerse.get(verseKey), [notesByVerse]);

  const save = useCallback(
    async (verseKey: string, body: string) => {
      await saveMutation.mutateAsync({ verseKey, body });
    },
    [saveMutation],
  );

  const remove = useCallback(
    async (verseKey: string) => {
      await deleteMutation.mutateAsync(verseKey);
    },
    [deleteMutation],
  );

  return {
    notes: query.data ?? [],
    notesByVerse,
    isLoading: query.isLoading,
    error: query.error,
    getNote,
    save,
    remove,
  };
}
