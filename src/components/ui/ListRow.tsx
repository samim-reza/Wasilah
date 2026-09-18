/**
 * A settings/list row: leading icon, label, optional value, trailing chevron.
 * Every settings screen is built from this rather than re-laying out rows.
 */
import { View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ListRowProps {
  label: string;
  icon?: IconName;
  /** Right-aligned current value, e.g. the selected translation. */
  value?: string;
  hint?: string;
  onPress?: () => void;
  /** Right-hand slot for a switch or custom control. */
  accessory?: React.ReactNode;
  destructive?: boolean;
  testID?: string;
}

export function ListRow({
  label,
  icon,
  value,
  hint,
  onPress,
  accessory,
  destructive = false,
  testID,
}: ListRowProps) {
  const content = (
    <View className="flex-row items-center gap-3 px-4 py-3">
      {icon && <Icon name={icon} size={20} color={destructive ? 'danger' : 'textMuted'} />}

      <View className="flex-1">
        <Text tone={destructive ? 'danger' : 'default'}>{label}</Text>
        {hint && (
          <Text variant="caption" tone="muted" className="mt-0.5">
            {hint}
          </Text>
        )}
      </View>

      {value && (
        <Text tone="muted" variant="caption" numberOfLines={1} className="max-w-[45%] text-right">
          {value}
        </Text>
      )}

      {accessory}
      {onPress && !accessory && <Icon name="forward" size={18} color="textSubtle" />}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      pressedClassName="bg-surface-pressed"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={hint}
      enforceMinTapTarget={false}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

/** Groups rows into a titled card with hairlines between them. */
export function ListSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      {title && (
        <Text variant="label" tone="subtle" className="mb-2 px-4">
          {title}
        </Text>
      )}
      <View className="overflow-hidden rounded-xl border border-border bg-surface">{children}</View>
    </View>
  );
}
