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
 */
const { registerWidgetTaskHandler } = require('react-native-android-widget');

const { widgetTaskHandler } = require('./src/features/widget/services/widgetTaskHandler');

registerWidgetTaskHandler(widgetTaskHandler);

require('expo-router/entry');
