/**
 * Pressable with the app's standard feedback behaviour.
 *
 * Exists so that press feedback, haptics and the minimum tap target are decided
 * once. React Native's default `Pressable` has no visual feedback at all, which
 * on Android reads as an unresponsive app.
 */
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type GestureResponderEvent,
} from 'react-native';

import { minTapTarget } from '@/theme/tokens';

export type HapticStyle = 'none' | 'light' | 'medium' | 'success';

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  className?: string;
  /**
   * Press feedback, expressed as NativeWind `active:` utilities
   * (e.g. `active:bg-surface-pressed`). Using a variant rather than a
   * style-callback keeps the transition on the native side instead of
   * re-running a JS function on every press frame.
   */
  pressedClassName?: string;
  haptic?: HapticStyle;
  /** Set false for elements inside an already-large row. */
  enforceMinTapTarget?: boolean;
}

function triggerHaptic(style: HapticStyle): void {
  // Fire-and-forget: haptics are unavailable on some devices and a rejected
  // promise here must never interrupt the press handler.
  switch (style) {
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      break;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      break;
    default:
      break;
  }
}

export function Pressable({
  className = '',
  pressedClassName = 'active:opacity-70',
  haptic = 'light',
  enforceMinTapTarget = true,
  onPress,
  disabled,
  ...props
}: PressableProps) {
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (haptic !== 'none') triggerHaptic(haptic);
      onPress?.(event);
    },
    [haptic, onPress],
  );

  return (
    <RNPressable
      className={`${className} ${disabled ? '' : pressedClassName}`}
      // Expands the touch area without changing layout, which is how small
      // icons meet the 44pt guidance inside dense rows.
      hitSlop={enforceMinTapTarget ? 8 : undefined}
      style={
        enforceMinTapTarget ? { minHeight: minTapTarget, justifyContent: 'center' } : undefined
      }
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityState={{ disabled: Boolean(disabled), ...props.accessibilityState }}
      {...props}
    />
  );
}
