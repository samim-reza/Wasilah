/**
 * A tappable icon. Always requires an accessibility label, because an icon
 * alone tells a screen reader nothing.
 */
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import type { ColorRole } from '@/theme/tokens';

export interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  /** Required: describes the action, e.g. 'Bookmark this ayah'. */
  accessibilityLabel: string;
  size?: number;
  color?: ColorRole;
  /** Adds a circular tinted background. */
  filled?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 22,
  color = 'text',
  filled = false,
  disabled = false,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      className={`items-center justify-center rounded-full ${filled ? 'bg-surface-muted p-2.5' : 'p-2'} ${disabled ? 'opacity-40' : ''}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}
