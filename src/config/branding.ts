/**
 * Brand identity kept in one place so the product name can change without a
 * find-and-replace across the codebase. Nothing outside this module should
 * hardcode the app name.
 */
export const branding = {
  /** Display name. Arabic: وسيلة — "a means of drawing near". */
  appName: 'Wasilah',
  appNameArabic: 'وسيلة',
  tagline: 'One ayah. Every day.',
  /** Shown on share cards and the about screen. */
  shareFooter: 'Wasilah — One ayah. Every day.',
  /** URL scheme registered in app.config.ts; used to build deep links. */
  scheme: 'wasilah',
  /**
   * Published on the Play Store listing as well as the About screen, so it has
   * to be an address that is actually monitored.
   */
  supportEmail: 'support@mywasilah.com',
  /**
   * Served from `site/` by the Pages workflow in `.github/workflows/pages.yml`,
   * now on the project's own domain via `site/CNAME`.
   *
   * Still GitHub Pages underneath rather than separate hosting: Google Play
   * refuses a listing whose privacy policy URL does not load, and a page
   * deployed from the same repository as the app cannot silently drift out of
   * existence. The domain is the only new dependency, and it is one the
   * project controls.
   */
  websiteUrl: 'https://mywasilah.com/',
  privacyPolicyUrl: 'https://mywasilah.com/privacy',
  termsUrl: 'https://mywasilah.com/terms',
} as const;

/**
 * Attribution required by the Quran Foundation developer terms. Rendered on the
 * About screen and must not be removed or obscured.
 */
export const attribution = {
  quranDataProvider: 'Quran Foundation',
  quranDataProviderUrl: 'https://quran.foundation',
  /** Wasilah is an independent app, not an official Quran.com product. */
  independenceNotice:
    'Wasilah is an independent application. It is not affiliated with, endorsed by, or an official product of Quran.com or the Quran Foundation.',
} as const;
