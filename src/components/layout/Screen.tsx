/**
 * Screen container.
 *
 * Applies the background, safe-area insets and horizontal gutter once, so no
 * screen re-derives them. Edge-to-edge is enabled on Android, which means every
 * screen must account for insets explicitly or content slides under the system
 * bars.
 *
 * On a wide viewport the content column is capped and centred. Every layout in
 * this app is flex-based and was designed for a phone: on a laptop the reading
 * calendar's cells stretched to a quarter of the screen each, and a settings
 * row ran the full width of a 27-inch monitor. Capping here rather than per
 * screen means no screen can forget. The cap is applied only past a phone
 * width, so nothing changes on the device the app was designed for.
 */
import { useWindowDimensions, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  /** Which edges need inset padding. Omit `bottom` inside a tab navigator. */
  edges?: ('top' | 'bottom')[];
  /** Removes the standard horizontal gutter, for full-bleed lists. */
  noPadding?: boolean;
  className?: string;
}

/**
 * Widest the content column is allowed to be.
 *
 * Roughly a comfortable line length for the translation text at its default
 * size; the reader is the screen this matters most for, and long lines are
 * what make prose tiring on a wide screen.
 */
export const CONTENT_MAX_WIDTH = 760;

/** Below this, the column is the whole viewport, exactly as on a phone. */
const WIDE_VIEWPORT = 820;

export function Screen({
  edges = ['top'],
  noPadding = false,
  className = '',
  children,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_VIEWPORT;

  return (
    <View
      className={`flex-1 bg-background ${className}`}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        // Centres the column on a wide screen; on a phone this is a no-op.
        alignItems: isWide ? 'center' : 'stretch',
      }}
      {...props}
    >
      <View
        className={`flex-1 ${noPadding ? '' : 'px-4'}`}
        style={{ width: '100%', maxWidth: isWide ? CONTENT_MAX_WIDTH : undefined }}
      >
        {children}
      </View>
    </View>
  );
}
