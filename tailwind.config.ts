/**
 * Tailwind / NativeWind configuration.
 *
 * Colours are wired to the CSS custom properties emitted by
 * `scripts/generate-theme-css.ts`, so `bg-surface` resolves to the light or dark
 * value automatically and components never need paired `x dark:x` classes.
 */
import type { Config } from 'tailwindcss';

import { fontFamily, fontSize, radius, spacing, staticColors } from './src/theme/tokens';

/** Builds a `rgb(var(--color-x) / <alpha-value>)` entry for every semantic role. */
function themeColor(name: string) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  // `nativewind/preset` ships as CommonJS with no ESM type declarations, so a
  // default import fails to typecheck. Tailwind loads this config through jiti,
  // which handles require() in a .ts file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...staticColors,
        background: themeColor('background'),
        surface: {
          DEFAULT: themeColor('surface'),
          muted: themeColor('surface-muted'),
          pressed: themeColor('surface-pressed'),
        },
        border: {
          DEFAULT: themeColor('border'),
          strong: themeColor('border-strong'),
        },
        content: {
          DEFAULT: themeColor('text'),
          muted: themeColor('text-muted'),
          subtle: themeColor('text-subtle'),
        },
        primary: {
          DEFAULT: themeColor('primary'),
          foreground: themeColor('primary-foreground'),
          muted: themeColor('primary-muted'),
          pressed: themeColor('primary-pressed'),
        },
        accent: {
          DEFAULT: themeColor('accent'),
          foreground: themeColor('accent-foreground'),
          muted: themeColor('accent-muted'),
        },
        success: {
          DEFAULT: themeColor('success'),
          muted: themeColor('success-muted'),
        },
        warning: {
          DEFAULT: themeColor('warning'),
          muted: themeColor('warning-muted'),
        },
        danger: {
          DEFAULT: themeColor('danger'),
          muted: themeColor('danger-muted'),
        },
        skeleton: themeColor('skeleton'),
      },
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([key, value]) => [key, `${value}px`]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(radius).map(([key, value]) => [key, `${value}px`]),
      ),
      fontFamily: {
        sans: [...fontFamily.sans],
        arabic: [...fontFamily.arabic],
        bengali: [...fontFamily.bengali],
      },
      fontSize: Object.fromEntries(
        Object.entries(fontSize).map(([key, [size, lineHeight]]) => [
          key,
          [`${size}px`, { lineHeight: `${lineHeight}px` }],
        ]),
      ),
    },
  },
  plugins: [],
};

export default config;
