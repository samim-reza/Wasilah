/**
 * The Quran browser.
 *
 * Three ways in — by surah, by juz, by page — because those are the three ways
 * people actually locate a passage. The list is virtualized: 114 rows is small,
 * but this screen is opened constantly and must feel instant.
 */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Screen } from '@/components/layout/Screen';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { ChapterListItem } from '@/features/quran/components/ChapterListItem';
import { useChapters } from '@/features/quran/hooks/useChapters';
import type { Chapter } from '@/features/quran/types/quran.types';
import { quranStructure } from '@/config/quran';
import { queryKeys } from '@/lib/api/queryKeys';
import { usePullToRefresh } from '@/lib/api/usePullToRefresh';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { Pressable } from '@/components/ui/Pressable';

type BrowseMode = 'surah' | 'juz' | 'page';

export default function QuranScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<BrowseMode>('surah');
  const { data: chapters, isLoading, error, refetch } = useChapters();
  const refresh = usePullToRefresh([queryKeys.quran.all]);

  const handleChapterPress = useCallback((chapter: Chapter) => {
    router.push(`/quran/${chapter.id}`);
  }, []);

  return (
    <Screen noPadding>
      <View className="flex-row items-center gap-2 px-4 pb-2 pt-3">
        <Text variant="heading" className="flex-1" accessibilityRole="header">
          {t('quran.title')}
        </Text>
        <IconButton
          name="search"
          onPress={() => router.push('/search')}
          accessibilityLabel={t('search.title')}
        />
      </View>

      <View className="px-4 pb-3">
        <SegmentedControl<BrowseMode>
          options={[
            { value: 'surah', label: t('quran.surahs') },
            { value: 'juz', label: t('quran.juz') },
            { value: 'page', label: t('quran.page') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      {error && <ErrorState error={error} onRetry={() => void refetch()} />}

      {!error && mode === 'surah' && (
        <>
          {isLoading ? (
            <ChapterListSkeleton />
          ) : (
            <FlashList
              data={chapters ?? []}
              renderItem={({ item }) => (
                <ChapterListItem chapter={item} onPress={handleChapterPress} />
              )}
              keyExtractor={(chapter) => String(chapter.id)}
              refreshing={refresh.refreshing}
              onRefresh={refresh.onRefresh}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {!error && mode === 'juz' && <NumberGrid count={quranStructure.juzCount} kind="juz" />}
      {!error && mode === 'page' && <NumberGrid count={quranStructure.pageCount} kind="page" />}
    </Screen>
  );
}

/**
 * A simple grid for juz and page navigation.
 *
 * Both are pure numeric ranges with no names to show, so a grid fits far more
 * targets on screen than a list and takes fewer scrolls to reach juz 28.
 */
function NumberGrid({ count, kind }: { count: number; kind: 'juz' | 'page' }) {
  const { t } = useTranslation();
  const items = Array.from({ length: count }, (_, index) => index + 1);

  return (
    <FlashList
      data={items}
      numColumns={5}
      keyExtractor={(value) => String(value)}
      contentContainerClassName="px-2 pb-8"
      renderItem={({ item }) => (
        <Pressable
          className="m-1 flex-1 items-center justify-center rounded-lg border border-border bg-surface py-4"
          pressedClassName="active:bg-surface-pressed"
          onPress={() => router.push(`/quran/${kind}/${item}`)}
          accessibilityLabel={
            kind === 'juz' ? `${t('quran.juz')} ${item}` : `${t('quran.page')} ${item}`
          }
          enforceMinTapTarget={false}
        >
          <Text className="font-semibold tabular-nums">{item}</Text>
        </Pressable>
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

function ChapterListSkeleton() {
  return (
    <View className="gap-3 px-4 pt-2">
      {Array.from({ length: 10 }, (_, index) => (
        <View key={index} className="flex-row items-center gap-3">
          <Skeleton width={36} height={36} radius={10} />
          <View className="flex-1 gap-1.5">
            <Skeleton width="45%" height={14} />
            <Skeleton width="65%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}
