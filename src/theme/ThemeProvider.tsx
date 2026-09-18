/**
 * Theme provider.
 *
 * Owns three things that are easy to get subtly wrong if they live apart:
 *   1. persisting the user's light/dark/system preference,
 *   2. telling NativeWind which scheme to render, and
 *   3. keeping the native system UI (status bar, Android navigation bar) in sync
 *      so the app never shows a light chrome over a dark screen.
 */
import { colorScheme as nativewindColorScheme, useColorScheme } from 'nativewind';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SystemUI from 'expo-system-ui';

import { storageKeys } from '@/lib/storage/storageKeys';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { logger } from '@/lib/monitoring/logger';

import { getPalette } from './palette';
import type { ThemeContextValue, ThemePreference } from './types';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load the stored preference once. Until this resolves the app renders with
  // the system scheme, which is the least jarring default.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await keyValueStore.get<string>(storageKeys.themePreference);
      if (cancelled) return;

      if (isThemePreference(stored)) {
        setPreferenceState(stored);
        nativewindColorScheme.set(stored);
      }
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = useMemo(() => getPalette(scheme), [scheme]);

  // The root background must be set natively as well as in CSS, otherwise
  // overscroll and the gap behind a dismissing modal flash the wrong colour.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch((error: unknown) => {
      logger.warn('theme.systemBackgroundFailed', { error });
    });
  }, [colors.background]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    nativewindColorScheme.set(next);
    void keyValueStore.set(storageKeys.themePreference, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, scheme, colors, isHydrated, setPreference }),
    [preference, scheme, colors, isHydrated, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
