/**
 * Reading preferences: font sizes, translations, reciter, script, typeface,
 * display mode.
 *
 * A PROVIDER, not a plain hook, and the reason is a bug that shipped: seven
 * screens called the hook and each held its own copy of the state, so a change
 * made in Settings did not reach the reader until the reader remounted. The
 * user had to leave the surah and come back to see their own setting. One
 * provider, one state, every consumer sees every change the instant it is
 * made.
 *
 * Stored on device first and synced to Supabase when signed in. Device-first
 * is the right default here: a font size the user just changed must apply
 * instantly and survive being offline, and it is not worth a network round
 * trip.
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

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { defaultRecitationId, defaultTranslationIds } from '@/config/quran';
import { defaultTranslationIdsFor } from '@/features/quran/utils/resolveTranslations';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { getLocale } from '@/lib/i18n';
import { logger } from '@/lib/monitoring/logger';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { supabase } from '@/lib/supabase/client';
import type { ReadingModeValue } from '@/lib/supabase/database.types';
import { arabicFontSizes, translationFontSizes } from '@/theme/tokens';
import { arabicFontKeys, type ArabicFontKey } from '@/theme/fonts';

import { arabicScripts, type ArabicScript } from '@/features/quran/types/quran.types';

export type { ArabicScript };
export { arabicScripts };

export interface ReaderPreferences {
  arabicFontSize: number;
  translationFontSize: number;
  /** Translation editions to display, in order. Empty means Arabic only. */
  translationIds: number[];
  tafsirId: number | null;
  recitationId: number;
  showTranslation: boolean;
  showWordByWord: boolean;
  mode: ReadingModeValue;
  playbackRate: number;
  keepScreenAwake: boolean;
  arabicScript: ArabicScript;
  arabicFont: ArabicFontKey;
  /**
   * True once the user has picked translations by hand.
   *
   * Until then the edition follows the interface language, so switching the
   * app to Bengali switches the translation with it. Local only: it records
   * how the value was arrived at, not what it is.
   */
  translationsPinned: boolean;
}

function buildDefaults(): ReaderPreferences {
  const locale = getLocale();

  return {
    arabicFontSize: arabicFontSizes[2] ?? 30,
    translationFontSize: translationFontSizes[1] ?? 16,
    translationIds: [locale === 'bn' ? defaultTranslationIds.bn : defaultTranslationIds.en],
    tafsirId: null,
    recitationId: defaultRecitationId,
    showTranslation: true,
    showWordByWord: false,
    mode: 'translation',
    playbackRate: 1,
    keepScreenAwake: true,
    arabicScript: 'uthmani',
    arabicFont: 'AmiriQuran',
    translationsPinned: false,
  };
}

function isArabicScript(value: unknown): value is ArabicScript {
  return typeof value === 'string' && (arabicScripts as readonly string[]).includes(value);
}

function isArabicFont(value: unknown): value is ArabicFontKey {
  return typeof value === 'string' && (arabicFontKeys as readonly string[]).includes(value);
}

export interface UseReaderPreferencesResult {
  preferences: ReaderPreferences;
  isLoading: boolean;
  update: (patch: Partial<ReaderPreferences>) => Promise<void>;
  /** Steps the Arabic size through the allowed scale. */
  stepArabicFontSize: (direction: 1 | -1) => Promise<void>;
  stepTranslationFontSize: (direction: 1 | -1) => Promise<void>;
}

function stepThroughScale(scale: readonly number[], current: number, direction: 1 | -1): number {
  const index = scale.indexOf(current);
  // An unknown value (e.g. restored from an older build) snaps to the middle
  // rather than jumping to an end of the scale.
  const base = index === -1 ? Math.floor(scale.length / 2) : index;
  const next = Math.min(scale.length - 1, Math.max(0, base + direction));
  return scale[next] ?? current;
}

function useReaderPreferencesState(): UseReaderPreferencesResult {
  const userId = useUserId();
  const { locale } = useTranslation();
  const [preferences, setPreferences] = useState<ReaderPreferences>(buildDefaults);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await keyValueStore.get<Partial<ReaderPreferences>>(
        storageKeys.readerPreferences,
      );
      if (!cancelled && stored) {
        setPreferences((current) => ({ ...current, ...stored }));
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Pull the server copy once signed in, so preferences follow the user to a
  // new device. Local values win until this resolves, avoiding a visible jump.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from('user_quran_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled || error || !data) return;

      setPreferences((current) => ({
        ...current,
        arabicFontSize: data.arabic_font_size,
        translationFontSize: data.translation_font_size,
        translationIds: data.translation_ids,
        tafsirId: data.tafsir_id,
        recitationId: data.recitation_id,
        showTranslation: data.show_translation,
        showWordByWord: data.show_word_by_word,
        mode: data.mode,
        playbackRate: Number(data.playback_rate),
        // Validated rather than trusted: a value written by a newer build with
        // a script this one does not know would otherwise select nothing.
        arabicScript: isArabicScript(data.arabic_script) ? data.arabic_script : current.arabicScript,
        arabicFont: isArabicFont(data.arabic_font) ? data.arabic_font : current.arabicFont,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const update = useCallback(
    async (patch: Partial<ReaderPreferences>) => {
      const next = { ...preferences, ...patch };
      setPreferences(next);
      await keyValueStore.set(storageKeys.readerPreferences, next);

      if (!userId) return;

      const { error } = await supabase.from('user_quran_preferences').upsert(
        {
          user_id: userId,
          arabic_font_size: next.arabicFontSize,
          translation_font_size: next.translationFontSize,
          translation_ids: next.translationIds,
          tafsir_id: next.tafsirId,
          recitation_id: next.recitationId,
          show_translation: next.showTranslation,
          show_word_by_word: next.showWordByWord,
          mode: next.mode,
          playback_rate: next.playbackRate,
          arabic_script: next.arabicScript,
          arabic_font: next.arabicFont,
        },
        { onConflict: 'user_id' },
      );

      // A failed sync is not worth interrupting reading for; the local value is
      // already applied and will sync on the next change.
      if (error) logger.debug('reader.preferenceSyncFailed', { error });
    },
    [preferences, userId],
  );

  const stepArabicFontSize = useCallback(
    (direction: 1 | -1) =>
      update({
        arabicFontSize: stepThroughScale(arabicFontSizes, preferences.arabicFontSize, direction),
      }),
    [preferences.arabicFontSize, update],
  );

  const stepTranslationFontSize = useCallback(
    (direction: 1 | -1) =>
      update({
        translationFontSize: stepThroughScale(
          translationFontSizes,
          preferences.translationFontSize,
          direction,
        ),
      }),
    [preferences.translationFontSize, update],
  );

  /**
   * Keeps the translation edition in step with the interface language.
   *
   * Derived rather than written back: the stored value stays exactly as the
   * user left it and the language only decides how it is read. Only while the
   * choice is unpinned — someone who deliberately picked an English edition
   * keeps it.
   */
  const effective = useMemo(() => {
    if (preferences.translationsPinned) return preferences;

    const expected = defaultTranslationIdsFor(locale);
    if (expected.length === 0) return preferences;

    const current = preferences.translationIds;
    const matches =
      current.length === expected.length && current.every((id, i) => id === expected[i]);

    return matches ? preferences : { ...preferences, translationIds: expected };
  }, [preferences, locale]);

  return useMemo(
    () => ({
      preferences: effective,
      isLoading,
      update,
      stepArabicFontSize,
      stepTranslationFontSize,
    }),
    [effective, isLoading, update, stepArabicFontSize, stepTranslationFontSize],
  );
}

const ReaderPreferencesContext = createContext<UseReaderPreferencesResult | null>(null);

export function ReaderPreferencesProvider({ children }: { children: ReactNode }) {
  const value = useReaderPreferencesState();
  return (
    <ReaderPreferencesContext.Provider value={value}>{children}</ReaderPreferencesContext.Provider>
  );
}

/**
 * Reads the shared preferences.
 *
 * Throws outside the provider rather than falling back to a private copy —
 * a silent fallback would reintroduce exactly the stale-settings bug this
 * provider exists to remove, and it would only ever show up as "my setting
 * did not apply".
 */
export function useReaderPreferences(): UseReaderPreferencesResult {
  const value = useContext(ReaderPreferencesContext);
  if (!value) throw new Error('useReaderPreferences must be used inside ReaderPreferencesProvider');
  return value;
}
