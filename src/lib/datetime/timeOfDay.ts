/**
 * Wall-clock time helpers for scheduling.
 *
 * A reminder set for "8:00 PM" means 8 PM wherever the user is, on whichever
 * side of a DST change. These helpers therefore work in wall-clock terms and
 * only convert to an absolute instant at the moment of scheduling.
 */
import { DateTime } from 'luxon';

import type { LocalDate } from './localDate';

/** Minutes since local midnight. */
export type MinuteOfDay = number;

export interface TimeOfDay {
  hour: number;
  minute: number;
}

/** Parses 'HH:MM' or Postgres' 'HH:MM:SS'. Returns null on malformed input. */
export function parseTimeOfDay(value: string): TimeOfDay | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Formats for storage in a Postgres `time` column. */
export function formatTimeOfDay({ hour, minute }: TimeOfDay): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

export function toMinuteOfDay({ hour, minute }: TimeOfDay): MinuteOfDay {
  return hour * 60 + minute;
}

export function fromMinuteOfDay(minutes: MinuteOfDay): TimeOfDay {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return { hour: Math.floor(normalized / 60), minute: normalized % 60 };
}

/** Localised display time, e.g. '8:00 PM' or '20:00' depending on the locale. */
export function formatTimeForDisplay(time: TimeOfDay, locale: string): string {
  return DateTime.fromObject({ hour: time.hour, minute: time.minute })
    .setLocale(locale)
    .toLocaleString(DateTime.TIME_SIMPLE);
}

/**
 * The next instant at which this wall-clock time occurs in the given timezone.
 *
 * If the time has already passed today, returns tomorrow's occurrence. Uses
 * calendar addition so a reminder does not drift by an hour across a DST
 * boundary.
 */
export function nextOccurrence(time: TimeOfDay, timezone: string, now: Date = new Date()): Date {
  const reference = DateTime.fromJSDate(now, { zone: timezone });
  let target = reference.set({
    hour: time.hour,
    minute: time.minute,
    second: 0,
    millisecond: 0,
  });

  if (target <= reference) {
    target = target.plus({ days: 1 });
  }

  return target.toJSDate();
}

/** The instant a wall-clock time occurs on a specific local date. */
export function occurrenceOn(time: TimeOfDay, date: LocalDate, timezone: string): Date {
  return DateTime.fromFormat(date, 'yyyy-LL-dd', { zone: timezone })
    .set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 })
    .toJSDate();
}

/**
 * Is `time` inside the quiet-hours window?
 *
 * The window normally wraps past midnight (22:30 → 07:00), which is why this
 * cannot be a simple `start <= t && t < end` comparison.
 */
export function isWithinWindow(time: TimeOfDay, start: TimeOfDay, end: TimeOfDay): boolean {
  const current = toMinuteOfDay(time);
  const from = toMinuteOfDay(start);
  const to = toMinuteOfDay(end);

  // A window with identical endpoints covers nothing, not everything —
  // treating it as all-day would silently mute every notification.
  if (from === to) return false;

  if (from < to) return current >= from && current < to;
  return current >= from || current < to;
}

/** The wall-clock time an instant falls at, in the given timezone. */
export function timeOfDayAt(instant: Date, timezone: string): TimeOfDay {
  const dateTime = DateTime.fromJSDate(instant, { zone: timezone });
  return { hour: dateTime.hour, minute: dateTime.minute };
}

/**
 * Moves a time out of a quiet-hours window by deferring it to the window's end.
 * Returns the input unchanged when it was never inside the window.
 */
export function shiftOutOfWindow(time: TimeOfDay, start: TimeOfDay, end: TimeOfDay): TimeOfDay {
  return isWithinWindow(time, start, end) ? end : time;
}
