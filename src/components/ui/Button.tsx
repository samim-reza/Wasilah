/**
 * The app's button.
 *
 * Variants map to intent, not appearance, so a redesign changes this file only.
 */
import { ActivityIndicator, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import type { ColorRole } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface VariantStyle {
  container: string;
  pressed: string;
  label: string;
  iconColor: ColorRole;
}

const variants: Record<ButtonVariant, VariantStyle> = {
  primary: {
    container: 'bg-primary',
    pressed: 'bg-primary-pressed',
    label: 'text-primary-foreground',
    iconColor: 'primaryForeground',
  },
  secondary: {
    container: 'bg-surface-muted border border-border',
    pressed: 'bg-surface-pressed',
    label: 'text-content',
    iconColor: 'text',
  },
  ghost: {
    container: 'bg-transparent',
    pressed: 'bg-surface-muted',
    label: 'text-primary',
    iconColor: 'primary',
  },
  danger: {
    container: 'bg-danger-muted border border-danger/30',
    pressed: 'bg-danger-muted',
    label: 'text-danger',
    iconColor: 'danger',
  },
};

const sizes: Record<ButtonSize, { container: string; text: string; icon: number }> = {
  sm: { container: 'px-3 py-2 rounded-md', text: 'text-sm font-semibold', icon: 16 },
  md: { container: 'px-5 py-3 rounded-lg', text: 'text-base font-semibold', icon: 19 },
  lg: { container: 'px-6 py-4 rounded-xl', text: 'text-lg font-semibold', icon: 22 },
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'leading' | 'trailing';
  /** Replaces the label with a spinner and blocks presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Stretches to the container width. */
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'leading',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const style = variants[variant];
  const dimensions = sizes[size];
  const isInactive = disabled || loading;

  return (
    <Pressable
      className={`flex-row items-center justify-center gap-2 ${style.container} ${dimensions.container} ${fullWidth ? 'w-full' : ''} ${isInactive ? 'opacity-50' : ''}`}
      pressedClassName={style.pressed}
      onPress={onPress}
      disabled={isInactive}
      haptic={variant === 'danger' ? 'medium' : 'light'}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      {loading ? (
        // Rendered at the label's size so the button does not resize mid-press.
        <View className="py-0.5">
          <ActivityIndicator size="small" />
        </View>
      ) : (
        <>
          {icon && iconPosition === 'leading' && (
            <Icon name={icon} size={dimensions.icon} color={style.iconColor} />
          )}
          <Text className={`${dimensions.text} ${style.label}`} numberOfLines={1}>
            {label}
          </Text>
          {icon && iconPosition === 'trailing' && (
            <Icon name={icon} size={dimensions.icon} color={style.iconColor} />
          )}
        </>
      )}
    </Pressable>
  );
}
