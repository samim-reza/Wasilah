/**
 * Today's progress.
 *
 * Shows two things at once, because they mean different things: the ring tracks
 * the fuller goal, while the checkmark marks the MINIMUM — the thing that
 * actually keeps the streak alive. A user who has read one ayah has succeeded
 * for the day even with the ring a quarter full, and the card says so.
 */
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { Goal } from '@/features/goals/types/goal.types';
import { totalForUnit, type DayTotals } from '@/features/goals/utils/goalProgress';

export interface DailyGoalCardProps {
  goal: Goal;
  totals: DayTotals;
  completionRatio: number;
  minimumMet: boolean;
  goalMet: boolean;
  onPress?: () => void;
}

/** i18n key for the unit's label, used to describe amounts consistently. */
const unitLabelKeys = {
  ayahs: 'goals.ayahs',
  pages: 'goals.pages',
  minutes: 'goals.minutes',
  rukus: 'goals.rukus',
} as const;

export function DailyGoalCard({
  goal,
  totals,
  completionRatio,
  minimumMet,
  goalMet,
  onPress,
}: DailyGoalCardProps) {
  const { t } = useTranslation();

  const done = Math.floor(totalForUnit(totals, goal.unit));
  const goalLabel = t(unitLabelKeys[goal.unit], { count: goal.amount });

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={t('a11y.progressRing', { read: done, goal: goal.amount })}
    >
      <View className="flex-row items-center gap-4">
        <ProgressRing
          value={completionRatio}
          size={72}
          strokeWidth={7}
          color={goalMet ? 'success' : 'primary'}
          accessibilityLabel={t('a11y.progressRing', { read: done, goal: goal.amount })}
        >
          {goalMet ? (
            <Icon name="check" size={26} color="success" />
          ) : (
            <Text className="text-lg font-bold tabular-nums">{done}</Text>
          )}
        </ProgressRing>

        <View className="flex-1">
          <Text variant="label" tone="subtle">
            {t('goals.title')}
          </Text>
          <Text className="mt-0.5 font-semibold">{goalLabel}</Text>

          <View className="mt-2 flex-row items-center gap-1.5">
            <Icon
              name={minimumMet ? 'checkCircle' : 'streakOutline'}
              size={15}
              color={minimumMet ? 'success' : 'textSubtle'}
            />
            <Text variant="caption" tone={minimumMet ? 'success' : 'muted'} className="flex-1">
              {minimumMet ? t('home.minimumComplete') : t('home.minimumIncomplete')}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
