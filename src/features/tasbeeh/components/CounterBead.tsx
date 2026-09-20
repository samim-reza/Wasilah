/**
 * The bead you press.
 *
 * Built to read as a physical object rather than a flat circle, because that
 * is what makes a counter feel like a tasbeeh instead of a form control. Three
 * things do the work, and all three are needed — any one alone looks like a
 * mistake:
 *
 *   • a drop shadow beneath, which lifts it off the page;
 *   • a lighter ring inside the top edge and a darker one at the bottom,
 *     which is what suggests a curved surface catching light from above;
 *   • the whole thing moving DOWN and losing its shadow while held, so the
 *     press is felt visually and not only through haptics.
 *
 * The press animation is 60ms on the way down and 120ms coming back. Down has
 * to be immediate or the button feels laggy at the speed this gets tapped;
 * coming back can be slower because nobody is waiting on it.
 *
 * Shadows differ by platform on purpose: `elevation` is the only thing Android
 * honours, `shadow*` the only thing iOS does, and web needs neither since
 * React Native Web maps shadow props to box-shadow.
 */
import { useState } from 'react';
import { Animated, Platform, Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface CounterBeadProps {
  size: number;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityValue?: { now?: number };
  children: React.ReactNode;
}

/** Depth while resting. Removed on press so the bead reads as pushed in. */
function restingShadow(color: string): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation: 12 },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },
  }) as ViewStyle;
}

export function CounterBead({
  size,
  onPress,
  accessibilityLabel,
  accessibilityValue,
  children,
}: CounterBeadProps) {
  const { colors, scheme } = useTheme();

  // Lazy `useState` rather than `useRef().current`: both give one stable
  // Animated.Value for the component's life, but reading a ref during render
  // is what the React Compiler rules forbid. The value is never set through
  // state, so this still causes no re-render on press — which matters at the
  // rate this gets tapped.
  const [depth] = useState(() => new Animated.Value(0));

  const press = (toValue: number, duration: number) =>
    Animated.timing(depth, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();

  const translateY = depth.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  const scale = depth.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] });

  // In dark mode the highlight has to be lighter than the surface and the
  // shade darker; inverting them would make the bead look lit from below.
  const highlight = scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.9)';
  const shade = scheme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.10)';

  return (
    <Pressable
      onPressIn={() => press(1, 60)}
      onPressOut={() => press(0, 120)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
    >
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        {/* The cast shadow. Separate from the bead so the bead's own inner
            edges are not blurred along with it. */}
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surface,
              // Fades as the bead is pressed down toward the page.
              opacity: depth.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }),
            },
            restingShadow(scheme === 'dark' ? '#000000' : colors.primary),
          ]}
        >
          {/* Lit top edge. */}
          <View
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: size / 2,
              borderTopWidth: 2,
              borderLeftWidth: 1,
              borderColor: highlight,
            }}
          />
          {/* Shaded bottom edge, which is what implies the curve. */}
          <View
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: size / 2,
              borderBottomWidth: 3,
              borderRightWidth: 1,
              borderColor: shade,
            }}
          />

          <View className="flex-1 items-center justify-center">{children}</View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
