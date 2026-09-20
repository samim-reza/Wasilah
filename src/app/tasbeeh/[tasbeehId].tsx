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
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CounterBead } from '@/features/tasbeeh/components/CounterBead';
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
    const willCompleteRound =
      tasbeeh.dailyTarget > 0 && (progress.todayCount + 1) % tasbeeh.dailyTarget === 0;
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
        {/* The name is the display. It may be Arabic, so it gets the Arabic
            face and enough leading for the diacritics. */}
        <View className="items-center gap-2 px-4 pt-2">
          <Text
            className="font-arabic text-center text-content"
            style={{ fontSize: 24, lineHeight: 24 * arabicLineHeightRatio }}
            allowFontScaling={false}
          >
            {tasbeeh.name}
          </Text>
        </View>

        {/* The ring tracks the daily target and sits around the bead; the
            bead itself is the tap target, which is the whole middle of the
            screen. */}
        <ProgressRing
          value={tasbeeh.dailyTarget > 0 ? progress.dailyProgress : 0}
          size={272}
          strokeWidth={8}
          accessibilityLabel={t('tasbeeh.countUp')}
        >
          <CounterBead
            size={232}
            onPress={onPress}
            accessibilityLabel={t('tasbeeh.countUp')}
            accessibilityValue={{ now: progress.todayCount }}
          >
            {/* Today's figure is what the ring tracks, so it belongs in the
                middle. The lifetime total sits under it. */}
            <Text className="text-5xl font-bold text-content" allowFontScaling={false}>
              {progress.todayCount}
            </Text>
            <Text variant="caption" tone="muted">
              {t('tasbeeh.totalCount', { count: progress.totalCount })}
            </Text>
          </CounterBead>
        </ProgressRing>

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
