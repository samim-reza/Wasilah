import { ActivityIndicator, View } from 'react-native';

import { Text } from '@/components/ui/Text';

export interface LoadingStateProps {
  /** Optional line under the spinner; omit for short waits. */
  label?: string;
}

/**
 * Fallback for loads whose eventual shape is unknown. Where the layout IS
 * known, prefer `Skeleton` — it reads as faster.
 */
export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View
      className="flex-1 items-center justify-center gap-3 py-12"
      accessibilityRole="progressbar"
    >
      <ActivityIndicator />
      {label && (
        <Text tone="muted" variant="caption">
          {label}
        </Text>
      )}
    </View>
  );
}
