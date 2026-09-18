/**
 * Root layout.
 *
 * Owns app startup: fonts, monitoring, notification handling and the splash
 * screen. The splash is held until the session, theme and fonts are all ready,
 * because the alternative is a visible flash of the signed-out home screen in
 * the wrong theme.
 */
import '../global.css';

import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { useNotificationRouting } from '@/features/notifications/hooks/useNotificationRouting';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { initializeMonitoring } from '@/lib/monitoring/sentry';
import { AppProviders } from '@/providers/AppProviders';
import { useAppFonts } from '@/theme/fonts';
import { getNavigationTheme } from '@/theme/navigationTheme';
import { useTheme } from '@/theme/useTheme';

// Keep the native splash up until the first screen is genuinely ready.
void SplashScreen.preventAutoHideAsync();

// Monitoring is initialised outside the component tree so that a crash during
// the very first render is still captured.
initializeMonitoring();

function RootNavigator() {
  const { scheme, isHydrated: themeReady } = useTheme();
  const { isReady: authReady } = useAuth();
  const { loaded: fontsLoaded } = useAppFonts();

  // Notification taps must be able to navigate, so routing is wired up inside
  // the navigator rather than at module scope.
  useNotificationRouting();

  // Flush anything the user did while offline as soon as connectivity returns.
  useOfflineSync();

  const isReady = themeReady && authReady && fontsLoaded;

  useEffect(() => {
    // Hiding is idempotent, and the splash must never outlive readiness even if
    // one of the dependencies resolves late.
    if (isReady) void SplashScreen.hideAsync();
  }, [isReady]);

  // Returning null keeps the native splash visible rather than flashing an
  // empty themed screen underneath it.
  if (!isReady) return null;

  return (
    <NavigationThemeProvider value={getNavigationTheme(scheme)}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="quran/[surahId]" />
        <Stack.Screen name="search" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="bookmarks" />
        <Stack.Screen name="notes" />
        <Stack.Screen name="reader-translations" />
        <Stack.Screen name="reader-reciters" />
        <Stack.Screen name="reader-tafsirs" />
        <Stack.Screen name="prayer-times" />
        <Stack.Screen name="about" />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
