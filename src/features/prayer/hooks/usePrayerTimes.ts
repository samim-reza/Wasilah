/**
 * Prayer times for today.
 *
 * Location is requested lazily, only when the user enables a feature that needs
 * it, and only at the coarsest accuracy the OS will give. The app is fully
 * usable without ever granting it.
 */
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';

import { calculatePrayerTimes, nextPrayer } from '../services/prayerTimeService';
import { isValidCoordinates, toCoarse } from '../utils/coordinates';
import type {
  CoarseCoordinates,
  DailyPrayerTimes,
  PrayerName,
  PrayerSettings,
} from '../types/prayer.types';

const defaultSettings: PrayerSettings = {
  calculationMethod: 'MuslimWorldLeague',
  madhab: 'shafi',
  coordinates: null,
  cityLabel: null,
};

/**
 * Why enabling location did not work.
 *
 * The two cases need different words: a denied permission is the user's own
 * choice and is fixed in app settings, whereas an unavailable position usually
 * means location services are switched off system-wide or the device has no fix
 * yet. Collapsing them into "failed" leaves the user with no idea what to do.
 */
export type LocationFailure = 'permission_denied' | 'position_unavailable';

export type EnableLocationResult = { ok: true } | { ok: false; reason: LocationFailure };

export interface UsePrayerTimesResult {
  times: DailyPrayerTimes | null;
  next: { name: PrayerName; time: Date } | null;
  settings: PrayerSettings;
  hasLocation: boolean;
  isRequestingLocation: boolean;
  /** Prompts for location and stores the coarse result. */
  enableLocation: () => Promise<EnableLocationResult>;
  updateSettings: (patch: Partial<PrayerSettings>) => Promise<void>;
}

export function usePrayerTimes(): UsePrayerTimesResult {
  const userId = useUserId();
  const [settings, setSettings] = useState<PrayerSettings>(defaultSettings);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from('prayer_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled || error || !data) return;

      setSettings({
        calculationMethod: data.calculation_method,
        madhab: data.madhab,
        coordinates:
          data.latitude !== null && data.longitude !== null
            ? { latitude: Number(data.latitude), longitude: Number(data.longitude) }
            : null,
        cityLabel: data.city_label,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    async (next: PrayerSettings) => {
      if (!userId) return;

      const { error } = await supabase.from('prayer_settings').upsert(
        {
          user_id: userId,
          calculation_method: next.calculationMethod,
          madhab: next.madhab,
          latitude: next.coordinates?.latitude ?? null,
          longitude: next.coordinates?.longitude ?? null,
          city_label: next.cityLabel,
        },
        { onConflict: 'user_id' },
      );

      if (error) logger.warn('prayer.settingsPersistFailed', { error });
    },
    [userId],
  );

  const enableLocation = useCallback(async (): Promise<EnableLocationResult> => {
    setIsRequestingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { ok: false, reason: 'permission_denied' };

      // `Low` accuracy is deliberate: it is enough for prayer times, it is
      // faster, and it uses far less battery than a GPS fix.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      const coordinates = toCoarse(position.coords.latitude, position.coords.longitude);
      const next = { ...settings, coordinates };

      setSettings(next);
      await persist(next);
      return { ok: true };
    } catch (error) {
      // Permission was granted but no position came back — location services
      // are off system-wide, or the device has no fix yet.
      logger.warn('prayer.locationFailed', { error });
      return { ok: false, reason: 'position_unavailable' };
    } finally {
      setIsRequestingLocation(false);
    }
  }, [settings, persist]);

  const updateSettings = useCallback(
    async (patch: Partial<PrayerSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await persist(next);
    },
    [settings, persist],
  );

  const coordinates: CoarseCoordinates | null = isValidCoordinates(settings.coordinates)
    ? settings.coordinates
    : null;

  const times = coordinates ? calculatePrayerTimes(coordinates, new Date(), settings) : null;

  return {
    times,
    next: times ? nextPrayer(times) : null,
    settings,
    hasLocation: coordinates !== null,
    isRequestingLocation,
    enableLocation,
    updateSettings,
  };
}
