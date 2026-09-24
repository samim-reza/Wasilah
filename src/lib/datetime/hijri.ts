/**
 * The Hijri (Islamic) calendar, tabular.
 *
 * The calendar the app can compute is the arithmetic one: twelve months of
 * alternating 30 and 29 days with eleven leap years per thirty. Real months
 * begin with an actual sighting of the crescent and can differ from this by a
 * day either way, and different countries differ from each other. So what
 * this gives is "Ramadan is about now", "tonight is one of the odd nights",
 * "a new month has just begun" — enough to offer the right words at roughly
 * the right time, never a claim about the exact date. Copy that uses it
 * should say "around" rather than "today is the 27th".
 *
 * The conversion is the standard Kuwaiti algorithm on the Julian day number.
 */
import { DateTime } from 'luxon';

export interface HijriDate {
  year: number;
  /** 1 = Muharram … 9 = Ramadan … 12 = Dhul-Hijjah. */
  month: number;
  day: number;
}

export const RAMADAN = 9;

/** Julian day number of a Gregorian calendar date, at noon. */
function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** The Hijri date of a Gregorian calendar date. */
export function hijriFromGregorian(year: number, month: number, day: number): HijriDate {
  const jd = julianDayNumber(year, month, day);

  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hijriMonth = Math.floor((24 * l) / 709);
  const hijriDay = l - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  return { year: hijriYear, month: hijriMonth, day: hijriDay };
}

/** The Hijri date of the civil day an instant falls in, in a timezone. */
export function hijriDateAt(instant: Date, timezone: string): HijriDate {
  const local = DateTime.fromJSDate(instant, { zone: timezone });
  return hijriFromGregorian(local.year, local.month, local.day);
}

/**
 * The Hijri date the NIGHT belongs to.
 *
 * An Islamic day begins at sunset, so the night of the 27th of Ramadan is the
 * evening after the 26th's daylight. Before sunset this is the same as the
 * civil date; after it, the next one. Callers pass whether the sun has set
 * (from the prayer times when known, else a clock guess) so the rule lives in
 * one place.
 */
export function hijriNightAt(instant: Date, timezone: string, afterSunset: boolean): HijriDate {
  if (!afterSunset) return hijriDateAt(instant, timezone);
  const next = DateTime.fromJSDate(instant, { zone: timezone }).plus({ days: 1 });
  return hijriFromGregorian(next.year, next.month, next.day);
}

/** The odd nights of the last ten of Ramadan, on which Laylat al-Qadr is sought. */
export const QADR_NIGHTS: readonly number[] = [21, 23, 25, 27, 29];

export function isQadrNight(night: HijriDate): boolean {
  return night.month === RAMADAN && QADR_NIGHTS.includes(night.day);
}

export const hijriMonthNames: readonly string[] = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhul-Qa'dah",
  'Dhul-Hijjah',
];
