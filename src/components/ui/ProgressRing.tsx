/**
 * Circular progress indicator, used for the daily goal on the home screen.
 *
 * Drawn with SVG rather than two overlapping views because the arc must render
 * crisply at any size and support a partial sweep. The dash-offset technique
 * keeps it to a single stroked circle with no per-frame path recalculation.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';
import type { ColorRole } from '@/theme/tokens';

export interface ProgressRingProps {
  /** 0–1, clamped. */
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: ColorRole;
  trackColor?: ColorRole;
  accessibilityLabel: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = 'primary',
  trackColor = 'surfaceMuted',
  accessibilityLabel,
  children,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

  const { radius, circumference } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    return { radius: r, circumference: 2 * Math.PI * r };
  }, [size, strokeWidth]);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors[trackColor]}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          // SVG arcs start at 3 o'clock; rotate so progress begins at the top.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {children && <View className="absolute inset-0 items-center justify-center">{children}</View>}
    </View>
  );
}
