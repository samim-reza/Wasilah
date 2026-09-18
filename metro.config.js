/**
 * Metro configuration.
 *
 * NativeWind wraps the default Expo config so Tailwind classes in `global.css`
 * are compiled into style objects at bundle time rather than at runtime.
 */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
