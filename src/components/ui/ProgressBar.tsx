import { View } from 'react-native';

export interface ProgressBarProps {
  /** 0–1. Values outside the range are clamped rather than overflowing. */
  value: number;
  /** Track height in points. */
  height?: number;
  tone?: 'primary' | 'accent' | 'success';
  accessibilityLabel: string;
}

const toneClasses = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
} as const;

export function ProgressBar({
  value,
  height = 8,
  tone = 'primary',
  accessibilityLabel,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <View
      className="w-full overflow-hidden rounded-full bg-surface-muted"
      style={{ height }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View
        className={`h-full rounded-full ${toneClasses[tone]}`}
        style={{ width: `${clamped * 100}%` }}
      />
    </View>
  );
}
