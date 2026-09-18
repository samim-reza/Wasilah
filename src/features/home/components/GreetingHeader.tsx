import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { StreakStatus } from '@/features/streak/types/streak.types';

import { StreakBadge } from './StreakBadge';

export interface GreetingHeaderProps {
  displayName: string | null;
  streakDays: number;
  streakStatus: StreakStatus;
}

export function GreetingHeader({ displayName, streakDays, streakStatus }: GreetingHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3 pb-2 pt-4">
      <Text variant="title" accessibilityRole="header">
        {displayName ? t('home.greetingNamed', { name: displayName }) : t('home.greeting')}
      </Text>
      <StreakBadge days={streakDays} status={streakStatus} />
    </View>
  );
}
