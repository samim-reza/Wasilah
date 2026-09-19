import {
  eligibleOccasions,
  matchesTrigger,
  selectOccasion,
  triggerSpecificity,
} from '@/features/duas/services/duaSelector';
import { isNewCrescentVisible, moonAgeDays } from '@/features/duas/utils/moonPhase';
import type { DuaContext } from '@/features/duas/types/dua.types';

/** A Friday. 2026-09-18T20:00Z is Friday evening in London. */
const FRIDAY_EVENING = new Date('2026-09-18T20:00:00Z');
/** A Wednesday morning. */
const WEDNESDAY_MORNING = new Date('2026-09-16T08:00:00Z');

function context(overrides: Partial<DuaContext> = {}): DuaContext {
  return {
    now: WEDNESDAY_MORNING,
    timezone: 'Europe/London',
    moonAgeDays: moonAgeDays(WEDNESDAY_MORNING),
    recentlyShownIds: [],
    ...overrides,
  };
}

describe('matchesTrigger', () => {
  it('matches an empty trigger against any context', () => {
    expect(matchesTrigger({}, context())).toBe(true);
  });

  it('matches the time of day in the user timezone, not the device one', () => {
    // 08:00 UTC is morning in London but already afternoon in Tokyo.
    expect(matchesTrigger({ timesOfDay: ['morning'] }, context())).toBe(true);
    expect(
      matchesTrigger({ timesOfDay: ['morning'] }, context({ timezone: 'Asia/Tokyo' })),
    ).toBe(false);
  });

  it('matches Friday in the user timezone', () => {
    expect(matchesTrigger({ weekdays: [5] }, context({ now: FRIDAY_EVENING }))).toBe(true);
    expect(matchesTrigger({ weekdays: [5] }, context())).toBe(false);
  });

  it('never matches a weather trigger when weather is unknown', () => {
    // A user who declined location must not be told it is raining.
    expect(matchesTrigger({ weather: ['rain'] }, context())).toBe(false);
  });

  it('matches a weather condition when it is known', () => {
    const rainy = context({ weather: { condition: 'rain', temperatureCelsius: 14 } });
    expect(matchesTrigger({ weather: ['rain'] }, rainy)).toBe(true);
    expect(matchesTrigger({ weather: ['snow'] }, rainy)).toBe(false);
  });

  it('applies temperature thresholds inclusively', () => {
    const hot = context({ weather: { condition: 'clear', temperatureCelsius: 35 } });
    expect(matchesTrigger({ minTemperatureCelsius: 35 }, hot)).toBe(true);
    expect(matchesTrigger({ minTemperatureCelsius: 36 }, hot)).toBe(false);

    const cold = context({ weather: { condition: 'snow', temperatureCelsius: 2 } });
    expect(matchesTrigger({ maxTemperatureCelsius: 2 }, cold)).toBe(true);
    expect(matchesTrigger({ maxTemperatureCelsius: 1 }, cold)).toBe(false);
  });

  it('only offers a sleep dua once a sleep time is configured', () => {
    expect(matchesTrigger({ requiresSleepSchedule: true }, context())).toBe(false);
    expect(
      matchesTrigger({ requiresSleepSchedule: true }, context({ sleepTime: { hour: 23, minute: 0 } })),
    ).toBe(true);
  });
});

describe('triggerSpecificity', () => {
  it('ranks a conditioned trigger above an unconditioned one', () => {
    expect(triggerSpecificity({})).toBe(0);
    expect(triggerSpecificity({ weather: ['rain'] })).toBeGreaterThan(triggerSpecificity({}));
    expect(triggerSpecificity({ newMoon: true })).toBeGreaterThan(
      triggerSpecificity({ timesOfDay: ['night'] }),
    );
  });
});

describe('selectOccasion', () => {
  it('prefers a weather-specific dua over a generic one', () => {
    const rainy = context({ weather: { condition: 'rain', temperatureCelsius: 12 } });
    expect(selectOccasion(rainy, 0)?.id).toBe('rain-falling');
  });

  it('falls back to the everyday duas when nothing specific applies', () => {
    const chosen = selectOccasion(context(), 0);
    expect(chosen).not.toBeNull();
    expect(chosen!.text.arabic).toBe('Allah');
  });

  it('avoids repeating something shown recently', () => {
    const rainy = context({
      weather: { condition: 'rain', temperatureCelsius: 12 },
      recentlyShownIds: ['rain-falling'],
    });
    expect(selectOccasion(rainy, 0)?.id).not.toBe('rain-falling');
  });

  it('repeats rather than returning nothing when everything is recently shown', () => {
    const everything = eligibleOccasions(context()).map((occasion) => occasion.id);
    const chosen = selectOccasion(context({ recentlyShownIds: everything }), 0);
    expect(chosen).not.toBeNull();
  });

  it('is deterministic for a given seed', () => {
    expect(selectOccasion(context(), 0.42)?.id).toBe(selectOccasion(context(), 0.42)?.id);
  });

  it('never indexes past the end of the pool at seed 1', () => {
    expect(selectOccasion(context(), 1)).not.toBeNull();
  });
});

describe('moonPhase', () => {
  it('reports a near-zero age at a known new moon', () => {
    // 2000-01-06 18:14 UTC is the reference conjunction.
    expect(moonAgeDays(new Date(Date.UTC(2000, 0, 6, 18, 14)))).toBeCloseTo(0, 3);
  });

  it('never returns a negative age for dates before the reference epoch', () => {
    expect(moonAgeDays(new Date('1990-05-01T00:00:00Z'))).toBeGreaterThanOrEqual(0);
  });

  it('excludes the conjunction itself from the visible-crescent window', () => {
    // The astronomical new moon is invisible; the crescent comes later.
    expect(isNewCrescentVisible(new Date(Date.UTC(2000, 0, 6, 18, 14)))).toBe(false);
    expect(isNewCrescentVisible(new Date(Date.UTC(2000, 0, 8, 6, 0)))).toBe(true);
  });
});
