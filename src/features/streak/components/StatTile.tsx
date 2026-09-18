import { View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { ColorRole } from '@/theme/tokens';

export interface StatTileProps {
  icon: IconName;
  label: string;
  value: string;
  tone?: ColorRole;
}

export function StatTile({ icon, label, value, tone = 'primary' }: StatTileProps) {
  return (
    <View
      className="flex-1 gap-1 rounded-xl border border-border bg-surface p-3"
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Icon name={icon} size={18} color={tone} />
      <Text className="text-xl font-bold tabular-nums">{value}</Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
