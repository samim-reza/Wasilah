/**
 * Reading preferences: font sizes, translations, reciter, display mode.
 *
 * Stored on device first and synced to Supabase when signed in. Device-first is
 * the right default here: a font size the user just changed must apply
 * instantly and survive being offline, and it is not worth a network round trip.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { defaultRecitationId, defaultTranslationIds } from '@/config/quran';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { getLocale } from '@/lib/i18n';
import { logger } from '@/lib/monitoring/logger';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { supabase } from '@/lib/supabase/client';
import type { ReadingModeValue } from '@/lib/supabase/database.types';
import { defaultTranslationIdsFor } from '@/features/quran/utils/resolveTranslations';
import { arabicFontSizes, translationFontSizes } from '@/theme/tokens';

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
  /**
   * True once the user has picked translations by hand.
   *
   * Until then the edition follows the interface language, so switching the
   * app to Bengali switches the translation with it. `buildDefaults` only runs
   * on a fresh install, so without this a user who installs in English and
   * later switches language keeps reading an English translation under
   * Bengali word-by-word glosses — which is exactly what happened.
   *
   * Local only: it records how the current value was arrived at, not what it
   * is, so it does not belong in the synced preference row.
   */
  translationsPinned: boolean;
}

function buildDefaults(): ReaderPreferences {
  const locale = getLocale();

  return {
    arabicFontSize: arabicFontSizes[2] ?? 30,
    translationFontSize: translationFontSizes[1] ?? 16,
    // Default to the translation matching the interface language, so a Bengali
    // speaker does not have to find the setting before they can read.
    translationIds: [locale === 'bn' ? defaultTranslationIds.bn : defaultTranslationIds.en],
    tafsirId: null,
    recitationId: defaultRecitationId,
    showTranslation: true,
    showWordByWord: false,
    mode: 'translation',
    playbackRate: 1,
    keepScreenAwake: true,
    translationsPinned: false,
  };
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

export function useReaderPreferences(): UseReaderPreferencesResult {
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
   * Derived rather than written back, which matters: the stored value is left
   * exactly as the user last left it, and the language merely decides how it
   * is read. Writing it would mean a language switch silently rewrote a
   * preference the user never touched.
   *
   * Only applies while the choice is unpinned. Someone who deliberately picked
   * an English edition keeps it; someone who simply switched the app to
   * Bengali stops getting English prose under Bengali word-by-word glosses.
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
