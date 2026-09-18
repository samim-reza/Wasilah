/**
 * Feature flags, with compiled-in defaults and remote overrides.
 *
 * The defaults ship in the bundle, so the app behaves predictably offline and
 * on a first launch. A remote row can only flip a flag the app already knows
 * about — an unknown key is ignored, so a stale server row cannot introduce an
 * undefined flag.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  featureFlagDefaults,
  resolveFeatureFlags,
  type FeatureFlagName,
  type FeatureFlags,
} from '@/config/featureFlags';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

import { queryKeys } from './queryKeys';

async function fetchRemoteFlags(): Promise<Partial<Record<string, boolean>>> {
  const { data, error } = await supabase.from('feature_flags').select('key, enabled');

  if (error) {
    // Flags are an optimisation, not a requirement; fall back to the defaults.
    logger.debug('featureFlags.fetchFailed', { error });
    return {};
  }

  const overrides: Partial<Record<string, boolean>> = {};
  for (const row of data ?? []) overrides[row.key] = row.enabled;
  return overrides;
}

export function useFeatureFlags(): FeatureFlags {
  const query = useQuery({
    queryKey: queryKeys.platform.featureFlags(),
    queryFn: fetchRemoteFlags,
    staleTime: 15 * 60 * 1000,
    // Never blocks a screen: the compiled-in defaults render immediately.
    placeholderData: {},
  });

  return useMemo(() => resolveFeatureFlags(query.data), [query.data]);
}

/** Convenience for a single flag, which is what most callers want. */
export function useFeatureFlag(name: FeatureFlagName): boolean {
  return useFeatureFlags()[name] ?? featureFlagDefaults[name];
}
