import {
  approximateDayTimes,
  nextCardChanges,
  resolveWidgetCard,
  type CardInput,
  type DayTimes,
} from '@/features/widget/services/widgetCards';

const TZ = 'Asia/Dhaka';

/** Wednesday 2026-09-16 in Dhaka (UTC+6). */
function at(hour: number, minute = 0, dayOffset = 0): Date {
  return new Date(Date.UTC(2026, 8, 16 + dayOffset, hour - 6, minute));
}

function day(offset = 0): DayTimes {
  return {
    fajr: at(4, 30, offset),
    sunrise: at(5, 45, offset),
    dhuhr: at(11, 55, offset),
    asr: at(15, 20, offset),
    maghrib: at(18, 0, offset),
    isha: at(19, 15, offset),
  };
}

function input(overrides: Partial<CardInput> = {}): CardInput {
  return {
    now: at(9),
    timezone: TZ,
    locale: 'en',
    times: { yesterday: day(-1), today: day(0), tomorrow: day(1) },
    weather: null,
    habit: { currentStreak: 3, minimumMet: false },
    ...overrides,
  };
}

describe('resolveWidgetCard', () => {
  it('shows a prayer for half an hour from its time, with its clock time', () => {
    const card = resolveWidgetCard(input({ now: at(18, 5) }));
    expect(card.kind).toBe('prayer');
    expect(card.title).toContain('Maghrib');
    expect(card.title).toMatch(/6:00/);
    expect(card.until.getTime()).toBe(at(18, 30).getTime());
    expect(resolveWidgetCard(input({ now: at(18, 31) })).kind).not.toBe('prayer');
  });

  it('never shows a prayer from guessed times', () => {
    const noon = approximateDayTimes(at(12), TZ).dhuhr;
    const card = resolveWidgetCard(input({ now: new Date(noon.getTime() + 60_000), times: null }));
    expect(card.kind).not.toBe('prayer');
  });

  it('shows the sunset before maghrib and the sunrise after the sun is up', () => {
    const sunset = resolveWidgetCard(input({ now: at(17, 45) }));
    expect(sunset.kind).toBe('moment');
    expect(sunset.scene).toBe('sunset');
    expect(sunset.occasionId).toBe('evening-adhkar');

    const sunrise = resolveWidgetCard(input({ now: at(5, 50) }));
    expect(sunrise.scene).toBe('sunrise');
    expect(sunrise.until.getTime()).toBe(at(6, 10).getTime());
  });

  it('shows the last third of the night as tahajjud', () => {
    // Night from 18:00 to 04:30 is 10.5 h; the last third begins at 01:00.
    expect(resolveWidgetCard(input({ now: at(1, 30) })).scene).toBe('tahajjud');
    expect(resolveWidgetCard(input({ now: at(0, 30) })).scene).not.toBe('tahajjud');
  });

  it('lets rain beat the clock while the reading is fresh', () => {
    const rain = { condition: 'rain' as const, temperatureCelsius: 24, fetchedAt: at(17, 50) };
    const card = resolveWidgetCard(input({ now: at(18, 5), weather: rain }));
    expect(card.kind).toBe('weather');
    expect(card.occasionId).toBe('rain-falling');
    expect(card.arabic).toContain('صَيِّبًا');

    const stale = { ...rain, fetchedAt: at(15) };
    expect(resolveWidgetCard(input({ now: at(18, 5), weather: stale })).kind).toBe('prayer');
  });

  it('nudges while today is unread and praises once it is read, holding until the hour', () => {
    const unread = resolveWidgetCard(input({ now: at(9, 12) }));
    expect(['nudge', 'everyday']).toContain(unread.kind);
    expect(unread.until.getTime()).toBe(at(10).getTime());

    const read = resolveWidgetCard(
      input({ now: at(9, 12), habit: { currentStreak: 3, minimumMet: true } }),
    );
    expect(['praise', 'everyday']).toContain(read.kind);
    expect(read.kind).not.toBe('nudge');
  });

  it('rotates the everyday dua with the hour, and keeps it within the hour', () => {
    const a = resolveWidgetCard(input({ now: at(9, 5) }));
    const b = resolveWidgetCard(input({ now: at(9, 55) }));
    expect(a.line).toBe(b.line);
    const seen = new Set<string>();
    for (let hour = 7; hour < 11; hour += 1) seen.add(resolveWidgetCard(input({ now: at(hour, 5) })).kind);
    expect(seen.has('everyday')).toBe(true);
  });

  it('shows Friday during the day only', () => {
    // 2026-09-18 is a Friday.
    expect(resolveWidgetCard(input({ now: at(9, 5, 2), times: null })).kind).toBe('friday');
    expect(resolveWidgetCard(input({ now: at(22, 5, 2), times: null })).kind).not.toBe('friday');
  });

  it('shows the crescent after sunset on the young-moon nights only', () => {
    // 2026-09-11 03:27 UTC is a new moon; two nights later the crescent shows.
    const young = new Date('2026-09-13T15:00:00Z');
    const card = resolveWidgetCard(input({ now: young, times: null }));
    expect(card.kind).toBe('moon');
    const full = new Date('2026-09-26T15:00:00Z');
    expect(resolveWidgetCard(input({ now: full, times: null })).kind).not.toBe('moon');
  });

  it('shows the Ramadan iftar dua at maghrib during Ramadan', () => {
    // 1 Ramadan 1447 is 18 February 2026; the 10th is 27 February.
    const ramadan = new Date(Date.UTC(2026, 1, 27, 12, 2)); // 18:02 Dhaka
    const times: DayTimes = {
      fajr: new Date(Date.UTC(2026, 1, 26, 23, 10)),
      sunrise: new Date(Date.UTC(2026, 1, 27, 0, 25)),
      dhuhr: new Date(Date.UTC(2026, 1, 27, 6, 10)),
      asr: new Date(Date.UTC(2026, 1, 27, 9, 25)),
      maghrib: new Date(Date.UTC(2026, 1, 27, 12, 0)),
      isha: new Date(Date.UTC(2026, 1, 27, 13, 15)),
    };
    const card = resolveWidgetCard(input({ now: ramadan, times: { yesterday: times, today: times, tomorrow: times } }));
    expect(card.kind).toBe('prayer');
    expect(card.occasionId).toBe('ramadan-iftar');
  });
});

describe('nextCardChanges', () => {
  it('lists every window edge and hour top ahead, sorted, within the horizon', () => {
    const changes = nextCardChanges(input({ now: at(9, 12) }));
    expect(changes[0]!.getTime()).toBeGreaterThan(at(9, 12).getTime());
    for (let i = 1; i < changes.length; i += 1) {
      expect(changes[i]!.getTime()).toBeGreaterThan(changes[i - 1]!.getTime());
    }
    const stamps = changes.map((d) => d.getTime());
    expect(stamps).toContain(at(10).getTime());
    expect(stamps).toContain(at(11, 30).getTime()); // 25 min before dhuhr
    expect(stamps).toContain(at(18).getTime()); // maghrib
    expect(stamps).toContain(at(4, 30, 1).getTime()); // tomorrow's fajr
    expect(changes[changes.length - 1]!.getTime()).toBeLessThanOrEqual(at(9, 12, 1).getTime());
  });
});
