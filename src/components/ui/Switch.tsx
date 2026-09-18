/**
 * Toggle. Wraps the platform switch so the brand colour and the label/hint
 * layout are consistent everywhere a setting appears.
 */
import { Switch as RNSwitch, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  /** One line explaining the consequence of turning this on. */
  hint?: string;
  disabled?: boolean;
  testID?: string;
}

export function Switch({ value, onValueChange, label, hint, disabled, testID }: SwitchProps) {
  const { colors } = useTheme();

  return (
    <View className={`flex-row items-center gap-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <View className="flex-1">
        <Text>{label}</Text>
        {hint && (
          <Text variant="caption" tone="muted" className="mt-0.5">
            {hint}
          </Text>
        )}
      </View>

      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfacePressed, true: colors.primary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.surfacePressed}
        accessibilityLabel={label}
        accessibilityHint={hint}
        testID={testID}
      />
    </View>
  );
}
