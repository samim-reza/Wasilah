/**
 * The tasbeeh list.
 *
 * Each row carries its own numbers — the lifetime count and today against the
 * target — because the reason to open this screen is usually to check where
 * you are, not to start counting. Making that require a tap into each counter
 * would be the wrong trade.
 */
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTasbeeh } from '@/features/tasbeeh/hooks/useTasbeeh';
import { deriveProgress } from '@/features/tasbeeh/utils/tasbeehProgress';
import { useLocalDate } from '@/lib/datetime/useLocalDate';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { confirm } from '@/lib/ui/confirm';

export default function TasbeehListScreen() {
  const { t } = useTranslation();
  const { today } = useLocalDate();
  const { list, isLoading, remove } = useTasbeeh();

  const confirmRemove = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: t('tasbeeh.deleteTitle'),
      message: t('tasbeeh.deleteBody', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (confirmed) remove(id);
  };

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title={t('tasbeeh.title')} />

        {!isLoading && list.length === 0 && (
          <Card>
            <Text tone="muted">{t('tasbeeh.empty')}</Text>
          </Card>
        )}

        <View className="gap-3">
          {list.map((entry) => {
            const progress = deriveProgress(entry, today);

            return (
              <Pressable
                key={entry.id}
                onPress={() => router.push(`/tasbeeh/${entry.id}`)}
                accessibilityRole="button"
                accessibilityLabel={entry.name}
              >
                <Card className="flex-row items-center gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold">{entry.name}</Text>

                    {/* The numbers that answer "where am I?" at a glance. */}
                    <Text variant="caption" tone="muted">
                      {t('tasbeeh.rowSummary', { count: progress.totalCount })}
                      {entry.dailyTarget > 0
                        ? ` · ${t('tasbeeh.rowTarget', {
                            today: progress.todayCount,
                            target: entry.dailyTarget,
                          })}`
                        : ''}
                    </Text>
                  </View>

                  {/* `settings` and `trash` rather than `more` and `remove`:
                      a minus sign next to a counter reads as "decrement", and
                      a three-dot menu hides the action behind another tap. */}
                  <IconButton
                    name="settings"
                    size={18}
                    color="textMuted"
                    onPress={() => router.push(`/tasbeeh/edit?id=${entry.id}`)}
                    accessibilityLabel={t('common.edit')}
                  />
                  <IconButton
                    name="trash"
                    size={18}
                    color="danger"
                    onPress={() => void confirmRemove(entry.id, entry.name)}
                    accessibilityLabel={t('common.delete')}
                  />
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => router.push('/tasbeeh/edit')}
          accessibilityRole="button"
          accessibilityLabel={t('tasbeeh.add')}
          className="mt-4"
        >
          <Card className="flex-row items-center justify-center gap-2">
            <Icon name="add" size={18} color="primary" />
            <Text tone="accent" className="font-semibold">
              {t('tasbeeh.add')}
            </Text>
          </Card>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
