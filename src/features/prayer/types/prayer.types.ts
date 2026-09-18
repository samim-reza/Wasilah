import type { PrayerName } from '@/lib/supabase/database.types';

export type { PrayerName };

export interface PrayerTime {
  name: PrayerName | 'sunrise';
  time: Date;
}

export interface DailyPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

/** Coarse coordinates. Precise location is never stored or transmitted. */
export interface CoarseCoordinates {
  latitude: number;
  longitude: number;
}

export interface PrayerSettings {
  /** Key into `adhan`'s CalculationMethod, e.g. 'MuslimWorldLeague'. */
  calculationMethod: string;
  madhab: 'shafi' | 'hanafi';
  coordinates: CoarseCoordinates | null;
  cityLabel: string | null;
}

export const prayerOrder: readonly (PrayerName | 'sunrise')[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];
