/**
 * App entry.
 *
 * Exists only so the Android widget's task handler can be registered before
 * the router mounts. Android invokes that handler in a headless JS context
 * with no React tree, so it has to be registered at module scope rather than
 * from inside a component.
 *
 * `require` rather than `import` because the registration must happen in this
 * order, and ES import hoisting would run `expo-router/entry` first.
 *
 * Guarded by platform AND by try/catch, because this file runs before
 * anything else in the app and an unhandled throw here is a blank screen with
 * no route rendered and nothing logged. `react-native-android-widget` is
 * Android-only native code, so it is absent on iOS and absent in Expo Go —
 * both of which must still boot.
 */
const { Platform } = require('react-native');

if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/features/widget/services/widgetTaskHandler');

    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (error) {
    // A missing widget is a missing convenience; a missing app is a bug
    // report. Losing the widget is always the better failure.
    console.warn('Widget task handler not registered:', error);
  }
}

require('expo-router/entry');
