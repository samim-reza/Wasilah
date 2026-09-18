/**
 * Feature flags.
 *
 * Defaults ship in the bundle; remote overrides are fetched from the
 * `feature_flags` table and merged in by `useFeatureFlags`. Keeping the defaults
 * local means the app behaves predictably offline and on first launch.
 */
export const featureFlagDefaults = {
  /** Contextual reminders driven by local weather. */
  weather_notifications: false,
  /** Reminders anchored to calculated prayer times. */
  prayer_notifications: true,
  /** "Ask about this ayah" — intentionally off until sourcing is in place. */
  ai_assistant: false,
  /** Full-page Mushaf rendering; requires licensed page imagery or fonts. */
  mushaf_mode: false,
  /** Word-by-word translation/transliteration in the reader. */
  word_by_word: true,
  /** Tafsir tab on the ayah detail sheet. */
  tafsir: true,
  /** Server-driven adaptive reminder timing. */
  smart_reminders: true,
  /** Shareable ayah image cards. */
  share_cards: true,
} as const;

export type FeatureFlagName = keyof typeof featureFlagDefaults;
export type FeatureFlags = Record<FeatureFlagName, boolean>;

export const featureFlagNames = Object.keys(featureFlagDefaults) as FeatureFlagName[];

/**
 * Merges remote overrides over the compiled-in defaults, ignoring any unknown
 * keys so a stale server row cannot introduce undefined flags.
 */
export function resolveFeatureFlags(
  overrides: Partial<Record<string, boolean>> | null | undefined,
): FeatureFlags {
  const resolved = { ...featureFlagDefaults } as FeatureFlags;
  if (!overrides) return resolved;

  for (const name of featureFlagNames) {
    const value = overrides[name];
    if (typeof value === 'boolean') resolved[name] = value;
  }
  return resolved;
}
