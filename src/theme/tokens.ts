/**
 * Design tokens — the single source of truth for Wasilah's visual language.
 *
 * This module is consumed by three very different environments, which is why it
 * is plain data with no imports:
 *   1. `tailwind.config.ts`  — to generate utility classes at bundle time.
 *   2. `scripts/generate-theme-css.ts` — to emit the CSS custom properties in
 *      `global.css` that let a single class (e.g. `bg-surface`) resolve
 *      correctly in both light and dark mode.
 *   3. Runtime TypeScript — for the handful of places that cannot use classes
 *      (native status bar, React Navigation theme, SVG fills, share cards).
 *
 * Never hardcode a colour, radius or spacing value outside this file.
 */

/** Colours that do not change between light and dark mode. */
export const staticColors = {
  /** Pure black/white kept out of the semantic scale so they are never used by accident. */
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

/**
 * Semantic colour roles. Every role must exist in both schemes so that
 * `generate-theme-css` can emit a complete variable set for each.
 *
 * Palette intent: a calm, paper-like reading surface with a deep emerald
 * primary and a warm gold reserved almost exclusively for streak/achievement
 * moments, so the celebratory colour stays meaningful.
 */
export const colorSchemes = {
  light: {
    /** App background behind all content. */
    background: '#FBFAF8',
    /** Cards, sheets, headers. */
    surface: '#FFFFFF',
    /** Subtly recessed surface: input fields, inactive segments. */
    surfaceMuted: '#F2F0EA',
    /** Pressed/hover state for surfaces. */
    surfacePressed: '#E9E6DE',
    /** Hairlines and dividers. */
    border: '#E4E0D6',
    /** Strong border for focused inputs. */
    borderStrong: '#CFC9BB',

    /** Primary body text. */
    text: '#1A1A17',
    /** Secondary text: translations, metadata. */
    textMuted: '#67665F',
    /** Tertiary text: timestamps, captions, disabled. */
    textSubtle: '#94928A',

    /** Brand primary — buttons, active tabs, progress. */
    primary: '#0F7A63',
    /** Text/icons placed on top of `primary`. */
    primaryForeground: '#FFFFFF',
    /** Tinted primary background for badges and soft buttons. */
    primaryMuted: '#E2F1ED',
    /** Darker primary for pressed states. */
    primaryPressed: '#0B5F4D',

    /** Streaks, achievements, "today" markers. Used sparingly. */
    accent: '#C0872F',
    accentForeground: '#FFFFFF',
    accentMuted: '#FAF0DE',

    success: '#2E7D53',
    successMuted: '#E4F2EA',
    warning: '#B0741B',
    warningMuted: '#FBF0DC',
    danger: '#B4392F',
    dangerMuted: '#FAE7E4',

    /** Scrim behind modals and bottom sheets. */
    overlay: 'rgba(20, 20, 18, 0.45)',
    /** Skeleton placeholder base. */
    skeleton: '#ECE9E2',
  },

  dark: {
    background: '#0E1311',
    surface: '#161C19',
    surfaceMuted: '#1D2521',
    surfacePressed: '#26302B',
    border: '#2A332E',
    borderStrong: '#3C4741',

    text: '#ECEAE4',
    textMuted: '#9DA49E',
    textSubtle: '#6F7874',

    primary: '#35B394',
    primaryForeground: '#06211B',
    primaryMuted: '#123329',
    primaryPressed: '#2A9179',

    accent: '#DFAC5C',
    accentForeground: '#241804',
    accentMuted: '#2E2413',

    success: '#4FBE83',
    successMuted: '#12301F',
    warning: '#DFAC5C',
    warningMuted: '#2E2413',
    danger: '#E0685C',
    dangerMuted: '#3A1B17',

    overlay: 'rgba(0, 0, 0, 0.6)',
    skeleton: '#212A25',
  },
} as const;

export type ColorSchemeName = keyof typeof colorSchemes;
export type ColorRole = keyof (typeof colorSchemes)['light'];
export type ColorPalette = Record<ColorRole, string>;

/**
 * Spacing scale in points. Deliberately small — a constrained scale is what
 * keeps unrelated screens feeling like one app.
 */
export const spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

/**
 * Font families. Arabic uses a dedicated Mushaf-style face loaded at runtime;
 * see `src/theme/fonts.ts` for the loader and licensing notes.
 */
export const fontFamily = {
  sans: ['System', 'sans-serif'],
  /** Uthmanic Hafs script for Quran text. */
  arabic: ['AmiriQuran', 'serif'],
  /** Bengali translations need a face with proper conjunct rendering. */
  bengali: ['NotoSansBengali', 'System', 'sans-serif'],
} as const;

/** Type ramp in points, paired with line heights tuned for long-form reading. */
export const fontSize = {
  xs: [12, 16],
  sm: [14, 20],
  base: [16, 24],
  lg: [18, 28],
  xl: [20, 30],
  '2xl': [24, 34],
  '3xl': [30, 40],
  '4xl': [36, 46],
} as const;

/**
 * Arabic needs far more leading than Latin text: diacritics sit above and below
 * the baseline and collide at normal line heights. These are multipliers applied
 * to the user's chosen Arabic font size.
 */
export const arabicLineHeightRatio = 2.0;

/** User-selectable Quran text sizes, in points. */
export const arabicFontSizes = [22, 26, 30, 34, 40, 46] as const;
export const translationFontSizes = [14, 16, 18, 20, 23, 26] as const;

/** Elevation presets. Kept flat and soft — heavy shadows fight the calm tone. */
export const shadows = {
  none: { shadowOpacity: 0, elevation: 0 },
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

/** Animation durations in ms. Respect `prefers-reduced-motion` before using. */
export const duration = {
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 320,
  /** Streak/achievement celebrations may run longer. */
  celebration: 900,
} as const;

/** Minimum tap target per platform accessibility guidance. */
export const minTapTarget = 44;
