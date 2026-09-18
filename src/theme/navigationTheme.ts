/**
 * React Navigation theme derived from our tokens.
 *
 * The navigator renders its own container and header backgrounds outside the
 * NativeWind tree, so without this the gap behind a pushed screen flashes the
 * default white — very visible in dark mode.
 */
// Expo Router owns its navigation stack as of SDK 56 and re-exports the theme
// primitives itself; importing them from @react-navigation/native is a hard
// error at bundle time.
import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { getPalette } from './palette';
import type { ColorSchemeName } from './tokens';

export function getNavigationTheme(scheme: ColorSchemeName): Theme {
  const colors = getPalette(scheme);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
}
