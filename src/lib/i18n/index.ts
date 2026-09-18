/**
 * Localisation.
 *
 * `t()` is exported as a bare function (not only a hook) because notification
 * templates, background tasks and services need translated strings outside of
 * React. `I18nProvider` re-renders the tree when the locale changes.
 */
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import { logger } from '@/lib/monitoring/logger';

import { bn } from './translations/bn';
import { en } from './translations/en';
import { supportedLocales, type Locale } from './types';

export const i18n = new I18n({ en, bn });

// Fall back to English for any key a locale has not translated yet, and be loud
// about it in development so gaps get fixed rather than shipped.
i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.missingBehavior = 'guess';

function isSupportedLocale(value: string): value is Locale {
  return (supportedLocales as readonly string[]).includes(value);
}

/**
 * Picks the best locale for the device: the first preferred language whose
 * base code we support, otherwise English. Region subtags are ignored because
 * we ship language-level translations only.
 */
export function detectDeviceLocale(): Locale {
  const preferred = Localization.getLocales();

  for (const entry of preferred) {
    const base = entry.languageCode?.toLowerCase();
    if (base && isSupportedLocale(base)) return base;
  }
  return 'en';
}

export function setLocale(locale: Locale): void {
  i18n.locale = locale;
  logger.debug('i18n.localeChanged', { locale });
}

export function getLocale(): Locale {
  return isSupportedLocale(i18n.locale) ? i18n.locale : 'en';
}

export type TranslateOptions = Record<string, string | number> & {
  /** Selects the `one`/`other` form for pluralised keys. */
  count?: number;
  /** Shown instead of the key when a translation is genuinely missing. */
  defaultValue?: string;
};

export function t(key: string, options?: TranslateOptions): string {
  return i18n.t(key, options);
}

export { supportedLocales, localeNames } from './types';
export type { Locale, Translation } from './types';
