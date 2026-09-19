/**
 * Quran search.
 *
 * Debounced, paginated and cancellable — all handled by `useQuranSearch`, so
 * this screen is presentation only.
 *
 * Results arrive in two stages (see the hook): references first, then the text
 * of each ayah. A row therefore renders its reference immediately and fills in
 * Arabic and translation when they land, rather than the list appearing all at
 * once after both round-trips. That keeps the perceived response tied to the
 * search itself, which is the fast half.
 */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Screen } from '@/components/layout/Screen';
import { IconButton } from '@/components/ui/IconButton';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useChapters } from '@/features/quran/hooks/useChapters';
import {
  useQuranSearch,
  type SearchResultItem,
} from '@/features/search/hooks/useQuranSearch';
import { trackEvent } from '@/lib/analytics/analytics';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const search = useQuranSearch();
  const chaptersQuery = useChapters();

  // The surah list is cached for a day and usually already on disk, so naming
  // the surah in each result costs nothing.
  const chapterNames = useMemo(() => {
    const names = new Map<number, string>();
    for (const chapter of chaptersQuery.data ?? []) names.set(chapter.id, chapter.nameSimple);
    return names;
  }, [chaptersQuery.data]);

  const openResult = (result: SearchResultItem, position: number) => {
    trackEvent('search_result_opened', { position });
    router.push(`/quran/${result.chapterId}?ayah=${result.verseNumber}`);
  };

  return (
    <Screen edges={['top']} noPadding>
      <View className="flex-row items-center gap-2 px-2 py-2">
        <IconButton name="back" onPress={() => router.back()} accessibilityLabel={t('a11y.back')} />

        <TextInput
          value={search.query}
          onChangeText={search.setQuery}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textSubtle}
          autoFocus
          returnKeyType="search"
          className="flex-1 rounded-lg bg-surface-muted px-3 py-2.5 text-base text-content"
          accessibilityLabel={t('search.placeholder')}
        />

        {search.query.length > 0 && (
          <IconButton
            name="close"
            onPress={() => search.setQuery('')}
            accessibilityLabel={t('common.close')}
            size={18}
          />
        )}
      </View>

      {search.error ? <ErrorState error={search.error} compact /> : null}

      {search.isIdle && !search.error && (
        <EmptyState icon="search" title={t('search.title')} body={t('search.prompt')} />
      )}

      {!search.isIdle && search.isSearching && search.results.length === 0 && (
        <View className="items-center py-12">
          <ActivityIndicator />
        </View>
      )}

      {!search.isIdle && !search.isSearching && search.results.length === 0 && !search.error && (
        <EmptyState icon="search" title={t('search.noResults')} body={t('search.noResultsBody')} />
      )}

      {search.results.length > 0 && (
        <>
          <Text variant="caption" tone="muted" className="px-4 pb-2">
            {t('search.resultsCount', { count: search.totalResults })}
          </Text>

          <FlashList
            data={search.results}
            keyExtractor={(result) => result.verseKey}
            onEndReached={search.fetchNextPage}
            onEndReachedThreshold={1}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <SearchResultRow
                result={item}
                chapterName={chapterNames.get(item.chapterId)}
                onPress={() => openResult(item, index)}
              />
            )}
            ListFooterComponent={
              search.isFetchingNextPage ? (
                <View className="items-center py-6">
                  <ActivityIndicator />
                </View>
              ) : null
            }
          />
        </>
      )}
    </Screen>
  );
}

function SearchResultRow({
  result,
  chapterName,
  onPress,
}: {
  result: SearchResultItem;
  chapterName?: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const reference = chapterName ? `${chapterName} ${result.verseKey}` : result.verseKey;

  return (
    <Pressable
      className="border-b border-border px-4 py-3"
      pressedClassName="active:bg-surface-pressed"
      onPress={onPress}
      enforceMinTapTarget={false}
      // The row stays tappable in every state: the reference alone is enough to
      // act on, and the reader can say more about why an ayah would not load.
      accessibilityLabel={
        result.status === 'ready' ? `${reference}. ${result.translationText ?? ''}` : reference
      }
    >
      <Text variant="caption" tone="primary" className="mb-1 font-semibold">
        {reference}
      </Text>

      {result.status === 'loading' && (
        <Text variant="caption" tone="subtle">
          {t('common.loading')}
        </Text>
      )}

      {result.status === 'unavailable' && (
        <Text variant="caption" tone="subtle">
          {t('search.verseUnavailable')}
        </Text>
      )}

      {result.status === 'ready' && (
        <>
          <Text
            className="font-arabic text-content"
            style={{ fontSize: 20, lineHeight: 40, writingDirection: 'rtl', textAlign: 'right' }}
            allowFontScaling={false}
            numberOfLines={2}
          >
            {result.arabicText}
          </Text>

          {result.translationText ? (
            <Text variant="caption" tone="muted" className="mt-2" numberOfLines={3}>
              {result.translationText}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
