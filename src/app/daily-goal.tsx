/**
 * Choosing the daily reading target.
 *
 * Reached from the goal card on Home and from Settings. The streak grows on
 * each day this much time is spent reading, so changing it here changes what
 * counts as a completed day from now on.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { DailyTargetOptions } from '@/features/goals/components/DailyTargetOptions';
import { isTimeGoal, timeGoal } from '@/features/goals/types/goal.types';
import { useHabitState } from '@/features/streak/hooks/useHabitState';
import { trackEvent } from '@/lib/analytics/analytics';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { logger } from '@/lib/monitoring/logger';

export default function DailyGoalScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const habit = useHabitState();
  const [saving, setSaving] = useState<number | null>(null);

  const current = isTimeGoal(habit.goal) ? habit.goal.amount : null;

  const handleChange = async (minutes: number) => {
    if (minutes === current || saving !== null) return;

    setSaving(minutes);
    try {
      await habit.updateGoal(timeGoal(minutes));
      trackEvent('goal_changed', { goal_unit: 'minutes', goal_amount: minutes });
      toast.show(t('goals.saved'), { icon: 'check' });
      if (router.canGoBack()) router.back();
    } catch (error) {
      logger.warn('goals.saveFailed', { error });
      toast.show(t('errors.unknown'), { tone: 'error', icon: 'error' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title={t('goals.dailyTarget')} />

        <View className="gap-4">
          <Text tone="muted">{t('goals.dailyTargetBody')}</Text>

          <DailyTargetOptions
            value={saving ?? current}
            onChange={(minutes) => void handleChange(minutes)}
          />

          <Text variant="caption" tone="subtle">
            {t('goals.minimumExplainer')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
