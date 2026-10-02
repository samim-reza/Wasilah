/**
 * Saved ayahs.
 *
 * Sortable by when they were saved or by mushaf order, and filterable by
 * collection once the user has made any. Collections stay invisible until then,
 * so the screen is a plain list for everyone who does not want folders.
 */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { BookmarkCard } from '@/features/bookmarks/components/BookmarkCard';
import {
  CollectionFilterBar,
  type CollectionFilter,
} from '@/features/bookmarks/components/CollectionFilterBar';
import { CollectionPickerSheet } from '@/features/bookmarks/components/CollectionPickerSheet';
import { useBookmarkCollections } from '@/features/bookmarks/hooks/useBookmarkCollections';
import { useBookmarks } from '@/features/bookmarks/hooks/useBookmarks';
import type { Bookmark } from '@/features/bookmarks/services/bookmarkService';
import { useChapters } from '@/features/quran/hooks/useChapters';
import { useResolvedTranslationIds } from '@/features/quran/hooks/useResolvedTranslations';
import { compareVerseKeys } from '@/features/quran/utils/verseKey';
import { useReaderPreferences } from '@/features/reader/hooks/useReaderPreferences';
import { queryKeys } from '@/lib/api/queryKeys';
import { usePullToRefresh } from '@/lib/api/usePullToRefresh';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { useStableCallback } from '@/lib/ui/useStableCallback';

type SortOrder = 'recent' | 'mushaf';

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const bookmarks = useBookmarks();
  const refresh = usePullToRefresh([queryKeys.library.all]);
  const collections = useBookmarkCollections();
  const { data: chapters } = useChapters();
  const { preferences } = useReaderPreferences();
  const translationIds = useResolvedTranslationIds(preferences.translationIds);

  const [sort, setSort] = useState<SortOrder>('recent');
  const [filter, setFilter] = useState<CollectionFilter>(null);
  const [pickerBookmark, setPickerBookmark] = useState<Bookmark | null>(null);

  const chapterNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const chapter of chapters ?? []) map.set(chapter.id, chapter.nameSimple);
    return map;
  }, [chapters]);

  const collectionNames = useMemo(
    () => new Map(collections.collections.map((collection) => [collection.id, collection.name])),
    [collections.collections],
  );

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

  const sortOptions = [
    { value: 'recent' as const, label: t('bookmarks.sortRecent') },
    { value: 'mushaf' as const, label: t('bookmarks.sortMushaf') },
  ];

  // Stable, so the memoised cards do not all re-render on every change here.
  const openBookmark = useCallback((bookmark: Bookmark) => {
    router.push(`/quran/${bookmark.chapterId}?ayah=${bookmark.verseNumber}`);
  }, []);
  const removeBookmark = useStableCallback((bookmark: Bookmark) => {
    void bookmarks.toggle(bookmark.verseKey).then(() => {
      toast.show(t('bookmarks.removed'), { icon: 'bookmark' });
    });
  });

  return (
    <Screen edges={['top']} noPadding>
      <View className="px-4">
        <ScreenHeader
          title={t('bookmarks.title')}
          subtitle={
            bookmarks.bookmarks.length > 0
              ? t('bookmarks.count', { count: bookmarks.bookmarks.length })
              : undefined
          }
        />
      </View>

      {bookmarks.bookmarks.length > 1 && (
        <View className="px-4 pb-3">
          <SegmentedControl
            options={sortOptions}
            value={sort}
            onChange={setSort}
            accessibilityLabel={t('bookmarks.sortLabel')}
          />
        </View>
      )}

      <CollectionFilterBar
        collections={collections.collections}
        selected={filter}
        onSelect={setFilter}
        onCreate={() => setPickerBookmark(bookmarks.bookmarks[0] ?? null)}
        visible={showCollections}
      />

      {bookmarks.isLoading && (
        <View className="gap-3 px-4 pt-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height={112} radius={16} />
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
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <BookmarkCard
              bookmark={item}
              surahName={
                chapterNames.get(item.chapterId) ??
                t('quran.surahNumber', { number: item.chapterId })
              }
              collectionName={
                item.collectionId ? (collectionNames.get(item.collectionId) ?? null) : null
              }
              translationIds={translationIds}
              script={preferences.arabicScript}
              arabicFont={preferences.arabicFont}
              showCollectionAction={!collections.requiresAccount}
              onOpen={openBookmark}
              onCollection={setPickerBookmark}
              onRemove={removeBookmark}
            />
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
