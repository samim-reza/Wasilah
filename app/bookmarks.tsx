/**
 * Saved ayahs, newest first.
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
import { useBookmarks } from '@/features/bookmarks/hooks/useBookmarks';
import { useChapters } from '@/features/quran/hooks/useChapters';
import { compareVerseKeys } from '@/features/quran/utils/verseKey';
import { useTranslation } from '@/lib/i18n/I18nProvider';

type SortOrder = 'recent' | 'mushaf';

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const bookmarks = useBookmarks();
  const { data: chapters } = useChapters();
  const [sort, setSort] = useState<SortOrder>('recent');

  const chapterNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const chapter of chapters ?? []) map.set(chapter.id, chapter.nameSimple);
    return map;
  }, [chapters]);

  const sorted = useMemo(() => {
    const list = [...bookmarks.bookmarks];
    if (sort === 'mushaf') {
      return list.sort((a, b) => compareVerseKeys(a.verseKey, b.verseKey));
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bookmarks.bookmarks, sort]);

  return (
    <Screen edges={['top']} noPadding>
      <View className="px-4">
        <ScreenHeader
          title={t('bookmarks.title')}
          actions={
            <IconButton
              name="filter"
              onPress={() => setSort((current) => (current === 'recent' ? 'mushaf' : 'recent'))}
              accessibilityLabel={t('common.search')}
            />
          }
        />
      </View>

      {bookmarks.isLoading && (
        <View className="gap-3 px-4 pt-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height={52} radius={10} />
          ))}
        </View>
      )}

      {bookmarks.error ? <ErrorState error={bookmarks.error} /> : null}

      {!bookmarks.isLoading && sorted.length === 0 && (
        <EmptyState
          icon="bookmark"
          title={t('bookmarks.empty')}
          body={t('bookmarks.emptyBody')}
          actionLabel={t('home.startReading')}
          onAction={() => router.push('/(tabs)/quran')}
        />
      )}

      {sorted.length > 0 && (
        <FlashList
          data={sorted}
          keyExtractor={(bookmark) => bookmark.id}
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center gap-3 border-b border-border px-4 py-3"
              pressedClassName="active:bg-surface-pressed"
              onPress={() => router.push(`/quran/${item.chapterId}?ayah=${item.verseNumber}`)}
              enforceMinTapTarget={false}
              accessibilityLabel={`${chapterNames.get(item.chapterId) ?? item.chapterId} ${item.verseKey}`}
            >
              <View className="flex-1">
                <Text className="font-semibold" numberOfLines={1}>
                  {chapterNames.get(item.chapterId) ??
                    `${t('quran.surahNumber', { number: item.chapterId })}`}
                </Text>
                <Text variant="caption" tone="muted">
                  {item.verseKey}
                </Text>
              </View>

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
    </Screen>
  );
}
