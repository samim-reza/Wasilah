/**
 * Location handling for prayer times.
 *
 * Coordinates are rounded to one decimal place — roughly 11km — before being
 * stored or sent anywhere. That is more than accurate enough for prayer
 * calculation (the difference in Fajr across 11km is under a minute) and it
 * means the app never holds a figure precise enough to identify a home address.
 *
 * This rounding is not a nicety. A Quran app has no business knowing which
 * building someone prays in.
 */
import type { CoarseCoordinates } from '../types/prayer.types';

/** One decimal place ≈ 11km at the equator. */
const COARSE_PRECISION = 1;

export function toCoarse(latitude: number, longitude: number): CoarseCoordinates {
  const factor = 10 ** COARSE_PRECISION;

  return {
    latitude: Math.round(latitude * factor) / factor,
    longitude: Math.round(longitude * factor) / factor,
  };
}

export function isValidCoordinates(coordinates: CoarseCoordinates | null): boolean {
  if (!coordinates) return false;

  return (
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude) &&
    Math.abs(coordinates.latitude) <= 90 &&
    Math.abs(coordinates.longitude) <= 180
  );
}

/**
 * Whether stored coordinates are still close enough to use.
 *
 * A user who has travelled a long way needs recalculation; someone who walked
 * across town does not.
 */
export function needsRefresh(
  stored: CoarseCoordinates | null,
  current: CoarseCoordinates,
  thresholdDegrees = 0.5,
): boolean {
  if (!stored) return true;

  return (
    Math.abs(stored.latitude - current.latitude) > thresholdDegrees ||
    Math.abs(stored.longitude - current.longitude) > thresholdDegrees
  );
}
