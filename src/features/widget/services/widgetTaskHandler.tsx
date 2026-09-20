/**
 * What Android calls when it wants the widget drawn.
 *
 * This runs in a headless JS context: there is no navigation, no React tree
 * from the app, and no providers — so nothing here may reach for a hook, a
 * store or the theme. It reads straight from AsyncStorage through the same
 * local habit store the app uses, which is what lets the widget stay correct
 * for a guest who has never signed in.
 *
 * It must also never throw. A crash here is an Android system-level error the
 * user sees as a broken widget on their home screen, so every path ends in a
 * rendered widget, even when the data cannot be read.
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { getLocalHabitState } from '@/features/streak/services/localHabitStore';
import { getDeviceTimezone, todayLocalDate } from '@/lib/datetime/localDate';
import { logger } from '@/lib/monitoring/logger';

import { StreakWidget } from '../components/StreakWidget';

/** Must match the widget name registered in the config plugin. */
export const STREAK_WIDGET_NAME = 'Streak';

/**
 * Copy is passed in rather than translated here.
 *
 * The headless context has no I18nProvider, and pulling the locale machinery
 * into it would mean loading the whole translation layer on every OS redraw.
 * English is used as the fallback; see `docs/` if this ever needs localising
 * properly — it would mean persisting the chosen locale's strings alongside
 * the habit state.
 */
const FALLBACK_COPY = {
  streakLabel: 'day streak',
  callToAction: 'Read one ayah',
};

async function renderStreak(renderWidget: WidgetTaskHandlerProps['renderWidget']) {
  try {
    const timezone = getDeviceTimezone();
    const state = await getLocalHabitState(todayLocalDate(timezone));

    renderWidget(
      <StreakWidget
        currentStreak={state.streak.currentStreak}
        minimumMet={state.minimumMet}
        streakLabel={FALLBACK_COPY.streakLabel}
        callToAction={FALLBACK_COPY.callToAction}
      />,
    );
  } catch (error) {
    logger.warn('widget.renderFailed', { error });
    // A widget showing zero is wrong but harmless; a widget that threw is a
    // system error the user sees on their home screen.
    renderWidget(
      <StreakWidget
        currentStreak={0}
        minimumMet={false}
        streakLabel={FALLBACK_COPY.streakLabel}
        callToAction={FALLBACK_COPY.callToAction}
      />,
    );
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, renderWidget } = props;

  switch (widgetAction) {
    // All three mean the same thing here: draw the current state. There is no
    // cheaper partial update to make, because the widget only shows one number.
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      await renderStreak(renderWidget);
      break;

    case 'WIDGET_CLICK':
      // Opening the app is handled by the launch intent the plugin installs;
      // nothing to do here beyond leaving the widget as it is.
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
