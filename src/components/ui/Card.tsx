/**
 * Surface container. The default grouping element for everything on the home
 * and progress screens.
 */
import { View, type ViewProps } from 'react-native';

import { Pressable } from './Pressable';

export type CardTone = 'default' | 'muted' | 'primary' | 'accent' | 'outline';

const toneClasses: Record<CardTone, string> = {
  default: 'bg-surface border border-border',
  muted: 'bg-surface-muted',
  primary: 'bg-primary-muted',
  accent: 'bg-accent-muted',
  outline: 'bg-transparent border border-border',
};

export interface CardProps extends ViewProps {
  tone?: CardTone;
  className?: string;
  /** Makes the whole card a single tap target. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  tone = 'default',
  className = '',
  onPress,
  accessibilityLabel,
  children,
  ...props
}: CardProps) {
  const classes = `rounded-xl p-4 ${toneClasses[tone]} ${className}`;

  if (onPress) {
    return (
      <Pressable
        className={classes}
        pressedClassName="opacity-80"
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        enforceMinTapTarget={false}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={classes} {...props}>
      {children}
    </View>
  );
}
