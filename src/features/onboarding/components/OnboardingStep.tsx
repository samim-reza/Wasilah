/**
 * Shared frame for the onboarding steps.
 *
 * Every step is: a progress dot row, a title, a short body, the choice, and one
 * primary action. Keeping that identical across four screens is what makes a
 * short flow feel short.
 */
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Pressable } from '@/components/ui/Pressable';
import { Screen } from '@/components/layout/Screen';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export interface OnboardingStepProps {
  /** 1-based. */
  step: number;
  totalSteps: number;
  title: string;
  body?: string;
  children?: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  onSkip?: () => void;
}

export function OnboardingStep({
  step,
  totalSteps,
  title,
  body,
  children,
  primaryLabel,
  onPrimary,
  primaryLoading,
  onSkip,
}: OnboardingStepProps) {
  const { t } = useTranslation();

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between py-3">
        <View className="flex-row gap-1.5" accessibilityLabel={`Step ${step} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }, (_, index) => (
            <View
              key={index}
              className={`h-1.5 rounded-full ${
                index < step ? 'w-6 bg-primary' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </View>

        {onSkip && (
          <Pressable onPress={onSkip} haptic="none" accessibilityLabel={t('common.skip')}>
            <Text variant="caption" tone="muted">
              {t('common.skip')}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2 pb-6 pt-8">
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {body && <Text tone="muted">{body}</Text>}
        </View>

        {children}
      </ScrollView>

      <View className="pb-4 pt-2">
        <Button
          label={primaryLabel}
          onPress={onPrimary}
          loading={primaryLoading}
          fullWidth
          size="lg"
        />
      </View>
    </Screen>
  );
}
