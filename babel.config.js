/**
 * Babel configuration.
 *
 * Plugin order matters: `react-native-worklets/plugin` (which supersedes the old
 * reanimated plugin in Reanimated 4) must be listed last so it can see the final
 * shape of every function it needs to workletize.
 */
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: ['react-native-worklets/plugin'],
  };
};
