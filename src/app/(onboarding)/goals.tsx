/**
 * Choosing a daily goal.
 *
 * "1 ayah" is first and is the default, because the product's whole promise is
 * that the floor stays trivially low. Anything more ambitious is opt-in.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { goalPresets, type GoalPreset } from '@/features/goals/types/goal.types';
import { OnboardingStep } from '@/features/onboarding/components/OnboardingStep';
import { useHabitState } from '@/features/streak/hooks/useHabitState';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { trackEvent } from '@/lib/analytics/analytics';

export default function GoalsScreen() {
  const { t } = useTranslation();
  const habit = useHabitState();
  const [selectedId, setSelectedId] = useState('ayahs-1');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    const preset = goalPresets.find((candidate) => candidate.id === selectedId);
    if (!preset) return;

    setIsSaving(true);
    try {
      await habit.updateGoal({
        unit: preset.unit,
        amount: preset.amount,
        // The minimum stays at one ayah regardless of the goal chosen. It is
        // what protects the streak on a bad day, and raising it with the goal
        // would defeat the point.
        minimumUnit: 'ayahs',
        minimumAmount: 1,
      });
      trackEvent('goal_changed', { goal_unit: preset.unit, goal_amount: preset.amount });
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
      <View className="gap-2">
        {goalPresets.map((preset) => (
          <GoalOption
            key={preset.id}
            preset={preset}
            selected={preset.id === selectedId}
            onSelect={() => setSelectedId(preset.id)}
          />
        ))}
      </View>

      <Text variant="caption" tone="subtle" className="pt-4">
        {t('goals.minimumExplainer')}
      </Text>
    </OnboardingStep>
  );
}

function GoalOption({
  preset,
  selected,
  onSelect,
}: {
  preset: GoalPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const label = t(preset.labelKey, { count: preset.amount });

  return (
    <Pressable
      className={`flex-row items-center justify-between rounded-xl border px-4 py-4 ${
        selected ? 'border-primary bg-primary-muted' : 'border-border bg-surface'
      }`}
      pressedClassName="active:opacity-80"
      onPress={onSelect}
      enforceMinTapTarget={false}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text className={selected ? 'font-semibold text-primary' : ''}>{label}</Text>
      {selected && <Icon name="checkCircle" size={20} color="primary" />}
    </Pressable>
  );
}
