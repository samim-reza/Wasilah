/**
 * Pushing a fresh picture to the home-screen widget from inside the app.
 *
 * Android's own `updatePeriodMillis` will not go below half an hour, which is
 * far too slow for the moments that matter: finishing today's reading and
 * looking at the widget, or the app learning the weather has turned to rain.
 * So the app asks for a redraw at those moments, and on every return to the
 * foreground; the alarms set by the tick cover the moments in between, and
 * the periodic update is only the fallback for a day the app is never opened.
 *
 * Everything here is deliberately best-effort. A widget that fails to refresh
 * is a stale picture; it must never surface an error into a reading session,
 * so no path throws.
 */
import { Platform } from 'react-native';

import { logger } from '@/lib/monitoring/logger';

/**
 * Redraws every placed widget, re-sets the alarms and considers the weather
 * alert — the same tick the headless task runs, started from the app.
 *
 * No-ops on anything but Android. The library is Android-only, so it is
 * imported lazily — a static import would pull native-backed code into the
 * web bundle for a feature that cannot exist there.
 */
export async function refreshWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const [{ requestWidgetUpdate }, { WasilahWidget }, { WIDGET_NAME }, { loadWidgetModel }, tick] =
      await Promise.all([
        import('react-native-android-widget'),
        import('../components/WasilahWidget'),
        import('./widgetTaskHandler'),
        import('./widgetModel'),
        import('./widgetTick'),
      ]);

    const model = await loadWidgetModel();

    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: (info) => (
        <WasilahWidget model={model} width={info.width} height={info.height} />
      ),
      // Nothing to draw when the user has not added the widget; the alarms
      // and the weather alert below still matter.
      widgetNotFound: () => undefined,
    });

    await tick.runWidgetTick(model);
  } catch (error) {
    logger.debug('widget.updateSkipped', { error });
  }
}
