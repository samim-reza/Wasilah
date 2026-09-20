/**
 * The home-screen widget.
 *
 * Rendered by `react-native-android-widget`, which turns this tree into a
 * native RemoteViews layout. That imposes real limits worth knowing before
 * editing: only the element set from that library is available (FlexWidget,
 * TextWidget, and so on), there is no state, no effects and no touch handling
 * beyond `clickAction`, and it re-renders only when the app or the OS asks it
 * to. Treat it as a picture that occasionally redraws, not as a screen.
 *
 * What it shows is deliberately the streak and nothing else. A widget earns
 * its place by answering one question at a glance — here, "am I still on?" —
 * and an ayah rendered at widget size in Arabic would be too small to read
 * with the diacritics this app is careful about elsewhere.
 */
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface StreakWidgetProps {
  currentStreak: number;
  /** Whether today's minimum is already met. Drives the whole colour story. */
  minimumMet: boolean;
  /** Short label such as 'Read one ayah'. Kept translated by the caller. */
  callToAction: string;
  streakLabel: string;
}

/** Brand colours, inlined because the widget cannot read the app's theme. */
const BRAND = '#0F6B5C';
const DONE_BACKGROUND = '#0F6B5C';
const PENDING_BACKGROUND = '#FFFFFF';

export function StreakWidget({
  currentStreak,
  minimumMet,
  callToAction,
  streakLabel,
}: StreakWidgetProps) {
  const background = minimumMet ? DONE_BACKGROUND : PENDING_BACKGROUND;
  const foreground = minimumMet ? '#FFFFFF' : BRAND;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: background,
        borderRadius: 24,
        paddingHorizontal: 12,
      }}
      // Opens the app. The handler in `widgetTaskHandler` receives this name.
      clickAction="OPEN_APP"
    >
      <TextWidget
        text={String(currentStreak)}
        style={{ fontSize: 36, fontWeight: 'bold', color: foreground }}
      />
      <TextWidget text={streakLabel} style={{ fontSize: 12, color: foreground }} />
      {!minimumMet && (
        <TextWidget
          text={callToAction}
          style={{ fontSize: 11, color: foreground, marginTop: 6 }}
        />
      )}
    </FlexWidget>
  );
}
