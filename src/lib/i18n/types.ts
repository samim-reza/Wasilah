import type { en } from './translations/en';

/**
 * Recursively widens the literal types of the English reference translation to
 * plain strings. Every other locale is typed against this, so a missing key or
 * a typo becomes a compile error rather than a `[missing translation]` label in
 * production.
 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Translation = Widen<typeof en>;

export const supportedLocales = ['en', 'bn'] as const;
export type Locale = (typeof supportedLocales)[number];

/** Locales whose script runs right-to-left. Used to drive layout direction. */
export const rtlLocales: readonly Locale[] = [];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা',
};
