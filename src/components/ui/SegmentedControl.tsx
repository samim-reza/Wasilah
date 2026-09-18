/**
 * Segmented control for a small set of mutually exclusive options
 * (reading mode, Surah/Juz/Page, theme).
 *
 * Generic over the option value so callers keep their union types rather than
 * casting strings back and forth.
 */
import { View } from 'react-native';

import { Pressable } from './Pressable';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      className="flex-row rounded-lg bg-surface-muted p-1"
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            key={option.value}
            className={`flex-1 items-center rounded-md py-2 ${isSelected ? 'bg-surface' : ''}`}
            pressedClassName="opacity-70"
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            enforceMinTapTarget={false}
          >
            <Text
              variant="caption"
              className={isSelected ? 'font-semibold text-content' : 'text-content-muted'}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
