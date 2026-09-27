/**
 * The list of daily reading times to choose from.
 *
 * Shared by onboarding and the daily-target screen, so the choice looks and
 * behaves the same wherever it is made.
 */
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { dailyMinuteChoices } from '../types/goal.types';

export interface DailyTargetOptionsProps {
  /** Selected minutes, or null when none of the choices is selected. */
  value: number | null;
  onChange: (minutes: number) => void;
}

export function DailyTargetOptions({ value, onChange }: DailyTargetOptionsProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-2" accessibilityRole="radiogroup">
      {dailyMinuteChoices.map((minutes) => {
        const selected = minutes === value;
        const label = t('goals.minutesPerDay', { count: minutes });

        return (
          <Pressable
            key={minutes}
            className={`flex-row items-center justify-between rounded-xl border px-4 py-4 ${
              selected ? 'border-primary bg-primary-muted' : 'border-border bg-surface'
            }`}
            pressedClassName="active:opacity-80"
            onPress={() => onChange(minutes)}
            enforceMinTapTarget={false}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
          >
            <Text className={selected ? 'font-semibold text-primary' : ''}>{label}</Text>
            {selected && <Icon name="checkCircle" size={20} color="primary" />}
          </Pressable>
        );
      })}
    </View>
  );
}
