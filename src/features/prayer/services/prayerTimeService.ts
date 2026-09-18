/**
 * Prayer time calculation.
 *
 * Calculated ON DEVICE with the `adhan` library. Nothing is sent to a server:
 * prayer times are a pure function of date, coordinates and method, so involving
 * a network would add latency, a failure mode, and a record of where the user is
 * — for no benefit.
 *
 * Strictly separate from weather (`features/weather`) and from notification
 * delivery. This module answers only "when are the prayers today".
 */
import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  type CalculationParameters,
} from 'adhan';

import { logger } from '@/lib/monitoring/logger';

import type {
  CoarseCoordinates,
  DailyPrayerTimes,
  PrayerName,
  PrayerSettings,
} from '../types/prayer.types';

/**
 * Calculation methods offered to the user.
 *
 * Which method is appropriate is a matter of local scholarly convention, so the
 * app offers the standard set and never silently picks one as "correct".
 */
export const calculationMethods = [
  'MuslimWorldLeague',
  'Egyptian',
  'Karachi',
  'UmmAlQura',
  'Dubai',
  'Qatar',
  'Kuwait',
  'MoonsightingCommittee',
  'Singapore',
  'Turkey',
  'Tehran',
  'NorthAmerica',
] as const;

export type CalculationMethodKey = (typeof calculationMethods)[number];

function resolveParameters(settings: PrayerSettings): CalculationParameters {
  const factory = CalculationMethod[settings.calculationMethod as CalculationMethodKey];

  const parameters =
    typeof factory === 'function' ? factory() : CalculationMethod.MuslimWorldLeague();

  parameters.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return parameters;
}

export function calculatePrayerTimes(
  coordinates: CoarseCoordinates,
  date: Date,
  settings: PrayerSettings,
): DailyPrayerTimes | null {
  try {
    const times = new PrayerTimes(
      new Coordinates(coordinates.latitude, coordinates.longitude),
      date,
      resolveParameters(settings),
    );

    return {
      fajr: times.fajr,
      sunrise: times.sunrise,
      dhuhr: times.dhuhr,
      asr: times.asr,
      maghrib: times.maghrib,
      isha: times.isha,
    };
  } catch (error) {
    // At extreme latitudes some methods produce no valid time for a prayer.
    // Returning null lets the UI say so rather than showing a wrong time.
    logger.warn('prayer.calculationFailed', { error });
    return null;
  }
}

/** The next prayer after `now`, or null once Isha has passed. */
export function nextPrayer(
  times: DailyPrayerTimes,
  now: Date = new Date(),
): { name: PrayerName; time: Date } | null {
  const ordered: { name: PrayerName; time: Date }[] = [
    { name: 'fajr', time: times.fajr },
    { name: 'dhuhr', time: times.dhuhr },
    { name: 'asr', time: times.asr },
    { name: 'maghrib', time: times.maghrib },
    { name: 'isha', time: times.isha },
  ];

  return ordered.find((prayer) => prayer.time.getTime() > now.getTime()) ?? null;
}

/**
 * When a prayer-anchored reminder should fire.
 *
 * Kept here rather than in the reminder engine so that prayer arithmetic stays
 * in the prayer module; the reminder engine only decides whether to use it.
 */
export function reminderTimeForPrayer(
  times: DailyPrayerTimes,
  prayer: PrayerName,
  direction: 'before' | 'after',
  offsetMinutes: number,
): Date {
  const base = times[prayer];
  const offsetMs = offsetMinutes * 60 * 1000;

  return new Date(base.getTime() + (direction === 'after' ? offsetMs : -offsetMs));
}
