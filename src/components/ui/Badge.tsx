import { View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import type { ColorRole } from '@/theme/tokens';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

const toneClasses: Record<BadgeTone, { container: string; text: string; icon: ColorRole }> = {
  neutral: { container: 'bg-surface-muted', text: 'text-content-muted', icon: 'textMuted' },
  primary: { container: 'bg-primary-muted', text: 'text-primary', icon: 'primary' },
  accent: { container: 'bg-accent-muted', text: 'text-accent', icon: 'accent' },
  success: { container: 'bg-success-muted', text: 'text-success', icon: 'success' },
  warning: { container: 'bg-warning-muted', text: 'text-warning', icon: 'warning' },
  danger: { container: 'bg-danger-muted', text: 'text-danger', icon: 'danger' },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  /** Overrides the composed label read by screen readers. */
  accessibilityLabel?: string;
}

export function Badge({ label, tone = 'neutral', icon, accessibilityLabel }: BadgeProps) {
  const style = toneClasses[tone];

  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${style.container}`}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {icon && <Icon name={icon} size={13} color={style.icon} />}
      <Text className={`text-xs font-semibold ${style.text}`}>{label}</Text>
    </View>
  );
}
