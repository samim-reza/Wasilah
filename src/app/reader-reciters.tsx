/**
 * Reciter picker.
 *
 * Single selection, unlike translations — two recitations at once is not a
 * thing anyone wants.
 */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useReciterResources } from '@/features/quran/hooks/useQuranResources';
import { useReaderPreferences } from '@/features/reader/hooks/useReaderPreferences';
import { trackEvent } from '@/lib/analytics/analytics';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function ReciterPickerScreen() {
  const { t } = useTranslation();
  const { preferences, update } = useReaderPreferences();
  const reciters = useReciterResources();

  const select = (id: number) => {
    void update({ recitationId: id });
    trackEvent('reciter_changed', { recitation_id: id });
    // Single choice, so leaving immediately is the expected behaviour.
    if (router.canGoBack()) router.back();
  };

  return (
    <Screen edges={['top']} noPadding>
      <View className="px-4">
        <ScreenHeader title={t('reader.selectReciter')} />
      </View>

      {reciters.isLoading && (
        <View className="gap-3 px-4 pt-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} height={48} radius={10} />
          ))}
        </View>
      )}

      {reciters.error ? (
        <ErrorState error={reciters.error} onRetry={() => void reciters.refetch()} />
      ) : null}

      {!reciters.isLoading && !reciters.error && (
        <FlashList
          data={reciters.data ?? []}
          keyExtractor={(reciter) => String(reciter.id)}
          renderItem={({ item }) => {
            const isSelected = item.id === preferences.recitationId;

            return (
              <Pressable
                className="flex-row items-center gap-3 border-b border-border px-4 py-3"
                pressedClassName="active:bg-surface-pressed"
                onPress={() => select(item.id)}
                enforceMinTapTarget={false}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={item.name}
              >
                <View className="flex-1">
                  <Text numberOfLines={1}>{item.name}</Text>
                  {item.style && (
                    <Text variant="caption" tone="muted">
                      {item.style}
                    </Text>
                  )}
                </View>

                {isSelected && <Icon name="checkCircle" size={20} color="primary" />}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
