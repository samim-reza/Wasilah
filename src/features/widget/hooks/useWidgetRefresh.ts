/**
 * Keeps the home-screen widget in step with the app.
 *
 * Redraws it once when the app starts and again every time it returns to the
 * foreground. Those are the moments the widget is most likely to be stale
 * and most likely to be looked at next: the user has just been in the app,
 * and the home screen is where they go when they leave it.
 *
 * It is also the safety net for the widget's own first draw. Android asks
 * for that draw the instant the widget is placed, sometimes before the
 * launcher has told it how big the widget is; a redraw from the app a moment
 * later has the real size.
 */
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { refreshWidget } from '../services/updateWidget';

export function useWidgetRefresh(): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void refreshWidget();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshWidget();
    });
    return () => subscription.remove();
  }, []);
}
