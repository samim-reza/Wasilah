import {
  formatTimeOfDay,
  fromMinuteOfDay,
  isWithinWindow,
  nextOccurrence,
  parseTimeOfDay,
  shiftOutOfWindow,
  timeOfDayAt,
  toMinuteOfDay,
} from '@/lib/datetime/timeOfDay';

describe('parseTimeOfDay', () => {
  it('accepts HH:MM and Postgres HH:MM:SS', () => {
    expect(parseTimeOfDay('20:00')).toEqual({ hour: 20, minute: 0 });
    expect(parseTimeOfDay('07:30:00')).toEqual({ hour: 7, minute: 30 });
    expect(parseTimeOfDay('7:05')).toEqual({ hour: 7, minute: 5 });
  });

  it('rejects out-of-range and malformed values', () => {
    expect(parseTimeOfDay('24:00')).toBeNull();
    expect(parseTimeOfDay('12:60')).toBeNull();
    expect(parseTimeOfDay('noon')).toBeNull();
    expect(parseTimeOfDay('')).toBeNull();
  });
});

describe('formatTimeOfDay', () => {
  it('pads to the Postgres time format', () => {
    expect(formatTimeOfDay({ hour: 7, minute: 5 })).toBe('07:05:00');
    expect(formatTimeOfDay({ hour: 22, minute: 30 })).toBe('22:30:00');
  });
});

describe('minute-of-day conversion', () => {
  it('round-trips', () => {
    expect(toMinuteOfDay({ hour: 20, minute: 15 })).toBe(1215);
    expect(fromMinuteOfDay(1215)).toEqual({ hour: 20, minute: 15 });
  });

  it('wraps negative and overflowing minutes into the day', () => {
    expect(fromMinuteOfDay(-30)).toEqual({ hour: 23, minute: 30 });
    expect(fromMinuteOfDay(1500)).toEqual({ hour: 1, minute: 0 });
  });
});

describe('isWithinWindow', () => {
  const quietStart = { hour: 22, minute: 30 };
  const quietEnd = { hour: 7, minute: 0 };

  it('handles a window that wraps past midnight', () => {
    expect(isWithinWindow({ hour: 23, minute: 0 }, quietStart, quietEnd)).toBe(true);
    expect(isWithinWindow({ hour: 3, minute: 0 }, quietStart, quietEnd)).toBe(true);
    expect(isWithinWindow({ hour: 6, minute: 59 }, quietStart, quietEnd)).toBe(true);
    expect(isWithinWindow({ hour: 7, minute: 0 }, quietStart, quietEnd)).toBe(false);
    expect(isWithinWindow({ hour: 20, minute: 0 }, quietStart, quietEnd)).toBe(false);
  });

  it('handles a window inside a single day', () => {
    const start = { hour: 9, minute: 0 };
    const end = { hour: 17, minute: 0 };

    expect(isWithinWindow({ hour: 12, minute: 0 }, start, end)).toBe(true);
    expect(isWithinWindow({ hour: 8, minute: 59 }, start, end)).toBe(false);
    expect(isWithinWindow({ hour: 17, minute: 0 }, start, end)).toBe(false);
  });

  it('treats an empty window as covering nothing', () => {
    const same = { hour: 10, minute: 0 };
    expect(isWithinWindow({ hour: 10, minute: 0 }, same, same)).toBe(false);
    expect(isWithinWindow({ hour: 3, minute: 0 }, same, same)).toBe(false);
  });
});

describe('shiftOutOfWindow', () => {
  it('defers a time inside quiet hours to the window end', () => {
    const start = { hour: 22, minute: 30 };
    const end = { hour: 7, minute: 0 };

    expect(shiftOutOfWindow({ hour: 23, minute: 0 }, start, end)).toEqual(end);
    expect(shiftOutOfWindow({ hour: 20, minute: 0 }, start, end)).toEqual({ hour: 20, minute: 0 });
  });
});

describe('nextOccurrence', () => {
  it('returns today when the time is still ahead', () => {
    const now = new Date('2026-03-09T10:00:00Z');
    const next = nextOccurrence({ hour: 20, minute: 0 }, 'UTC', now);

    expect(next.toISOString()).toBe('2026-03-09T20:00:00.000Z');
  });

  it('rolls to tomorrow when the time has passed', () => {
    const now = new Date('2026-03-09T21:00:00Z');
    const next = nextOccurrence({ hour: 20, minute: 0 }, 'UTC', now);

    expect(next.toISOString()).toBe('2026-03-10T20:00:00.000Z');
  });

  it('keeps the wall-clock time across a DST change', () => {
    // 2026-03-08 is the US spring-forward day. A 20:00 local reminder must stay
    // at 20:00 local, which is a different UTC instant on either side.
    const before = nextOccurrence(
      { hour: 20, minute: 0 },
      'America/New_York',
      new Date('2026-03-07T12:00:00Z'),
    );
    const after = nextOccurrence(
      { hour: 20, minute: 0 },
      'America/New_York',
      new Date('2026-03-09T12:00:00Z'),
    );

    expect(timeOfDayAt(before, 'America/New_York')).toEqual({ hour: 20, minute: 0 });
    expect(timeOfDayAt(after, 'America/New_York')).toEqual({ hour: 20, minute: 0 });
    expect(before.getUTCHours()).not.toBe(after.getUTCHours());
  });
});
