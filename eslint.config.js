/**
 * ESLint configuration (flat config).
 *
 * Built on `eslint-config-expo`, with a small set of additional rules that
 * encode this project's architectural boundaries rather than style preferences.
 */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'coverage/**',
      // Deno runtime with its own globals and URL imports; ESLint's Node
      // resolver cannot make sense of it.
      'supabase/functions/**',
      // Generated from src/theme/tokens.ts.
      'global.css',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Unused code is dead weight; the underscore escape hatch is for
      // deliberately ignored positional arguments.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `any` defeats the point of the strict config; `unknown` plus a narrow
      // is almost always what was meant.
      '@typescript-eslint/no-explicit-any': 'error',
      // Production logging goes through `src/lib/monitoring/logger`, which
      // redacts user content. A bare console.log bypasses that.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Edge functions and scripts run outside React Native and legitimately log
    // to stdout, which is their only observability channel.
    files: ['scripts/**/*.ts', 'tests/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
]);
