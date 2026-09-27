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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { useAudio } from '@/features/audio/hooks/AudioPlayerProvider';
import { useAyahPlayback } from '@/features/audio/hooks/useAyahAudio';
import { useWordAudio } from '@/features/audio/hooks/useWordAudio';
import { useBookmarks } from '@/features/bookmarks/hooks/useBookmarks';
import { NoteEditorSheet } from '@/features/notes/components/NoteEditorSheet';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { BismillahHeader } from '@/features/quran/components/BismillahHeader';
import { TafsirSheet } from '@/features/quran/components/TafsirSheet';
import { WordMeaningSheet } from '@/features/quran/components/WordMeaningSheet';
import {
  activeWordPosition as wordAtPosition,
  parseWordTimings,
} from '@/features/quran/utils/wordTimings';
import { useChapter } from '@/features/quran/hooks/useChapters';
import { useResolvedTranslationIds } from '@/features/quran/hooks/useResolvedTranslations';
import { useVerses, type VerseSource } from '@/features/quran/hooks/useVerses';
import type { FlashListRef } from '@shopify/flash-list';
import { shareVerse } from '@/features/quran/services/shareService';
import type { Verse, WordSegment } from '@/features/quran/types/quran.types';
import { parseVerseKey } from '@/features/quran/utils/verseKey';
import type { RepeatOptions } from '@/features/audio/services/audioQueue';
import { noRepeat } from '@/features/audio/services/audioQueue';
import { useFeatureFlag } from '@/lib/api/useFeatureFlags';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { logger } from '@/lib/monitoring/logger';
import { useStableCallback } from '@/lib/ui/useStableCallback';

import { PlayOptionsSheet, type PlayRange } from '../components/PlayOptionsSheet';
import { READER_BAR_HEIGHT, ReaderBottomBar } from '../components/ReaderBottomBar';
import { ReaderHeader } from '../components/ReaderHeader';
import { ReaderPreferencesSheet } from '../components/ReaderPreferencesSheet';
import { VirtualizedAyahList } from '../components/VirtualizedAyahList';
import { autoScrollSpeeds, useAutoScroll } from '../hooks/useAutoScroll';
import { useKeepScreenAwake } from '../hooks/useKeepScreenAwake';
import { useReaderPreferences } from '../hooks/useReaderPreferences';
import { useReadingPosition } from '../hooks/useReadingPosition';
import { useReadingSessionTracker } from '../hooks/useReadingSessionTracker';

export interface ReaderScreenProps {
  source: VerseSource;
  /** Ayah to open at, from a deep link, a bookmark or "continue reading". */
  initialVerseNumber?: number;
}

/** How long the ayah the reader opened at stays marked. */
const HIGHLIGHT_MS = 3_000;

export function ReaderScreen({ source, initialVerseNumber }: ReaderScreenProps) {
  const { t, locale } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const { preferences, update, stepArabicFontSize, stepTranslationFontSize } =
    useReaderPreferences();

  const [autoScrollOn, setAutoScrollOn] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(1);

  // Reading is the one activity where the screen timing out mid-ayah is a real
  // annoyance, so the user can opt to keep it awake — and a page scrolling by
  // itself is read hands-free, so it always keeps the screen on.
  useKeepScreenAwake(preferences.keepScreenAwake || autoScrollOn);

  const chapterId = source.kind === 'chapter' ? source.chapterId : null;
  const chapterQuery = useChapter(chapterId);

  // Validated against the catalogue this environment actually serves.
  const translationIds = useResolvedTranslationIds(preferences.translationIds);

  const versesQuery = useVerses(source, {
    translationIds: preferences.showTranslation ? translationIds : [],
    // Always. Tapping a word for its meaning and hearing it recited are part
    // of normal reading now, not a mode — so the words come with every ayah.
    // The cost is a larger response per page, taken deliberately: the
    // alternative is a reader where words are inert unless a setting is on,
    // which is exactly what was shipped and exactly what was asked to change.
    includeWords: true,
    script: preferences.arabicScript,
    anchorVerse: initialVerseNumber,
  });
  const { verses, fetchNextPage, fetchPreviousPage } = versesQuery;

  const bookmarks = useBookmarks();
  const notes = useNotes();
  const audio = useAudio();
  const { playAyah, playRange } = useAyahPlayback(preferences.recitationId);
  const { save: savePosition } = useReadingPosition();
  const tracker = useReadingSessionTracker('reader');
  const tafsirEnabled = useFeatureFlag('tafsir');

  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [playOptionsOpen, setPlayOptionsOpen] = useState(false);
  const [repeatChoice, setRepeatChoice] = useState<RepeatOptions>(noRepeat);
  const [noteVerse, setNoteVerse] = useState<Verse | null>(null);
  const [tafsirVerse, setTafsirVerse] = useState<Verse | null>(null);
  const [topVerse, setTopVerse] = useState<Verse | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(
    chapterId && initialVerseNumber ? `${chapterId}:${initialVerseNumber}` : null,
  );

  const listRef = useRef<FlashListRef<Verse>>(null);
  const [selectedWord, setSelectedWord] = useState<WordSegment | null>(null);
  const playWord = useWordAudio();

  useEffect(() => {
    if (!highlightedKey || versesQuery.isLoading) return;
    const timer = setTimeout(() => setHighlightedKey(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightedKey, versesQuery.isLoading]);

  /**
   * Which word the reciter is on.
   *
   * Timings are parsed per track rather than per tick — the position updates
   * several times a second, and re-parsing the segment array each time would
   * do real work on every frame of playback for no gain.
   */
  const wordTimings = useMemo(
    () => parseWordTimings(audio.currentTrack?.segments),
    [audio.currentTrack?.segments],
  );

  // Null whenever the reciter publishes no timings, which is the common case.
  const activeWord = useMemo(
    () =>
      wordTimings.length > 0
        ? wordAtPosition(wordTimings, Math.round(audio.positionSeconds * 1000))
        : null,
    [wordTimings, audio.positionSeconds],
  );

  // The surah the bottom bar acts on: the route's, or for a juz or page the
  // one the reader is currently in.
  const barChapterId = chapterId ?? topVerse?.chapterId ?? verses[0]?.chapterId ?? null;
  const isThisChapterLoaded = barChapterId !== null && audio.queueId === `chapter:${barChapterId}`;
  const isReciting = audio.state === 'playing' || audio.state === 'loading';

  /**
   * The page follows the recitation: each time the reciter moves on, the ayah
   * being recited is brought to the top. Only when it moves on — a user who
   * scrolls away mid-ayah to look at something is not dragged back until the
   * next ayah starts.
   */
  const followKey =
    isThisChapterLoaded && isReciting ? (audio.currentTrack?.verseKey ?? null) : null;
  const followedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!followKey || followedKeyRef.current === followKey) return;

    const index = verses.findIndex((verse) => verse.verseKey === followKey);
    if (index === -1) {
      // Not loaded yet: bring in the page it is on, in whichever direction.
      const target = parseVerseKey(followKey)?.verseNumber ?? 0;
      const firstLoaded = verses[0]?.verseNumber ?? 0;
      if (target < firstLoaded) fetchPreviousPage();
      else fetchNextPage();
      return;
    }

    followedKeyRef.current = followKey;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  }, [followKey, verses, fetchNextPage, fetchPreviousPage]);

  // Auto-scroll gives way while the recitation is leading the page: two
  // things moving the same list would fight each other.
  const scrollHandlers = useAutoScroll(listRef, {
    active: autoScrollOn && !(isThisChapterLoaded && isReciting),
    speedLevel,
  });

  const notedKeys = useMemo(() => new Set(notes.notes.map((note) => note.verseKey)), [notes.notes]);

  /** Called as each ayah scrolls into view; idempotent, so safe on every change. */
  const handleVerseVisible = useCallback(
    (verse: Verse) => {
      tracker.markVerseRead(verse.chapterId, verse.verseNumber);
    },
    [tracker],
  );

  /**
   * The ayah at the top is where the reader is: it is what the header shows
   * and what "continue reading" returns to. It used to be whichever visible
   * ayah was reported last — the one at the bottom of the screen.
   */
  const handleTopVerseChange = useCallback(
    (verse: Verse) => {
      setTopVerse(verse);
      savePosition(verse.verseKey);
    },
    [savePosition],
  );

  const showAudioError = useCallback(
    (error: unknown) => {
      logger.warn('reader.playFailed', { error });
      toast.show(t('errors.audioUnavailable'), { tone: 'error', icon: 'error' });
    },
    [toast, t],
  );

  /**
   * An ayah's own play button: this ayah alone, then stop.
   *
   * Pauses when this ayah is the one being recited, and resumes a single ayah
   * that was paused part-way. Anything else — including an ayah that finished,
   * or one reached inside the surah's queue — starts it afresh, on its own.
   */
  const handlePlaySingle = useStableCallback((verse: Verse) => {
    const isCurrent = audio.currentTrack?.verseKey === verse.verseKey;

    if (isCurrent && isReciting) {
      audio.pause();
      return;
    }
    if (isCurrent && audio.queueId === `ayah:${verse.verseKey}` && !audio.hasEnded) {
      audio.toggle();
      return;
    }
    playAyah(verse.verseKey).catch(showAudioError);
  });

  /**
   * The bottom bar's play button.
   *
   * Pauses whatever is reciting, and resumes this surah's recitation where it
   * was paused. Otherwise it asks what to play — from the ayah on screen to
   * the end by default, with a range and repeats for memorising.
   */
  const handleBarPlay = useCallback(() => {
    if (isReciting) {
      audio.pause();
      return;
    }
    if (isThisChapterLoaded && audio.currentTrack && !audio.hasEnded) {
      audio.toggle();
      return;
    }
    setPlayOptionsOpen(true);
  }, [audio, isReciting, isThisChapterLoaded]);

  const handlePlayRange = useCallback(
    (range: PlayRange) => {
      setPlayOptionsOpen(false);
      if (barChapterId === null) return;

      setRepeatChoice({ repeatEach: range.repeatEach, repeatRange: range.repeatRange });
      // Follow from the first ayah of the new range, even if it is the one
      // followed last time.
      followedKeyRef.current = null;
      playRange(barChapterId, range.fromVerse, range.toVerse, range).catch(showAudioError);
    },
    [barChapterId, playRange, showAudioError],
  );

  /**
   * A tapped word is heard AND explained: the clip plays over whatever else
   * is playing, and the sheet opens with pronunciation and meaning. A word
   * with no clip still opens the sheet, so the tap is never wasted.
   */
  const handleWordPress = useStableCallback((word: WordSegment) => {
    if (word.audioUrl) playWord(word.audioUrl);
    setSelectedWord(word);
  });

  const handleBookmark = useStableCallback((verse: Verse) => {
    void bookmarks.toggle(verse.verseKey).then((added) => {
      toast.show(added ? t('bookmarks.added') : t('bookmarks.removed'), {
        icon: added ? 'bookmarkFilled' : 'bookmark',
      });
    });
  });

  const handleShare = useStableCallback((verse: Verse) => {
    void shareVerse(verse, chapterQuery.data?.nameSimple);
  });

  const handleSaveNote = useCallback(
    async (body: string) => {
      if (!noteVerse) return;
      await notes.save(noteVerse.verseKey, body);
      setNoteVerse(null);
      toast.show(t('notes.saved'), { icon: 'note' });
    },
    [noteVerse, notes, toast, t],
  );

  const verseCount =
    chapterQuery.data?.versesCount ?? (versesQuery.totalVerses || verses.length || 1);
  const playStart =
    topVerse?.chapterId === barChapterId ? topVerse.verseNumber : (verses[0]?.verseNumber ?? 1);

  const header = (
    <ReaderHeader
      chapter={chapterQuery.data}
      currentVerse={topVerse?.verseNumber ?? null}
      onOpenPreferences={() => setPreferencesOpen(true)}
    />
  );

  if (versesQuery.error && verses.length === 0) {
    return (
      <Screen edges={['top']} noPadding>
        {header}
        <ErrorState error={versesQuery.error} onRetry={versesQuery.refetch} />
      </Screen>
    );
  }

  const tracksThisChapter =
    audio.currentTrack !== null && audio.currentTrack.chapterId === barChapterId;

  return (
    <Screen edges={['top']} noPadding>
      {header}

      {versesQuery.isLoading ? (
        <ReaderSkeleton />
      ) : (
        <VirtualizedAyahList
          listRef={listRef}
          verses={verses}
          initialVerseNumber={initialVerseNumber}
          highlightedVerseKey={highlightedKey}
          arabicFontSize={preferences.arabicFontSize}
          translationFontSize={preferences.translationFontSize}
          showTranslation={preferences.showTranslation}
          showWordByWord={preferences.showWordByWord}
          languageCode={locale}
          bookmarkedKeys={bookmarks.bookmarkedKeys}
          notedKeys={notedKeys}
          playingVerseKey={audio.currentTrack?.verseKey ?? null}
          activeWordPosition={activeWord}
          onWordPress={handleWordPress}
          onPlaySingle={handlePlaySingle}
          arabicFont={preferences.arabicFont}
          showTafsirAction={tafsirEnabled && preferences.tafsirId !== null}
          isFetchingNextPage={versesQuery.isFetchingNextPage}
          hasNextPage={versesQuery.hasNextPage}
          onEndReached={fetchNextPage}
          hasPreviousPage={versesQuery.hasPreviousPage}
          isFetchingPreviousPage={versesQuery.isFetchingPreviousPage}
          onStartReached={fetchPreviousPage}
          onVerseVisible={handleVerseVisible}
          onTopVerseChange={handleTopVerseChange}
          onTafsir={setTafsirVerse}
          onBookmark={handleBookmark}
          onNote={setNoteVerse}
          onShare={handleShare}
          bottomInset={READER_BAR_HEIGHT + insets.bottom + 16}
          scrollHandlers={scrollHandlers}
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

      <ReaderBottomBar
        autoScrollOn={autoScrollOn}
        onToggleAutoScroll={() => setAutoScrollOn((on) => !on)}
        speedLevel={speedLevel + 1}
        onCycleSpeed={() => setSpeedLevel((level) => (level + 1) % autoScrollSpeeds.length)}
        isPlaying={isReciting}
        isBuffering={tracksThisChapter && audio.state === 'loading'}
        canSkip={isThisChapterLoaded && audio.queueLength > 1}
        progress={
          tracksThisChapter && audio.durationSeconds > 0
            ? audio.positionSeconds / audio.durationSeconds
            : null
        }
        onPlayPress={handleBarPlay}
        onPrevious={audio.previous}
        onNext={audio.next}
        onOpenPlayOptions={() => setPlayOptionsOpen(true)}
        repeatActive={isThisChapterLoaded && (audio.repeatEach > 1 || audio.repeatRange !== 1)}
      />

      <PlayOptionsSheet
        visible={playOptionsOpen}
        onClose={() => setPlayOptionsOpen(false)}
        verseCount={verseCount}
        initial={{ fromVerse: playStart, toVerse: verseCount, ...repeatChoice }}
        onPlay={handlePlayRange}
      />

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
        onOpenTafsirPicker={() => {
          setPreferencesOpen(false);
          router.push('/reader-tafsirs');
        }}
        wordByWordAvailable
      />

      <WordMeaningSheet word={selectedWord} onClose={() => setSelectedWord(null)} />

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
