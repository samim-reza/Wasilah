/**
 * Screen container.
 *
 * Applies the background, safe-area insets and horizontal gutter once, so no
 * screen re-derives them. Edge-to-edge is enabled on Android, which means every
 * screen must account for insets explicitly or content slides under the system
 * bars.
 */
import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  /** Which edges need inset padding. Omit `bottom` inside a tab navigator. */
  edges?: ('top' | 'bottom')[];
  /** Removes the standard horizontal gutter, for full-bleed lists. */
  noPadding?: boolean;
  className?: string;
}

export function Screen({
  edges = ['top'],
  noPadding = false,
  className = '',
  children,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 bg-background ${noPadding ? '' : 'px-4'} ${className}`}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      }}
      {...props}
    >
      {children}
    </View>
  );
}
