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

  // A NEW function per locale, not the module-level `t` passed through.
  //
  // The React Compiler memoises every `t('key')` call in a component by the
  // identity of `t` (and the key). The module-level `t` never changes, so its
  // results were cached for the life of the screen: switching language moved
  // the checkmark (which reads `locale`) but left every string in the old
  // language until the screen was remounted. Binding the locale into the
  // function gives the compiler a dependency that actually changes, and pins
  // the string to the locale this render is for rather than to whatever the
  // i18n singleton happens to hold at the moment of the call.
  const translate = useCallback<I18nContextValue['t']>(
    (key, options) => t(key, { ...options, locale }),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: translate, isHydrated }),
    [locale, setLocale, translate, isHydrated],
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
