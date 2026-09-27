/**
 * Choosing a daily reading target.
 *
 * Time, not ayahs: the streak grows on each day this much time is spent
 * reading. Five minutes is preselected — enough to read with attention, short
 * enough for any day — and anything else is one tap away, here or later.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { Text } from '@/components/ui/Text';
import { DailyTargetOptions } from '@/features/goals/components/DailyTargetOptions';
import { defaultGoal, timeGoal } from '@/features/goals/types/goal.types';
import { OnboardingStep } from '@/features/onboarding/components/OnboardingStep';
import { useHabitState } from '@/features/streak/hooks/useHabitState';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { trackEvent } from '@/lib/analytics/analytics';

export default function GoalsScreen() {
  const { t } = useTranslation();
  const habit = useHabitState();
  const [minutes, setMinutes] = useState(defaultGoal.amount);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      await habit.updateGoal(timeGoal(minutes));
      trackEvent('goal_changed', { goal_unit: 'minutes', goal_amount: minutes });
      router.push('/(onboarding)/reminders');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingStep
      step={2}
      totalSteps={4}
      title={t('onboarding.goalTitle')}
      body={t('onboarding.goalBody')}
      primaryLabel={t('common.continue')}
      onPrimary={() => void handleContinue()}
      primaryLoading={isSaving}
      onSkip={() => router.push('/(onboarding)/reminders')}
    >
      <DailyTargetOptions value={minutes} onChange={setMinutes} />

      <Text variant="caption" tone="subtle" className="pt-4">
        {t('goals.minimumExplainer')}
      </Text>
    </OnboardingStep>
  );
}
