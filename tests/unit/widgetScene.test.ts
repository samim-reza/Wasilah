import {
  dayPhase,
  resolveOccasion,
  resolveScene,
  type SceneInput,
  type SunTimes,
} from '@/features/widget/services/widgetScene';

const TZ = 'Asia/Dhaka';

/** Wednesday 2026-09-16 in Dhaka (UTC+6). */
function at(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 8, 16, hour - 6, minute));
}

/** Friday 2026-09-18 in Dhaka. */
function fridayAt(hour: number): Date {
  return new Date(Date.UTC(2026, 8, 18, hour - 6));
}

const SUN: SunTimes = { fajr: at(4, 30), sunrise: at(5, 45), maghrib: at(18, 0) };

function input(overrides: Partial<SceneInput> = {}): SceneInput {
  return { now: at(12), timezone: TZ, weather: null, sun: null, ...overrides };
}

describe('dayPhase', () => {
  it('follows the clock when there are no sun times', () => {
    expect(dayPhase(at(3), TZ)).toBe('night');
    expect(dayPhase(at(5, 30), TZ)).toBe('dawn');
    expect(dayPhase(at(12), TZ)).toBe('day');
    expect(dayPhase(at(18), TZ)).toBe('sunset');
    expect(dayPhase(at(21), TZ)).toBe('night');
  });

  it('anchors dawn and sunset to the real sun when it is known', () => {
    expect(dayPhase(at(4, 0), TZ, SUN)).toBe('night');
    expect(dayPhase(at(4, 45), TZ, SUN)).toBe('dawn');
    // 30 minutes after sunrise the sky is daytime.
    expect(dayPhase(at(6, 20), TZ, SUN)).toBe('day');
    // 45 minutes before maghrib the sunset begins.
    expect(dayPhase(at(17, 20), TZ, SUN)).toBe('sunset');
    expect(dayPhase(at(18, 20), TZ, SUN)).toBe('sunset');
    expect(dayPhase(at(18, 30), TZ, SUN)).toBe('night');
  });
});

describe('resolveScene', () => {
  it('shows the sky by default', () => {
    expect(resolveScene(input({ now: at(5, 30) })).scene).toBe('dawn');
    expect(resolveScene(input({ now: at(12) })).scene).toBe('day');
    expect(resolveScene(input({ now: at(18) })).scene).toBe('sunset');
    expect(resolveScene(input({ now: at(22) })).scene).toBe('night');
  });

  it('lets rain win over the time of day', () => {
    const rain = { condition: 'rain' as const, temperatureCelsius: 24 };
    expect(resolveScene(input({ now: at(12), weather: rain })).scene).toBe('rain');
    expect(resolveScene(input({ now: at(22), weather: rain })).scene).toBe('rain');
  });

  it('shows the cold scene for snow or bitter cold', () => {
    expect(
      resolveScene(input({ weather: { condition: 'snow', temperatureCelsius: -2 } })).scene,
    ).toBe('cold');
    expect(
      resolveScene(input({ weather: { condition: 'clear', temperatureCelsius: 3 } })).scene,
    ).toBe('cold');
    expect(
      resolveScene(input({ weather: { condition: 'clear', temperatureCelsius: 12 } })).scene,
    ).toBe('day');
  });

  it('shows the mosque on Friday during the day only', () => {
    expect(resolveScene(input({ now: fridayAt(12) })).scene).toBe('mosque');
    expect(resolveScene(input({ now: fridayAt(22) })).scene).toBe('night');
  });

  it('shows the crescent at night only while the moon is new', () => {
    // 2026-09-11 03:27 UTC is a new moon; two nights later the crescent shows.
    const youngMoonNight = new Date('2026-09-13T15:00:00Z');
    const fullMoonNight = new Date('2026-09-26T15:00:00Z');
    expect(resolveScene(input({ now: youngMoonNight })).scene).toBe('moon');
    expect(resolveScene(input({ now: fullMoonNight })).scene).toBe('night');
    // Never during the day, whatever the moon is doing.
    expect(resolveScene(input({ now: new Date('2026-09-13T06:00:00Z') })).scene).toBe('day');
  });
});

describe('resolveOccasion', () => {
  it('offers the evening remembrance in the evening', () => {
    expect(resolveOccasion(input({ now: at(18) }))?.id).toBe('evening-adhkar');
  });

  it('prefers the rain dua over the time of day', () => {
    const occasion = resolveOccasion(
      input({ now: at(18), weather: { condition: 'rain', temperatureCelsius: 20 } }),
    );
    expect(occasion?.id).toBe('rain-falling');
  });

  it('offers nothing for an ordinary afternoon rather than a random everyday dua', () => {
    expect(resolveOccasion(input({ now: at(14) }))).toBeNull();
  });
});
