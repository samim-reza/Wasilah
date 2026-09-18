/**
 * The reader's scrolling surface.
 *
 * Uses FlashList rather than FlatList because a surah can be 286 ayahs, each
 * with Arabic, one or more translations and optional word-by-word data. A
 * plain ScrollView would mount every one of them; even FlatList's windowing
 * struggles with items this tall and this variable.
 *
 * Three things happen here beyond scrolling, and they are here rather than in
 * the screen because they all depend on viewport state:
 *   1. the next page is requested before the user reaches the end,
 *   2. visible ayahs are reported to the reading-session tracker,
 *   3. the "continue reading" position is updated as the user moves.
 */
import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AyahCard } from '@/features/quran/components/AyahCard';
import type { Verse } from '@/features/quran/types/quran.types';
import { Text } from '@/components/ui/Text';

export interface VirtualizedAyahListProps {
  /** Lets the screen scroll to a deep-linked ayah once it has loaded. */
  listRef?: React.RefObject<FlashListRef<Verse> | null>;
  verses: Verse[];
  arabicFontSize: number;
  translationFontSize: number;
  showTranslation: boolean;
  showWordByWord: boolean;
  languageCode: string;
  bookmarkedKeys: ReadonlySet<string>;
  notedKeys: ReadonlySet<string>;
  playingVerseKey: string | null;
  showTafsirAction: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onEndReached: () => void;
  /** Reported once per ayah as it becomes visible. */
  onVerseVisible: (verse: Verse) => void;
  onPlay: (verse: Verse) => void;
  onTafsir: (verse: Verse) => void;
  onBookmark: (verse: Verse) => void;
  onNote: (verse: Verse) => void;
  onShare: (verse: Verse) => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
}

/**
 * How much of an ayah must be on screen before it counts as read.
 *
 * 60% rather than any glimpse: an ayah that merely flies past during a fast
 * scroll has not been read, and counting it would let someone complete a goal
 * by flicking.
 */
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 60,
  minimumViewTime: 800,
} as const;

/** Fetch the next page when this fraction of the list remains below. */
const END_REACHED_THRESHOLD = 1.5;

export function VirtualizedAyahList({
  listRef,
  verses,
  arabicFontSize,
  translationFontSize,
  showTranslation,
  showWordByWord,
  languageCode,
  bookmarkedKeys,
  notedKeys,
  playingVerseKey,
  showTafsirAction,
  isFetchingNextPage,
  hasNextPage,
  onEndReached,
  onVerseVisible,
  onPlay,
  onTafsir,
  onBookmark,
  onNote,
  onShare,
  ListHeaderComponent,
  ListFooterComponent,
}: VirtualizedAyahListProps) {
  // FlashList refuses to accept a new `onViewableItemsChanged` identity after
  // mount, so the callback is held behind a ref that stays stable while the
  // value it points at is kept current. The ref is updated in an effect rather
  // than during render, which is what keeps it safe under concurrent rendering.
  const onVerseVisibleRef = useRef(onVerseVisible);

  useEffect(() => {
    onVerseVisibleRef.current = onVerseVisible;
  }, [onVerseVisible]);

  // Empty dependency list: the identity must never change, and the ref above is
  // what keeps the behaviour current. The ref is read when the list scrolls,
  // never during render.
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: Verse | null | undefined }[] }) => {
      for (const entry of viewableItems) {
        if (entry.item) onVerseVisibleRef.current(entry.item);
      }
    },
    [],
  );

  const renderItem: ListRenderItem<Verse> = useCallback(
    ({ item }) => (
      <AyahCard
        verse={item}
        arabicFontSize={arabicFontSize}
        translationFontSize={translationFontSize}
        showTranslation={showTranslation}
        showWordByWord={showWordByWord}
        languageCode={languageCode}
        isBookmarked={bookmarkedKeys.has(item.verseKey)}
        hasNote={notedKeys.has(item.verseKey)}
        isPlaying={playingVerseKey === item.verseKey}
        showTafsirAction={showTafsirAction}
        onPlay={onPlay}
        onTafsir={onTafsir}
        onBookmark={onBookmark}
        onNote={onNote}
        onShare={onShare}
      />
    ),
    [
      arabicFontSize,
      translationFontSize,
      showTranslation,
      showWordByWord,
      languageCode,
      bookmarkedKeys,
      notedKeys,
      playingVerseKey,
      showTafsirAction,
      onPlay,
      onTafsir,
      onBookmark,
      onNote,
      onShare,
    ],
  );

  const keyExtractor = useCallback((verse: Verse) => verse.verseKey, []);

  return (
    <FlashList
      ref={listRef}
      data={verses}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={VIEWABILITY_CONFIG}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={
        <>
          {isFetchingNextPage && (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          )}
          {!hasNextPage && verses.length > 0 && !isFetchingNextPage && (
            <View className="items-center py-10">
              <Text variant="caption" tone="subtle">
                ۞
              </Text>
            </View>
          )}
          {ListFooterComponent}
        </>
      }
      // Keeping a couple of screens rendered either side makes fast scrolling
      // feel continuous without holding the whole surah in memory.
      drawDistance={800}
      showsVerticalScrollIndicator={false}
    />
  );
}
