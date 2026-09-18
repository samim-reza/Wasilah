import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  /** One sentence explaining how the user fills this space. */
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'empty',
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-12">
      <View className="rounded-full bg-surface-muted p-4">
        <Icon name={icon} size={28} color="textSubtle" />
      </View>

      <Text variant="subheading" className="text-center">
        {title}
      </Text>

      {body && (
        <Text tone="muted" className="text-center">
          {body}
        </Text>
      )}

      {actionLabel && onAction && (
        <View className="mt-2">
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      )}
    </View>
  );
}
