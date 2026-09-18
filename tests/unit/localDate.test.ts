/**
 * Date handling tests.
 *
 * These exist because every one of these cases has, historically, broken a
 * streak feature somewhere: the UTC boundary, the DST transition, the user who
 * flies across a date line.
 */
import {
  addLocalDays,
  daysBetweenLocalDates,
  endOfLocalDay,
  isConsecutiveLocalDate,
  localDateRange,
  safeTimezone,
  startOfLocalDay,
  toLocalDate,
  weekdayOfLocalDate,
} from '@/lib/datetime/localDate';

describe('toLocalDate', () => {
  it('uses the local calendar day, not the UTC day', () => {
    // 2026-03-14T20:30:00Z is already 02:30 on the 15th in Dhaka (UTC+6).
    const instant = new Date('2026-03-14T20:30:00Z');

    expect(toLocalDate(instant, 'UTC')).toBe('2026-03-14');
    expect(toLocalDate(instant, 'Asia/Dhaka')).toBe('2026-03-15');
  });

  it('keeps a late-evening session on the correct day west of UTC', () => {
    // 23:30 on the 14th in New York is already the 15th in UTC.
    const instant = new Date('2026-03-15T03:30:00Z');

    expect(toLocalDate(instant, 'UTC')).toBe('2026-03-15');
    expect(toLocalDate(instant, 'America/New_York')).toBe('2026-03-14');
  });
});

describe('local day boundaries', () => {
  it('ends a day at the start of the next one, so DST cannot shorten it', () => {
    // US DST spring forward: 2026-03-08 is only 23 hours long in New York.
    const start = startOfLocalDay('2026-03-08', 'America/New_York');
    const end = endOfLocalDay('2026-03-08', 'America/New_York');

    const hours = (end.getTime() - start.getTime()) / 3_600_000;
    expect(hours).toBe(23);
    expect(toLocalDate(start, 'America/New_York')).toBe('2026-03-08');
  });

  it('handles a 25-hour autumn day', () => {
    const start = startOfLocalDay('2026-11-01', 'America/New_York');
    const end = endOfLocalDay('2026-11-01', 'America/New_York');

    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
});

describe('addLocalDays', () => {
  it('advances by exactly one calendar day across a DST transition', () => {
    expect(addLocalDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addLocalDays('2026-03-08', 1)).toBe('2026-03-09');
  });

  it('crosses month and year boundaries', () => {
    expect(addLocalDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addLocalDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles a leap day', () => {
    expect(addLocalDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addLocalDays('2028-02-29', 1)).toBe('2028-03-01');
  });
});

describe('daysBetweenLocalDates', () => {
  it('counts whole calendar days regardless of DST', () => {
    expect(daysBetweenLocalDates('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetweenLocalDates('2026-11-01', '2026-11-02')).toBe(1);
  });

  it('is negative when the target is earlier', () => {
    expect(daysBetweenLocalDates('2026-03-09', '2026-03-07')).toBe(-2);
  });

  it('is zero for the same date', () => {
    expect(daysBetweenLocalDates('2026-03-09', '2026-03-09')).toBe(0);
  });
});

describe('isConsecutiveLocalDate', () => {
  it('is true only for adjacent days', () => {
    expect(isConsecutiveLocalDate('2026-03-08', '2026-03-09')).toBe(true);
    expect(isConsecutiveLocalDate('2026-03-08', '2026-03-10')).toBe(false);
    expect(isConsecutiveLocalDate('2026-03-08', '2026-03-08')).toBe(false);
    expect(isConsecutiveLocalDate('2026-03-09', '2026-03-08')).toBe(false);
  });
});

describe('localDateRange', () => {
  it('is inclusive of both ends', () => {
    expect(localDateRange('2026-03-08', '2026-03-11')).toEqual([
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
    ]);
  });

  it('returns nothing for a reversed range', () => {
    expect(localDateRange('2026-03-11', '2026-03-08')).toEqual([]);
  });
});

describe('weekdayOfLocalDate', () => {
  it('returns ISO weekdays with Monday as 1', () => {
    expect(weekdayOfLocalDate('2026-03-09')).toBe(1); // Monday
    expect(weekdayOfLocalDate('2026-03-15')).toBe(7); // Sunday
  });
});

describe('safeTimezone', () => {
  it('passes through a valid zone', () => {
    expect(safeTimezone('Asia/Dhaka')).toBe('Asia/Dhaka');
  });

  it('falls back when the zone is missing or nonsense', () => {
    expect(safeTimezone('Not/AZone')).not.toBe('Not/AZone');
    expect(safeTimezone(null)).toBeTruthy();
  });
});
