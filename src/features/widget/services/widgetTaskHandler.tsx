/**
 * What Android calls when it wants the widget drawn — or when an alarm from
 * the widget-alarm module fires with no widget to draw.
 *
 * This runs in a headless JS context: there is no navigation, no React tree
 * from the app, and no providers — so nothing here may reach for a hook, a
 * store or the theme. `loadWidgetModel` reads straight from the device's own
 * storage, which is what lets the widget stay correct for a guest who has
 * never signed in, and on a phone that is offline.
 *
 * It must also never throw and never stall. A crash here is an Android
 * system-level error the user sees as a broken widget on their home screen,
 * and a task that never calls `renderWidget` leaves the widget transparent —
 * so every path ends in a rendered widget, and the data read is given a
 * deadline after which a placeholder is drawn instead.
 *
 * A widget id of -1 is the alarm module's "tick with nothing to draw": the
 * alarms are re-set and the weather alert is considered, and no drawing is
 * attempted because there is no widget to draw on.
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { logger } from '@/lib/monitoring/logger';

import { WasilahWidget } from '../components/WasilahWidget';
import { loadWidgetModel, placeholderWidgetModel, type WidgetModel } from './widgetModel';
import { runWidgetTick } from './widgetTick';

/** Must match the widget name registered in the config plugin. */
export const WIDGET_NAME = 'Streak';

/**
 * Android gives a headless task 30 seconds; storage answers in milliseconds
 * and the weather request is bounded at five. Anything slower than this is
 * stuck, and a placeholder now beats nothing.
 */
const LOAD_DEADLINE_MS = 10_000;

export function withDeadline<T>(promise: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        logger.warn('widget.loadFailed', { error });
        resolve(fallback());
      },
    );
  });
}

async function load(): Promise<WidgetModel> {
  try {
    return await withDeadline(loadWidgetModel(), LOAD_DEADLINE_MS, placeholderWidgetModel);
  } catch (error) {
    logger.warn('widget.renderFailed', { error });
    return placeholderWidgetModel();
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;

  switch (widgetAction) {
    // All three mean the same thing here: draw the current state. There is no
    // cheaper partial update to make.
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const model = await load();
      if (widgetInfo.widgetId >= 0) {
        renderWidget(
          <WasilahWidget model={model} width={widgetInfo.width} height={widgetInfo.height} />,
        );
      }
      await runWidgetTick(model);
      break;
    }

    case 'WIDGET_CLICK':
      // Opening the app and the dua deep link are both handled natively by
      // the click actions set on the tree; nothing to do here.
      break;

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
