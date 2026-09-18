/**
 * The translation IDs the reader should actually request.
 *
 * Sits between reader preferences and the verse query so that a preference
 * pointing at an edition this environment does not carry degrades to a working
 * one instead of silently producing Arabic-only output.
 */
import { useMemo } from 'react';

import { useTranslation } from '@/lib/i18n/I18nProvider';

import { useTranslationResources } from './useQuranResources';
import { resolveTranslationIds } from '../utils/resolveTranslations';

export function useResolvedTranslationIds(requested: readonly number[]): number[] {
  const { locale } = useTranslation();
  const resources = useTranslationResources();

  return useMemo(
    () =>
      resolveTranslationIds({
        requested,
        available: resources.data ?? [],
        locale,
      }),
    [requested, resources.data, locale],
  );
}
