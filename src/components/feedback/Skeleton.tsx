/**
 * Shimmer placeholder.
 *
 * Skeletons are used instead of spinners wherever the eventual layout is known,
 * because a placeholder in the right shape makes a load feel shorter than a
 * spinner does. The pulse is driven by Reanimated on the UI thread so it keeps
 * running while JS is busy parsing the response that will replace it.
 */
import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/lib/accessibility/useReducedMotion';

const PULSE: WithTimingConfig = { duration: 900 };

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Matches the radius of whatever it stands in for. */
  radius?: number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  className = '',
}: SkeletonProps) {
  const opacity = useSharedValue(0.5);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(withTiming(1, PULSE), -1, true);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={`bg-skeleton ${className}`}
      style={[{ width, height, borderRadius: radius }, animatedStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** A stack of skeleton lines, for paragraph-shaped content. */
export function SkeletonText({ lines = 3, lastLineWidth = '60%' as DimensionValue }) {
  return (
    <View className="gap-2">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} height={14} width={index === lines - 1 ? lastLineWidth : '100%'} />
      ))}
    </View>
  );
}
