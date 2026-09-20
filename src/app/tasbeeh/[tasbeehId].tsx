/**
 * The counter itself.
 *
 * The whole circle is the button. A dhikr counter is pressed hundreds of times
 * in a sitting, often without looking, so the target has to be enormous and in
 * the middle of the screen — a small "+" would make this tiring to use, which
 * is the one thing it must not be.
 *
 * Haptics on every press, and on rounds a heavier one: the physical tasbeeh
 * this replaces gives feedback through the fingers, and that is what lets
 * someone count without watching the screen.
 */
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useTasbeeh } from '@/features/tasbeeh/hooks/useTasbeeh';
import { deriveProgress } from '@/features/tasbeeh/utils/tasbeehProgress';
import { useLocalDate } from '@/lib/datetime/useLocalDate';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { arabicLineHeightRatio } from '@/theme/tokens';

export default function TasbeehCounterScreen() {
  const { t } = useTranslation();
  const { today } = useLocalDate();
  const { tasbeehId } = useLocalSearchParams<{ tasbeehId: string }>();
  const { find, press, stepBack, resetOne, isLoading } = useTasbeeh();

  const tasbeeh = find(tasbeehId ?? '');

  if (!tasbeeh) {
    return (
      <Screen edges={['top']} noPadding>
        <ScreenHeader title={t('tasbeeh.title')} />
        <View className="px-4">
          <Text tone="muted">{isLoading ? t('common.loading') : t('tasbeeh.notFound')}</Text>
        </View>
      </Screen>
    );
  }

  const progress = deriveProgress(tasbeeh, today);

  const onPress = () => {
    const willCompleteRound = progress.countInRound + 1 >= tasbeeh.roundSize;
    // A round completing is the moment worth feeling, so it gets the heavier
    // notification haptic rather than the light tick every bead gets.
    void (willCompleteRound
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    press(tasbeeh.id);
  };

  return (
    <Screen edges={['top']} noPadding>
      <ScreenHeader title={tasbeeh.name} />

      <View className="flex-1 items-center justify-between px-4 pb-8">
        <View className="items-center gap-2 pt-2">
          {tasbeeh.arabic.length > 0 && (
            <Text
              className="font-arabic text-center text-content"
              style={{ fontSize: 24, lineHeight: 24 * arabicLineHeightRatio }}
              allowFontScaling={false}
            >
              {tasbeeh.arabic}
            </Text>
          )}
        </View>

        {/* The tap target: the entire circle, not a button beside it. */}
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('tasbeeh.countUp')}
          accessibilityValue={{ now: tasbeeh.totalCount }}
          className="items-center justify-center active:opacity-90"
        >
          <ProgressRing
            value={tasbeeh.dailyTarget > 0 ? progress.dailyProgress : 0}
            size={260}
            strokeWidth={10}
            accessibilityLabel={t('tasbeeh.countUp')}
          >
            <Text className="text-5xl font-bold text-content" allowFontScaling={false}>
              {tasbeeh.totalCount}
            </Text>
            <Text variant="caption" tone="muted">
              {t('tasbeeh.countOfRound', {
                count: progress.countInRound,
                size: tasbeeh.roundSize,
              })}
            </Text>
          </ProgressRing>
        </Pressable>

        <View className="w-full gap-4">
          <View className="flex-row justify-between px-2">
            <Text variant="caption" tone="muted">
              {t('tasbeeh.rounds', { count: progress.rounds })}
            </Text>
            {tasbeeh.dailyTarget > 0 && (
              <Text variant="caption" tone="muted">
                {t('tasbeeh.todayOfTarget', {
                  today: progress.todayCount,
                  target: tasbeeh.dailyTarget,
                })}
              </Text>
            )}
          </View>

          <View className="flex-row items-center justify-around">
            <IconButton
              name="sync"
              size={22}
              color="textMuted"
              onPress={() => resetOne(tasbeeh.id)}
              accessibilityLabel={t('tasbeeh.reset')}
            />
            <IconButton
              name="remove"
              size={22}
              color="textMuted"
              onPress={() => stepBack(tasbeeh.id)}
              accessibilityLabel={t('tasbeeh.stepBack')}
            />
            <IconButton
              name="settings"
              size={22}
              color="textMuted"
              onPress={() => router.push(`/tasbeeh/edit?id=${tasbeeh.id}`)}
              accessibilityLabel={t('common.edit')}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
