/**
 * Local-date arithmetic.
 *
 * Everything habit-related in Wasilah is measured in the user's local calendar
 * day, not in UTC. `new Date().toISOString().slice(0, 10)` is the classic way
 * to get this wrong: at 00:30 in Dhaka that returns YESTERDAY, silently
 * attributing a reading session to the wrong day and breaking the streak for
 * every user east of Greenwich.
 *
 * Every function here takes an explicit IANA timezone. None of them read the
 * device timezone implicitly, so behaviour is reproducible in tests.
 *
 * A `LocalDate` is the string 'YYYY-MM-DD'. It is deliberately a plain string:
 * it is what Postgres `date` columns store, what query keys use, and what
 * serialises into the offline queue without a timezone travelling along.
 */
import { DateTime } from 'luxon';

export type LocalDate = string;

const LOCAL_DATE_FORMAT = 'yyyy-LL-dd';

/** Falls back to UTC when the platform reports no zone, which some emulators do. */
export function getDeviceTimezone(): string {
  const zone = DateTime.local().zoneName;
  return zone ?? 'UTC';
}

/** True for a well-formed IANA identifier the runtime actually knows. */
export function isValidTimezone(timezone: string): boolean {
  return DateTime.local().setZone(timezone).isValid;
}

/** Normalises an untrusted timezone (e.g. one restored from storage) to a usable one. */
export function safeTimezone(timezone: string | null | undefined): string {
  if (timezone && isValidTimezone(timezone)) return timezone;
  return getDeviceTimezone();
}

/** The calendar date an instant falls on, in the given timezone. */
export function toLocalDate(instant: Date | string, timezone: string): LocalDate {
  const dateTime =
    typeof instant === 'string'
      ? DateTime.fromISO(instant, { zone: timezone })
      : DateTime.fromJSDate(instant, { zone: timezone });

  return dateTime.toFormat(LOCAL_DATE_FORMAT);
}

export function todayLocalDate(timezone: string, now: Date = new Date()): LocalDate {
  return toLocalDate(now, timezone);
}

/** Midnight at the start of a local date, as an absolute instant. */
export function startOfLocalDay(date: LocalDate, timezone: string): Date {
  return DateTime.fromFormat(date, LOCAL_DATE_FORMAT, { zone: timezone }).startOf('day').toJSDate();
}

/**
 * The instant a local day ends.
 *
 * Computed as the start of the NEXT day rather than 23:59:59, because on a DST
 * transition a day can be 23 or 25 hours long and a fixed offset would land in
 * the wrong day.
 */
export function endOfLocalDay(date: LocalDate, timezone: string): Date {
  return DateTime.fromFormat(date, LOCAL_DATE_FORMAT, { zone: timezone })
    .plus({ days: 1 })
    .startOf('day')
    .toJSDate();
}

/**
 * Adds calendar days.
 *
 * Uses Luxon's calendar arithmetic, not millisecond addition, so a spring-
 * forward day still advances by exactly one date.
 */
export function addLocalDays(date: LocalDate, days: number): LocalDate {
  return DateTime.fromFormat(date, LOCAL_DATE_FORMAT, { zone: 'utc' })
    .plus({ days })
    .toFormat(LOCAL_DATE_FORMAT);
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetweenLocalDates(from: LocalDate, to: LocalDate): number {
  // Both are parsed in UTC: a LocalDate carries no time, so comparing them in a
  // real timezone would let a DST shift change the difference by a day.
  const start = DateTime.fromFormat(from, LOCAL_DATE_FORMAT, { zone: 'utc' });
  const end = DateTime.fromFormat(to, LOCAL_DATE_FORMAT, { zone: 'utc' });
  return Math.round(end.diff(start, 'days').days);
}

export function isSameLocalDate(a: LocalDate, b: LocalDate): boolean {
  return a === b;
}

/** True when `later` is exactly the calendar day after `earlier`. */
export function isConsecutiveLocalDate(earlier: LocalDate, later: LocalDate): boolean {
  return daysBetweenLocalDates(earlier, later) === 1;
}

export function isValidLocalDate(value: string): boolean {
  return DateTime.fromFormat(value, LOCAL_DATE_FORMAT, { zone: 'utc' }).isValid;
}

/** Inclusive list of dates from `from` to `to`. Used by the reading calendar. */
export function localDateRange(from: LocalDate, to: LocalDate): LocalDate[] {
  const total = daysBetweenLocalDates(from, to);
  if (total < 0) return [];

  const dates: LocalDate[] = [];
  for (let offset = 0; offset <= total; offset += 1) {
    dates.push(addLocalDays(from, offset));
  }
  return dates;
}

/** First day of the month containing `date`. */
export function startOfLocalMonth(date: LocalDate): LocalDate {
  return DateTime.fromFormat(date, LOCAL_DATE_FORMAT, { zone: 'utc' })
    .startOf('month')
    .toFormat(LOCAL_DATE_FORMAT);
}

export function endOfLocalMonth(date: LocalDate): LocalDate {
  return DateTime.fromFormat(date, LOCAL_DATE_FORMAT, { zone: 'utc' })
    .endOf('month')
    .toFormat(LOCAL_DATE_FORMAT);
}

/** 1 = Monday … 7 = Sunday, matching ISO and the calendar UI's column order. */
export function weekdayOfLocalDate(date: LocalDate): number {
  return DateTime.fromFormat(date, LOCAL_DATE_FORMAT, { zone: 'utc' }).weekday;
}
