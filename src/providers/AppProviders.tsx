/**
 * Composes every app-wide provider in one place.
 *
 * Order is load-bearing:
 *   GestureHandlerRootView  must be the outermost native view for gestures.
 *   SafeAreaProvider        insets are read by nearly everything below.
 *   PersistQueryClient      restores the disk cache before the first render, so
 *                           a cold launch can paint real content.
 *   I18nProvider            `t()` is used by providers below it.
 *   ThemeProvider           colours are needed by Toast and error surfaces.
 *   AuthProvider            depends on i18n for the profile locale sync.
 *   AudioPlayerProvider     one player for the whole app, so two recitations
 *                           can never overlap.
 *   ToastProvider           innermost, so it renders above all screens.
 */
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { AudioPlayerProvider } from '@/features/audio/hooks/AudioPlayerProvider';
import { AuthProvider } from '@/features/auth/hooks/AuthProvider';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { ToastProvider } from '@/components/feedback/Toast';
import { persistOptions, queryClient } from '@/lib/api/queryClient';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { ThemeProvider } from '@/theme/ThemeProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <I18nProvider>
            <ThemeProvider>
              <AuthProvider>
                <AudioPlayerProvider>
                  <ToastProvider>
                    {/* Catches anything a screen throws during render. */}
                    <ErrorBoundary scope="root">{children}</ErrorBoundary>
                  </ToastProvider>
                </AudioPlayerProvider>
              </AuthProvider>
            </ThemeProvider>
          </I18nProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
