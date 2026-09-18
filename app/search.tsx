/**
 * Quran search.
 *
 * Debounced, paginated and cancellable — all handled by `useQuranSearch`, so
 * this screen is presentation only.
 */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Screen } from '@/components/layout/Screen';
import { IconButton } from '@/components/ui/IconButton';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { parseHighlightedText } from '@/features/quran/utils/sanitizeTranslation';
import type { SearchResult } from '@/features/quran/types/quran.types';
import { useQuranSearch } from '@/features/search/hooks/useQuranSearch';
import { trackEvent } from '@/lib/analytics/analytics';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const search = useQuranSearch();

  const openResult = (result: SearchResult, position: number) => {
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
              <SearchResultRow result={item} onPress={() => openResult(item, index)} />
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

function SearchResultRow({ result, onPress }: { result: SearchResult; onPress: () => void }) {
  // The API marks matches with <em>; rendering those as styled runs avoids
  // needing an HTML renderer and avoids injecting markup into the UI.
  const runs = parseHighlightedText(result.highlighted ?? result.translationText ?? '');

  return (
    <Pressable
      className="border-b border-border px-4 py-3"
      pressedClassName="active:bg-surface-pressed"
      onPress={onPress}
      enforceMinTapTarget={false}
      accessibilityLabel={`${result.verseKey}. ${result.translationText ?? ''}`}
    >
      <Text variant="caption" tone="primary" className="mb-1 font-semibold">
        {result.verseKey}
      </Text>

      <Text
        className="font-arabic text-content"
        style={{ fontSize: 20, lineHeight: 40, writingDirection: 'rtl', textAlign: 'right' }}
        allowFontScaling={false}
        numberOfLines={2}
      >
        {result.arabicText}
      </Text>

      {runs.length > 0 && (
        <Text variant="caption" tone="muted" className="mt-2" numberOfLines={3}>
          {runs.map((run, index) => (
            <Text
              key={index}
              variant="caption"
              className={run.highlighted ? 'font-semibold text-content' : 'text-content-muted'}
            >
              {run.text}
            </Text>
          ))}
        </Text>
      )}
    </Pressable>
  );
}
