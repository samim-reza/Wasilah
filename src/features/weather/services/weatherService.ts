/**
 * Weather lookup.
 *
 * Open-Meteo is used because it needs no API key and no account, which means no
 * credential in the bundle and no third party building a profile from our
 * users' locations. Only the coarse coordinates already stored for prayer times
 * are sent.
 *
 * Deliberately isolated from `features/prayer`: the two share a location input
 * and nothing else, and mixing them would make it impossible to enable one
 * without the other.
 */
import { httpRequest } from '@/lib/api/httpClient';
import { refreshWidget } from '@/features/widget/services/updateWidget';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import type { CoarseCoordinates } from '@/features/prayer/types/prayer.types';

import type { WeatherCondition, WeatherSnapshot } from '../types/weather.types';

const API_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * WMO weather codes → our small condition set.
 *
 * The full WMO table has ~30 codes; the reminder copy only distinguishes a
 * handful of moods, so anything finer would be detail we never use.
 */
function toCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'clouds';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 95) return 'storm';
  return 'clouds';
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
}

export async function fetchWeather(
  coordinates: CoarseCoordinates,
): Promise<WeatherSnapshot | null> {
  const url =
    `${API_URL}?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}` +
    '&current=temperature_2m,weather_code,is_day';

  // A weather failure must never surface to the user: the reminder simply uses
  // its neutral wording instead.
  const response = await httpRequest<OpenMeteoResponse>(url, {
    timeoutMs: 6_000,
    retries: 1,
  }).catch(() => null);

  if (!response?.current || response.current.weather_code === undefined) return null;

  const snapshot: WeatherSnapshot = {
    condition: toCondition(response.current.weather_code),
    temperatureCelsius: response.current.temperature_2m ?? 0,
    isDaytime: response.current.is_day === 1,
    fetchedAt: new Date().toISOString(),
  };

  // The home-screen widget draws in a headless context with no network, so
  // the last reading is written down for it. Fire-and-forget: the caller
  // wants the weather, not a storage round trip.
  void keyValueStore.set(storageKeys.lastWeather, snapshot).then(() => refreshWidget());

  return snapshot;
}

/**
 * Conditions worth changing the reminder's wording for.
 *
 * Only rain and snow read as genuinely different moods; adjusting the copy for
 * "partly cloudy" would be noise dressed up as personalisation.
 */
export function isNotableCondition(condition: WeatherCondition): boolean {
  return condition === 'rain' || condition === 'snow' || condition === 'storm';
}
