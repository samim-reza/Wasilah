/**
 * Choosing a reminder time.
 *
 * Permission is requested only after the user has picked a time, so the OS
 * prompt arrives with the reason already established. Asking first, cold, is
 * the surest way to get a permanent denial.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { OnboardingStep } from '@/features/onboarding/components/OnboardingStep';
import { TimePickerRow } from '@/features/reminders/components/TimePickerRow';
import { useReminderSettings } from '@/features/reminders/hooks/useReminderSettings';
import type { TimeOfDay } from '@/lib/datetime/timeOfDay';
import { useTranslation } from '@/lib/i18n/I18nProvider';

interface TimePreset {
  id: string;
  labelKey: string;
  time: TimeOfDay;
}

const presets: TimePreset[] = [
  { id: 'morning', labelKey: 'onboarding.reminderMorning', time: { hour: 7, minute: 30 } },
  {
    id: 'after-prayer',
    labelKey: 'onboarding.reminderAfterPrayer',
    time: { hour: 13, minute: 30 },
  },
  { id: 'evening', labelKey: 'onboarding.reminderEvening', time: { hour: 20, minute: 0 } },
];

export default function RemindersScreen() {
  const { t } = useTranslation();
  const settings = useReminderSettings();

  const [selectedId, setSelectedId] = useState('evening');
  const [customTime, setCustomTime] = useState<TimeOfDay>({ hour: 20, minute: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const resolvedTime =
    selectedId === 'custom'
      ? customTime
      : (presets.find((preset) => preset.id === selectedId)?.time ?? customTime);

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      await settings.update({ dailyReminderEnabled: true, dailyReminderTime: resolvedTime });
      // The prompt comes now, with the choice already made and visible.
      await settings.requestPermission();
      router.push('/(onboarding)/preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingStep
      step={3}
      totalSteps={4}
      title={t('onboarding.reminderTitle')}
      body={t('onboarding.reminderBody')}
      primaryLabel={t('common.continue')}
      onPrimary={() => void handleContinue()}
      primaryLoading={isSaving}
      onSkip={() => router.push('/(onboarding)/preferences')}
    >
      <View className="gap-2">
        {presets.map((preset) => (
          <Pressable
            key={preset.id}
            className={`flex-row items-center justify-between rounded-xl border px-4 py-4 ${
              preset.id === selectedId
                ? 'border-primary bg-primary-muted'
                : 'border-border bg-surface'
            }`}
            onPress={() => setSelectedId(preset.id)}
            enforceMinTapTarget={false}
            accessibilityRole="radio"
            accessibilityState={{ selected: preset.id === selectedId }}
            accessibilityLabel={t(preset.labelKey)}
          >
            <Text className={preset.id === selectedId ? 'font-semibold text-primary' : ''}>
              {t(preset.labelKey)}
            </Text>
            {preset.id === selectedId && <Icon name="checkCircle" size={20} color="primary" />}
          </Pressable>
        ))}

        <Pressable
          className={`rounded-xl border px-1 ${
            selectedId === 'custom' ? 'border-primary bg-primary-muted' : 'border-border bg-surface'
          }`}
          onPress={() => setSelectedId('custom')}
          enforceMinTapTarget={false}
          accessibilityLabel={t('onboarding.reminderCustom')}
        >
          <TimePickerRow
            label={t('onboarding.reminderCustom')}
            value={customTime}
            onChange={(time) => {
              setCustomTime(time);
              setSelectedId('custom');
            }}
          />
        </Pressable>
      </View>

      <Text variant="caption" tone="subtle" className="pt-4">
        {t('onboarding.permissionBody')}
      </Text>
    </OnboardingStep>
  );
}
