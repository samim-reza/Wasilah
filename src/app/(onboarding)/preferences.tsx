/**
 * The optional extras, and the end of onboarding.
 *
 * Everything on this screen is off by default and can be skipped. Prayer and
 * weather reminders both need location, which is requested later, when the
 * feature is first used — not here, where the reason would be abstract.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { markOnboardingComplete } from '@/features/auth/services/authService';
import { OnboardingStep } from '@/features/onboarding/components/OnboardingStep';
import { useReminderSettings } from '@/features/reminders/hooks/useReminderSettings';
import { trackEvent } from '@/lib/analytics/analytics';
import { logger } from '@/lib/monitoring/logger';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const settings = useReminderSettings();
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await keyValueStore.set(storageKeys.onboardingCompleted, true);

      if (user) {
        // Best-effort: a failure here must not trap the user in onboarding.
        await markOnboardingComplete(user.id).catch((error: unknown) => {
          logger.debug('onboarding.markCompleteFailed', { error });
        });
      }

      trackEvent('onboarding_completed', {
        goal_unit: 'ayahs',
        goal_amount: 1,
        reminder_enabled: settings.preferences.dailyReminderEnabled,
      });

      router.replace('/(tabs)/home');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <OnboardingStep
      step={4}
      totalSteps={4}
      title={t('onboarding.contextualTitle')}
      body={t('onboarding.contextualBody')}
      primaryLabel={t('onboarding.finish')}
      onPrimary={() => void handleFinish()}
      primaryLoading={isFinishing}
    >
      <View className="rounded-xl border border-border bg-surface px-4">
        <Switch
          label={t('onboarding.enableStreak')}
          value={settings.preferences.streakReminderEnabled}
          onValueChange={(value) => void settings.update({ streakReminderEnabled: value })}
        />
        <Switch
          label={t('onboarding.enablePrayer')}
          hint={t('prayer.locationNeededBody')}
          value={settings.preferences.prayerRemindersEnabled}
          onValueChange={(value) => void settings.update({ prayerRemindersEnabled: value })}
        />
        <Switch
          label={t('onboarding.enableWeather')}
          hint={t('weather.body')}
          value={settings.preferences.weatherRemindersEnabled}
          onValueChange={(value) => void settings.update({ weatherRemindersEnabled: value })}
        />
      </View>

      <Text variant="caption" tone="subtle" className="pt-4">
        {t('reminders.quietHoursBody')}
      </Text>
    </OnboardingStep>
  );
}
