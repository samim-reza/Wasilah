/**
 * The Quran reader.
 *
 * Shared by the surah, juz and page routes, which differ only in which slice of
 * the Quran they request. Everything else — pagination, session tracking,
 * bookmarks, notes, audio, preferences — is identical, so it lives here once.
 *
 * Responsibilities are deliberately thin: this screen wires together hooks that
 * each own one concern. It contains no fetching, no streak arithmetic and no
 * notification logic.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { useAudio } from '@/features/audio/hooks/AudioPlayerProvider';
import { useAyahPlayback } from '@/features/audio/hooks/useAyahAudio';
import { useBookmarks } from '@/features/bookmarks/hooks/useBookmarks';
import { NoteEditorSheet } from '@/features/notes/components/NoteEditorSheet';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { BismillahHeader } from '@/features/quran/components/BismillahHeader';
import { TafsirSheet } from '@/features/quran/components/TafsirSheet';
import { useChapter } from '@/features/quran/hooks/useChapters';
import { useResolvedTranslationIds } from '@/features/quran/hooks/useResolvedTranslations';
import { useVerses, type VerseSource } from '@/features/quran/hooks/useVerses';
import type { FlashListRef } from '@shopify/flash-list';
import { shareVerse } from '@/features/quran/services/shareService';
import type { Verse } from '@/features/quran/types/quran.types';
import { useFeatureFlag } from '@/lib/api/useFeatureFlags';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { ReaderHeader } from '../components/ReaderHeader';
import { ReaderPreferencesSheet } from '../components/ReaderPreferencesSheet';
import { VirtualizedAyahList } from '../components/VirtualizedAyahList';
import { useKeepScreenAwake } from '../hooks/useKeepScreenAwake';
import { useReaderPreferences } from '../hooks/useReaderPreferences';
import { useReadingPosition } from '../hooks/useReadingPosition';
import { useReadingSessionTracker } from '../hooks/useReadingSessionTracker';

export interface ReaderScreenProps {
  source: VerseSource;
  /** Ayah to scroll to, from a deep link or "continue reading". */
  initialVerseNumber?: number;
}

export function ReaderScreen({ source, initialVerseNumber }: ReaderScreenProps) {
  const { t, locale } = useTranslation();
  const toast = useToast();

  const { preferences, update, stepArabicFontSize, stepTranslationFontSize } =
    useReaderPreferences();

  // Reading is the one activity where the screen timing out mid-ayah is a real
  // annoyance, so the user can opt to keep it awake.
  useKeepScreenAwake(preferences.keepScreenAwake);

  const chapterId = source.kind === 'chapter' ? source.chapterId : null;
  const chapterQuery = useChapter(chapterId);

  // Validated against the catalogue this environment actually serves.
  const translationIds = useResolvedTranslationIds(preferences.translationIds);

  const versesQuery = useVerses(source, {
    translationIds: preferences.showTranslation ? translationIds : [],
    includeWords: preferences.showWordByWord,
  });

  const bookmarks = useBookmarks();
  const notes = useNotes();
  const audio = useAudio();
  const { playAyah, playFrom } = useAyahPlayback(preferences.recitationId);
  const { save: savePosition } = useReadingPosition();
  const tracker = useReadingSessionTracker('reader');
  const tafsirEnabled = useFeatureFlag('tafsir');

  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [noteVerse, setNoteVerse] = useState<Verse | null>(null);
  const [tafsirVerse, setTafsirVerse] = useState<Verse | null>(null);
  const [topVerseNumber, setTopVerseNumber] = useState<number | null>(null);

  const listRef = useRef<FlashListRef<Verse>>(null);
  // Guards against jumping the user back to the deep-linked ayah after they
  // have scrolled away, or on a re-render once more pages have loaded.
  const hasJumpedToInitialVerse = useRef(false);

  /**
   * Scrolls to the ayah a deep link or bookmark asked for.
   *
   * Runs once the requested ayah is actually present: it may be on a later page
   * than the first, in which case this waits for `fetchNextPage` to bring it in
   * rather than scrolling to the wrong place.
   */
  useEffect(() => {
    if (!initialVerseNumber || hasJumpedToInitialVerse.current) return;
    if (versesQuery.verses.length === 0) return;

    const index = versesQuery.verses.findIndex((verse) => verse.verseNumber === initialVerseNumber);

    if (index === -1) {
      // Not loaded yet — pull the next page and try again when it arrives.
      if (versesQuery.hasNextPage) versesQuery.fetchNextPage();
      return;
    }

    hasJumpedToInitialVerse.current = true;
    listRef.current?.scrollToIndex({ index, animated: false });
  }, [initialVerseNumber, versesQuery]);

  const notedKeys = useMemo(() => new Set(notes.notes.map((note) => note.verseKey)), [notes.notes]);

  /**
   * Called as each ayah scrolls into view. Three side effects, all cheap and
   * all idempotent, which is what makes it safe to call on every viewport
   * change.
   */
  const handleVerseVisible = useCallback(
    (verse: Verse) => {
      tracker.markVerseRead(verse.chapterId, verse.verseNumber);
      savePosition(verse.verseKey);
      setTopVerseNumber(verse.verseNumber);
    },
    [tracker, savePosition],
  );

  const handlePlay = useCallback(
    (verse: Verse) => {
      if (audio.currentTrack?.verseKey === verse.verseKey) {
        audio.toggle();
        return;
      }
      void playAyah(verse.verseKey);
    },
    [audio, playAyah],
  );

  const handlePlayChapter = useCallback(() => {
    if (audio.state === 'playing') {
      audio.pause();
      return;
    }
    if (audio.currentTrack) {
      audio.toggle();
      return;
    }

    const first = versesQuery.verses[0];
    if (first) void playFrom(first.chapterId, first.verseKey);
  }, [audio, playFrom, versesQuery.verses]);

  const handleBookmark = useCallback(
    (verse: Verse) => {
      void bookmarks.toggle(verse.verseKey).then((added) => {
        toast.show(added ? t('bookmarks.added') : t('bookmarks.removed'), {
          icon: added ? 'bookmarkFilled' : 'bookmark',
        });
      });
    },
    [bookmarks, toast, t],
  );

  const handleShare = useCallback(
    (verse: Verse) => {
      void shareVerse(verse, chapterQuery.data?.nameSimple);
    },
    [chapterQuery.data],
  );

  const handleSaveNote = useCallback(
    async (body: string) => {
      if (!noteVerse) return;
      await notes.save(noteVerse.verseKey, body);
      setNoteVerse(null);
      toast.show(t('notes.saved'), { icon: 'note' });
    },
    [noteVerse, notes, toast, t],
  );

  if (versesQuery.error && versesQuery.verses.length === 0) {
    return (
      <Screen edges={['top']} noPadding>
        <ReaderHeader
          chapter={chapterQuery.data}
          currentVerse={null}
          onOpenPreferences={() => setPreferencesOpen(true)}
          onPlayChapter={handlePlayChapter}
          isPlaying={false}
        />
        <ErrorState error={versesQuery.error} onRetry={versesQuery.refetch} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} noPadding>
      <ReaderHeader
        chapter={chapterQuery.data}
        currentVerse={topVerseNumber}
        onOpenPreferences={() => setPreferencesOpen(true)}
        onPlayChapter={handlePlayChapter}
        isPlaying={audio.state === 'playing'}
      />

      {versesQuery.isLoading ? (
        <ReaderSkeleton />
      ) : (
        <VirtualizedAyahList
          listRef={listRef}
          verses={versesQuery.verses}
          arabicFontSize={preferences.arabicFontSize}
          translationFontSize={preferences.translationFontSize}
          showTranslation={preferences.showTranslation}
          showWordByWord={preferences.showWordByWord}
          languageCode={locale}
          bookmarkedKeys={bookmarks.bookmarkedKeys}
          notedKeys={notedKeys}
          playingVerseKey={audio.currentTrack?.verseKey ?? null}
          showTafsirAction={tafsirEnabled && preferences.tafsirId !== null}
          isFetchingNextPage={versesQuery.isFetchingNextPage}
          hasNextPage={versesQuery.hasNextPage}
          onEndReached={versesQuery.fetchNextPage}
          onVerseVisible={handleVerseVisible}
          onPlay={handlePlay}
          onTafsir={setTafsirVerse}
          onBookmark={handleBookmark}
          onNote={setNoteVerse}
          onShare={handleShare}
          ListHeaderComponent={
            source.kind === 'chapter' ? (
              <BismillahHeader
                // Al-Fatihah opens with the Bismillah as its own first ayah, so
                // repeating it above would print it twice.
                show={Boolean(chapterQuery.data?.hasBismillah) && chapterQuery.data?.id !== 1}
                fontSize={preferences.arabicFontSize * 0.85}
              />
            ) : null
          }
        />
      )}

      <ReaderPreferencesSheet
        visible={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        preferences={preferences}
        onUpdate={update}
        onStepArabic={stepArabicFontSize}
        onStepTranslation={stepTranslationFontSize}
        onOpenTranslationPicker={() => {
          setPreferencesOpen(false);
          router.push('/reader-translations');
        }}
        onOpenReciterPicker={() => {
          setPreferencesOpen(false);
          router.push('/reader-reciters');
        }}
        wordByWordAvailable
      />

      <TafsirSheet
        verse={tafsirVerse}
        tafsirId={preferences.tafsirId}
        tafsirName={null}
        arabicFontSize={preferences.arabicFontSize}
        translationFontSize={preferences.translationFontSize}
        onClose={() => setTafsirVerse(null)}
      />

      <NoteEditorSheet
        // Remounts per ayah so the editor always opens seeded with that ayah's
        // note rather than the previously edited one.
        key={noteVerse?.verseKey ?? 'none'}
        visible={noteVerse !== null}
        verseKey={noteVerse?.verseKey ?? ''}
        initialBody={noteVerse ? (notes.getNote(noteVerse.verseKey)?.body ?? '') : ''}
        onClose={() => setNoteVerse(null)}
        onSave={handleSaveNote}
        onDelete={async () => {
          if (!noteVerse) return;
          await notes.remove(noteVerse.verseKey);
          setNoteVerse(null);
        }}
      />
    </Screen>
  );
}

function ReaderSkeleton() {
  return (
    <View className="gap-8 px-4 pt-6">
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} className="gap-3">
          <Skeleton width={28} height={28} radius={14} />
          <Skeleton height={26} />
          <Skeleton height={26} width="85%" />
          <Skeleton height={14} width="95%" />
          <Skeleton height={14} width="70%" />
        </View>
      ))}
    </View>
  );
}
