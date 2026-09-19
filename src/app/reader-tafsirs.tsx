/**
 * Tafsir picker.
 *
 * Single selection, and "None" is a first-class option rather than an absence —
 * most people read without commentary most of the time, and the reader hides
 * the tafsir action entirely when no edition is chosen.
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
import { useTafsirResources } from '@/features/quran/hooks/useQuranResources';
import type { TranslationResource } from '@/features/quran/types/quran.types';
import { useReaderPreferences } from '@/features/reader/hooks/useReaderPreferences';
import { useTranslation } from '@/lib/i18n/I18nProvider';

/** `null` is the "no commentary" choice, always offered first. */
type TafsirChoice = TranslationResource | null;

export default function TafsirPickerScreen() {
  const { t } = useTranslation();
  const { preferences, update } = useReaderPreferences();
  const tafsirs = useTafsirResources();

  const select = (choice: TafsirChoice) => {
    void update({ tafsirId: choice?.id ?? null });
    if (router.canGoBack()) router.back();
  };

  const rows: TafsirChoice[] = [null, ...(tafsirs.data ?? [])];

  return (
    <Screen edges={['top']} noPadding>
      <View className="px-4">
        <ScreenHeader title={t('quran.tafsir')} />
      </View>

      {tafsirs.isLoading && (
        <View className="gap-3 px-4 pt-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} height={48} radius={10} />
          ))}
        </View>
      )}

      {tafsirs.error ? (
        <ErrorState error={tafsirs.error} onRetry={() => void tafsirs.refetch()} />
      ) : null}

      {!tafsirs.isLoading && !tafsirs.error && (
        <FlashList
          data={rows}
          keyExtractor={(row) => (row ? `t-${row.id}` : 'none')}
          renderItem={({ item }) => {
            const isSelected = (item?.id ?? null) === preferences.tafsirId;
            const label = item?.name ?? t('common.off');

            return (
              <Pressable
                className="flex-row items-center gap-3 border-b border-border px-4 py-3"
                pressedClassName="active:bg-surface-pressed"
                onPress={() => select(item)}
                enforceMinTapTarget={false}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={label}
              >
                <View className="flex-1">
                  <Text numberOfLines={1}>{label}</Text>
                  {item && (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {item.authorName} · {item.languageName}
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
