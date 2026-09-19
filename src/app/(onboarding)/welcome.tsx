import { router } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { branding } from '@/config/branding';
import { trackEvent } from '@/lib/analytics/analytics';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function WelcomeScreen() {
  const { t } = useTranslation();

  const skipToApp = async () => {
    // Skipping still marks onboarding done: asking again on the next launch
    // would be worse than accepting the defaults.
    await keyValueStore.set(storageKeys.onboardingCompleted, true);
    trackEvent('onboarding_skipped', { step: 'welcome' });
    router.replace('/(tabs)/home');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center gap-4">
        <Text
          className="text-center font-arabic text-primary"
          style={{ fontSize: 56, lineHeight: 112 }}
          allowFontScaling={false}
        >
          {branding.appNameArabic}
        </Text>

        <Text variant="display" className="text-center" accessibilityRole="header">
          {t('onboarding.welcomeTitle')}
        </Text>

        <Text tone="muted" className="text-center text-lg leading-7">
          {t('onboarding.welcomeBody')}
        </Text>
      </View>

      <View className="gap-3 pb-4">
        <Button
          label={t('common.continue')}
          onPress={() => {
            trackEvent('onboarding_started', {});
            router.push('/(onboarding)/goals');
          }}
          fullWidth
          size="lg"
        />

        <Pressable
          className="items-center py-2"
          onPress={() => void skipToApp()}
          haptic="none"
          accessibilityLabel={t('common.skip')}
        >
          <Text variant="caption" tone="muted">
            {t('common.skip')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
