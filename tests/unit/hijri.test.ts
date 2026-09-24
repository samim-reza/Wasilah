import {
  hijriDateAt,
  hijriFromGregorian,
  hijriNightAt,
  isQadrNight,
  RAMADAN,
} from '@/lib/datetime/hijri';

describe('hijriFromGregorian', () => {
  it('matches known dates to within the tabular calendar', () => {
    // 1 Muharram 1 AH = 16 July 622 (Julian 19 July; the tabular epoch).
    expect(hijriFromGregorian(622, 7, 19)).toEqual({ year: 1, month: 1, day: 1 });
    // 1 Ramadan 1445 was announced on 11 March 2024 in most countries.
    const ramadan1445 = hijriFromGregorian(2024, 3, 11);
    expect(ramadan1445.year).toBe(1445);
    expect(ramadan1445.month).toBe(RAMADAN);
    expect(Math.abs(ramadan1445.day - 1)).toBeLessThanOrEqual(1);
    // Eid al-Fitr 1446 (1 Shawwal) was 30 March 2025 by sighting; the
    // tabular calendar lands a day either side of a month boundary.
    const shawwal1446 = hijriFromGregorian(2025, 3, 30);
    expect(shawwal1446.year).toBe(1446);
    expect(
      (shawwal1446.month === 10 && shawwal1446.day <= 2) ||
        (shawwal1446.month === 9 && shawwal1446.day >= 29),
    ).toBe(true);
    // 1 Ramadan 1447: 18 February 2026.
    expect(hijriFromGregorian(2026, 2, 18)).toEqual({ year: 1447, month: 9, day: 1 });
  });

  it('reads the civil date in the given timezone', () => {
    // 23:30 in Dhaka is still the same civil day there, but the next in UTC+14.
    const instant = new Date('2026-09-16T17:30:00Z');
    const dhaka = hijriDateAt(instant, 'Asia/Dhaka');
    const kiritimati = hijriDateAt(instant, 'Pacific/Kiritimati');
    expect(kiritimati.day - dhaka.day).toBe(1);
  });

  it('moves the night to the next Hijri day once the sun has set', () => {
    const instant = new Date('2026-09-16T14:00:00Z');
    const day = hijriNightAt(instant, 'Asia/Dhaka', false);
    const night = hijriNightAt(instant, 'Asia/Dhaka', true);
    expect(night.day === day.day + 1 || (night.day === 1 && day.day >= 29)).toBe(true);
  });

  it('recognises only the odd nights of the last ten of Ramadan', () => {
    expect(isQadrNight({ year: 1447, month: RAMADAN, day: 27 })).toBe(true);
    expect(isQadrNight({ year: 1447, month: RAMADAN, day: 26 })).toBe(false);
    expect(isQadrNight({ year: 1447, month: RAMADAN, day: 19 })).toBe(false);
    expect(isQadrNight({ year: 1447, month: 10, day: 27 })).toBe(false);
  });
});
