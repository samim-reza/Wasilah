/**
 * Pushing a fresh streak to the home-screen widget.
 *
 * Android's own `updatePeriodMillis` will not go below half an hour, which is
 * far too slow for the moment that matters: finishing today's reading and
 * looking at the widget. So the app asks for a redraw as soon as a session is
 * recorded, and the periodic update is only the fallback for a day the app is
 * never opened.
 *
 * Everything here is deliberately best-effort. A widget that fails to refresh
 * is a stale number; it must never surface an error into a reading session, so
 * no path throws.
 */
import { Platform } from 'react-native';

import { getLocalHabitState } from '@/features/streak/services/localHabitStore';
import { getDeviceTimezone, todayLocalDate } from '@/lib/datetime/localDate';
import { logger } from '@/lib/monitoring/logger';

/**
 * Asks Android to redraw the streak widget.
 *
 * No-ops on anything but Android. The library is Android-only, so it is
 * imported lazily — a static import would pull native-backed code into the
 * iOS bundle for a feature that cannot exist there.
 */
export async function refreshStreakWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const [{ requestWidgetUpdate }, { StreakWidget }, { STREAK_WIDGET_NAME }] = await Promise.all([
      import('react-native-android-widget'),
      import('../components/StreakWidget'),
      import('./widgetTaskHandler'),
    ]);

    const state = await getLocalHabitState(todayLocalDate(getDeviceTimezone()));

    await requestWidgetUpdate({
      widgetName: STREAK_WIDGET_NAME,
      renderWidget: () => (
        <StreakWidget
          currentStreak={state.streak.currentStreak}
          minimumMet={state.minimumMet}
          streakLabel="day streak"
          callToAction="Read one ayah"
        />
      ),
      // Nothing to do when the user has not added the widget, which is the
      // overwhelmingly common case.
      widgetNotFound: () => undefined,
    });
  } catch (error) {
    logger.debug('widget.updateSkipped', { error });
  }
}
