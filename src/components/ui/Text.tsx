/**
 * Typography primitive.
 *
 * Wraps React Native's `Text` so every string in the app picks up a scale step
 * and a semantic colour by default, rather than each screen re-deciding. Also
 * the single place `allowFontScaling` behaviour is set, which matters for the
 * accessibility requirement that Arabic stay readable at large sizes.
 */
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant =
  /** Screen titles. */
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  /** Default body copy. */
  | 'body'
  | 'bodyLarge'
  /** Metadata, timestamps, captions. */
  | 'caption'
  /** All-caps section labels. */
  | 'label'
  /** Numeric emphasis: streak counts, stats. */
  | 'stat';

export type TextTone =
  'default' | 'muted' | 'subtle' | 'primary' | 'accent' | 'danger' | 'success' | 'inverse';

const variantClasses: Record<TextVariant, string> = {
  display: 'text-4xl font-bold',
  title: 'text-3xl font-bold',
  heading: 'text-xl font-semibold',
  subheading: 'text-lg font-semibold',
  bodyLarge: 'text-lg',
  body: 'text-base',
  caption: 'text-sm',
  label: 'text-xs font-semibold uppercase tracking-wide',
  stat: 'text-3xl font-bold tabular-nums',
};

const toneClasses: Record<TextTone, string> = {
  default: 'text-content',
  muted: 'text-content-muted',
  subtle: 'text-content-subtle',
  primary: 'text-primary',
  accent: 'text-accent',
  danger: 'text-danger',
  success: 'text-success',
  inverse: 'text-primary-foreground',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
}

export function Text({ variant = 'body', tone = 'default', className = '', ...props }: TextProps) {
  return (
    <RNText
      className={`${variantClasses[variant]} ${toneClasses[tone]} ${className}`}
      // Honouring the OS text size is an accessibility requirement, not an
      // option. Layouts are built to absorb it.
      allowFontScaling
      // Beyond ~1.6x the app's own large-text settings take over; without a cap
      // the tab bar and stat rows become unusable.
      maxFontSizeMultiplier={1.6}
      {...props}
    />
  );
}
