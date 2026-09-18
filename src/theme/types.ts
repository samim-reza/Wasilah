import type { ColorPalette, ColorSchemeName } from './tokens';

/** What the user chose, which is not the same as what is currently rendered. */
export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  /** The user's stored preference. */
  preference: ThemePreference;
  /** The scheme actually in effect after resolving `system`. */
  scheme: ColorSchemeName;
  /** Resolved colours for the active scheme. */
  colors: ColorPalette;
  /** True once the persisted preference has loaded, to avoid a theme flash. */
  isHydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
}
