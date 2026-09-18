/**
 * Makes the active locale reactive.
 *
 * i18n-js is a module singleton, so changing the locale does not by itself
 * re-render anything. This provider holds the locale in state and passes it
 * through context, which is what actually triggers the re-render.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import {
  detectDeviceLocale,
  getLocale,
  setLocale as applyLocale,
  supportedLocales,
  t,
  type Locale,
  type TranslateOptions,
} from './index';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, options?: TranslateOptions) => string;
  isHydrated: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (supportedLocales as readonly string[]).includes(value);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const detected = detectDeviceLocale();
    applyLocale(detected);
    return detected;
  });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await keyValueStore.get<string>(storageKeys.locale);
      if (cancelled) return;

      if (isLocale(stored) && stored !== getLocale()) {
        applyLocale(stored);
        setLocaleState(stored);
      }
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    applyLocale(next);
    setLocaleState(next);
    void keyValueStore.set(storageKeys.locale, next);
  }, []);

  const value = useMemo<I18nContextValue>(
    // `t` is recreated whenever the locale changes so memoised consumers
    // correctly invalidate their cached strings.
    () => ({ locale, setLocale, t, isHydrated }),
    [locale, setLocale, isHydrated],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used inside <I18nProvider>');
  }
  return context;
}
