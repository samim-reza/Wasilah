/**
 * Translation picker.
 *
 * Several editions may be selected at once — the reader shows them stacked
 * beneath the ayah, which is how a lot of people actually read a translation
 * they are unsure about.
 */
import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTranslationResources } from '@/features/quran/hooks/useQuranResources';
import type { TranslationResource } from '@/features/quran/types/quran.types';
import { useReaderPreferences } from '@/features/reader/hooks/useReaderPreferences';
import { trackEvent } from '@/lib/analytics/analytics';
import { useTranslation } from '@/lib/i18n/I18nProvider';

type Row =
  { kind: 'header'; label: string } | { kind: 'translation'; resource: TranslationResource };

export default function TranslationPickerScreen() {
  const { t } = useTranslation();
  const { preferences, update } = useReaderPreferences();
  const resources = useTranslationResources();

  // Memoised so `toggle` keeps a stable identity across renders — the list
  // below is long and re-creating the callback would defeat its memoisation.
  const selected = useMemo(() => new Set(preferences.translationIds), [preferences.translationIds]);

  const toggle = useCallback(
    (id: number) => {
      const next = selected.has(id)
        ? preferences.translationIds.filter((current) => current !== id)
        : [...preferences.translationIds, id];

      // Removing the last edition would leave the reader with translation mode
      // on but nothing to show, so an empty selection turns it off instead.
      void update({
        translationIds: next,
        showTranslation: next.length > 0,
      });

      if (!selected.has(id)) trackEvent('translation_changed', { translation_id: id });
    },
    [preferences.translationIds, selected, update],
  );

  const rows: Row[] = [];
  if (resources.grouped.preferred.length > 0) {
    rows.push({ kind: 'header', label: t('settings.language') });
    for (const resource of resources.grouped.preferred) {
      rows.push({ kind: 'translation', resource });
    }
  }
  for (const group of resources.grouped.byLanguage) {
    rows.push({ kind: 'header', label: group.language });
    for (const resource of group.translations) {
      rows.push({ kind: 'translation', resource });
    }
  }

  return (
    <Screen edges={['top']} noPadding>
      <View className="px-4">
        <ScreenHeader
          title={t('reader.selectTranslation')}
          subtitle={t('goals.ayahs', { count: preferences.translationIds.length })}
        />
      </View>

      {resources.isLoading && (
        <View className="gap-3 px-4 pt-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} height={48} radius={10} />
          ))}
        </View>
      )}

      {resources.error ? (
        <ErrorState error={resources.error} onRetry={() => void resources.refetch()} />
      ) : null}

      {!resources.isLoading && !resources.error && (
        <FlashList
          data={rows}
          keyExtractor={(row, index) =>
            row.kind === 'header' ? `h-${row.label}-${index}` : `t-${row.resource.id}`
          }
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <Text variant="label" tone="subtle" className="bg-background px-4 pb-1 pt-4">
                {item.label}
              </Text>
            ) : (
              <Pressable
                className="flex-row items-center gap-3 border-b border-border px-4 py-3"
                pressedClassName="active:bg-surface-pressed"
                onPress={() => toggle(item.resource.id)}
                enforceMinTapTarget={false}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected.has(item.resource.id) }}
                accessibilityLabel={`${item.resource.name}, ${item.resource.authorName}`}
              >
                <View className="flex-1">
                  <Text numberOfLines={1}>{item.resource.name}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {item.resource.authorName}
                  </Text>
                </View>

                {selected.has(item.resource.id) && (
                  <Icon name="checkCircle" size={20} color="primary" />
                )}
              </Pressable>
            )
          }
        />
      )}
    </Screen>
  );
}
