/**
 * Saved ayahs.
 *
 * Sortable by when they were saved or by mushaf order, and filterable by
 * collection once the user has made any. Collections stay invisible until then,
 * so the screen is a plain list for everyone who does not want folders.
 */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import {
  CollectionFilterBar,
  type CollectionFilter,
} from '@/features/bookmarks/components/CollectionFilterBar';
import { CollectionPickerSheet } from '@/features/bookmarks/components/CollectionPickerSheet';
import { useBookmarkCollections } from '@/features/bookmarks/hooks/useBookmarkCollections';
import { useBookmarks } from '@/features/bookmarks/hooks/useBookmarks';
import type { Bookmark } from '@/features/bookmarks/services/bookmarkService';
import { useChapters } from '@/features/quran/hooks/useChapters';
import { compareVerseKeys } from '@/features/quran/utils/verseKey';
import { queryKeys } from '@/lib/api/queryKeys';
import { usePullToRefresh } from '@/lib/api/usePullToRefresh';
import { useTranslation } from '@/lib/i18n/I18nProvider';

type SortOrder = 'recent' | 'mushaf';

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const bookmarks = useBookmarks();
  const refresh = usePullToRefresh([queryKeys.library.all]);
  const collections = useBookmarkCollections();
  const { data: chapters } = useChapters();

  const [sort, setSort] = useState<SortOrder>('recent');
  const [filter, setFilter] = useState<CollectionFilter>(null);
  const [pickerBookmark, setPickerBookmark] = useState<Bookmark | null>(null);

  const chapterNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const chapter of chapters ?? []) map.set(chapter.id, chapter.nameSimple);
    return map;
  }, [chapters]);

  const visible = useMemo(() => {
    const filtered =
      filter === null
        ? bookmarks.bookmarks
        : bookmarks.bookmarks.filter((bookmark) => bookmark.collectionId === filter);

    const list = [...filtered];
    return sort === 'mushaf'
      ? list.sort((a, b) => compareVerseKeys(a.verseKey, b.verseKey))
      : list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bookmarks.bookmarks, filter, sort]);

  // The collection row is pointless until there is something to organise.
  const showCollections =
    !collections.requiresAccount &&
    (collections.collections.length > 0 || bookmarks.bookmarks.length > 0);

  return (
    <Screen edges={['top']} noPadding>
      <View className="px-4">
        <ScreenHeader
          title={t('bookmarks.title')}
          actions={
            <IconButton
              name="filter"
              onPress={() => setSort((current) => (current === 'recent' ? 'mushaf' : 'recent'))}
              accessibilityLabel={sort === 'recent' ? t('quran.surahs') : t('common.today')}
            />
          }
        />
      </View>

      <CollectionFilterBar
        collections={collections.collections}
        selected={filter}
        onSelect={setFilter}
        onCreate={() => setPickerBookmark(bookmarks.bookmarks[0] ?? null)}
        visible={showCollections}
      />

      {bookmarks.isLoading && (
        <View className="gap-3 px-4 pt-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height={52} radius={10} />
          ))}
        </View>
      )}

      {bookmarks.error ? <ErrorState error={bookmarks.error} /> : null}

      {!bookmarks.isLoading && visible.length === 0 && (
        <EmptyState
          icon="bookmark"
          title={t('bookmarks.empty')}
          body={t('bookmarks.emptyBody')}
          actionLabel={t('home.startReading')}
          onAction={() => router.push('/(tabs)/quran')}
        />
      )}

      {visible.length > 0 && (
        <FlashList
          data={visible}
          keyExtractor={(bookmark) => bookmark.id}
          refreshing={refresh.refreshing}
          onRefresh={refresh.onRefresh}
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center gap-2 border-b border-border px-4 py-3"
              pressedClassName="active:bg-surface-pressed"
              onPress={() => router.push(`/quran/${item.chapterId}?ayah=${item.verseNumber}`)}
              enforceMinTapTarget={false}
              accessibilityLabel={`${chapterNames.get(item.chapterId) ?? item.chapterId} ${item.verseKey}`}
            >
              <View className="flex-1">
                <Text className="font-semibold" numberOfLines={1}>
                  {chapterNames.get(item.chapterId) ??
                    t('quran.surahNumber', { number: item.chapterId })}
                </Text>
                <Text variant="caption" tone="muted">
                  {item.verseKey}
                </Text>
              </View>

              {!collections.requiresAccount && (
                <IconButton
                  name="collection"
                  color={item.collectionId ? 'primary' : 'textSubtle'}
                  size={18}
                  onPress={() => setPickerBookmark(item)}
                  accessibilityLabel={t('bookmarks.collections')}
                />
              )}

              <IconButton
                name="bookmarkFilled"
                color="accent"
                size={18}
                onPress={() => void bookmarks.toggle(item.verseKey)}
                accessibilityLabel={t('bookmarks.remove')}
              />
            </Pressable>
          )}
        />
      )}

      <CollectionPickerSheet
        visible={pickerBookmark !== null}
        collections={collections.collections}
        currentCollectionId={pickerBookmark?.collectionId ?? null}
        onClose={() => setPickerBookmark(null)}
        onAssign={async (collectionId) => {
          if (pickerBookmark) await collections.assign(pickerBookmark.id, collectionId);
        }}
        onCreate={collections.create}
      />
    </Screen>
  );
}
