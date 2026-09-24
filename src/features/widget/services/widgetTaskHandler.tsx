/**
 * What Android calls when it wants the widget drawn.
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
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { logger } from '@/lib/monitoring/logger';

import { WasilahWidget } from '../components/WasilahWidget';
import { loadWidgetModel, placeholderWidgetModel, type WidgetModel } from './widgetModel';

/** Must match the widget name registered in the config plugin. */
export const WIDGET_NAME = 'Streak';

/**
 * Android gives a headless task 30 seconds; storage answers in milliseconds.
 * Anything slower than this is stuck, and a placeholder now beats nothing.
 */
const LOAD_DEADLINE_MS = 5_000;

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

async function draw(props: WidgetTaskHandlerProps) {
  const { widgetInfo, renderWidget } = props;

  let model: WidgetModel;
  try {
    model = await withDeadline(loadWidgetModel(), LOAD_DEADLINE_MS, placeholderWidgetModel);
  } catch (error) {
    logger.warn('widget.renderFailed', { error });
    model = placeholderWidgetModel();
  }

  renderWidget(<WasilahWidget model={model} width={widgetInfo.width} height={widgetInfo.height} />);
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    // All three mean the same thing here: draw the current state. There is no
    // cheaper partial update to make.
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      await draw(props);
      break;

    case 'WIDGET_CLICK':
      // Opening the app and the dua deep link are both handled natively by
      // the click actions set on the tree; nothing to do here.
      break;

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
