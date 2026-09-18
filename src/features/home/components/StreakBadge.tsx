/**
 * The streak indicator.
 *
 * Tone is deliberate: a streak at risk is shown in the warm accent colour, not
 * in red. This is a Quran app, and a missed day is not an emergency — the point
 * is a gentle invitation back, never anxiety.
 */
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { StreakStatus } from '@/features/streak/types/streak.types';

export interface StreakBadgeProps {
  days: number;
  status: StreakStatus;
  compact?: boolean;
}

export function StreakBadge({ days, status, compact = false }: StreakBadgeProps) {
  const { t } = useTranslation();

  if (days === 0) {
    return (
      <View
        className="flex-row items-center gap-1.5 self-start rounded-full bg-surface-muted px-3 py-1.5"
        accessible
        accessibilityLabel={t('streak.started')}
      >
        <Icon name="streakOutline" size={15} color="textSubtle" />
        <Text variant="caption" tone="subtle">
          {t('streak.started')}
        </Text>
      </View>
    );
  }

  const isAtRisk = status === 'at_risk';

  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 ${
        isAtRisk ? 'bg-warning-muted' : 'bg-accent-muted'
      }`}
      accessible
      accessibilityLabel={t('a11y.streakBadge', { count: days })}
    >
      <Icon name="streak" size={15} color={isAtRisk ? 'warning' : 'accent'} />
      <Text
        variant="caption"
        className={`font-semibold ${isAtRisk ? 'text-warning' : 'text-accent'}`}
      >
        {t('streak.dayCount', { count: days })}
      </Text>

      {isAtRisk && !compact && (
        <Text variant="caption" tone="muted">
          · {t('streak.atRisk')}
        </Text>
      )}
    </View>
  );
}
