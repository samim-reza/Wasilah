/**
 * What the widget should look like right now.
 *
 * Pure: everything about the world comes in through `SceneInput`, so the
 * choice can be tested against a fixed clock and a fixed sky. The headless
 * widget task and the in-app preview both call this with whatever they were
 * able to read, and get the same picture for the same moment.
 *
 * Two questions are answered separately. The BACKGROUND follows the sky —
 * the sun, the weather, the moon — because that is what the user can see out
 * of the window and what makes the widget feel alive. The OCCASION follows
 * the dua catalogue's own triggers, so the words offered are exactly the ones
 * the reminder system would offer at this moment, never a second opinion.
 */
import { duaCatalogue } from '@/features/duas/data/duaCatalogue';
import { eligibleOccasions, triggerSpecificity } from '@/features/duas/services/duaSelector';
import type { DuaContext, DuaOccasion } from '@/features/duas/types/dua.types';
import { isNewCrescentVisible, moonAgeDays } from '@/features/duas/utils/moonPhase';
import type { WeatherCondition } from '@/features/weather/types/weather.types';
import { timeOfDayAt, toMinuteOfDay } from '@/lib/datetime/timeOfDay';

/** One background per file in `assets/widget`. */
export type WidgetScene = 'dawn' | 'day' | 'sunset' | 'night' | 'moon' | 'rain' | 'cold' | 'mosque';

export type DayPhase = 'dawn' | 'day' | 'sunset' | 'night';

/** The sun's day, from the on-device prayer calculation. */
export interface SunTimes {
  fajr: Date;
  sunrise: Date;
  maghrib: Date;
}

export interface SceneInput {
  now: Date;
  timezone: string;
  /** Last reading the app saw; null when it never had location. */
  weather?: { condition: WeatherCondition; temperatureCelsius: number } | null;
  /** Null when the user has not enabled location, in which case the clock decides. */
  sun?: SunTimes | null;
}

export interface SceneResolution {
  scene: WidgetScene;
  phase: DayPhase;
  /** The most specific dua occasion for this moment, or null when it is an ordinary hour. */
  occasion: DuaOccasion | null;
}

const MINUTE = 60_000;

/** How long after sunrise the sky still reads as dawn. */
const DAWN_AFTER_SUNRISE_MINUTES = 30;
/** How long before and after maghrib the sky reads as sunset. */
const SUNSET_BEFORE_MAGHRIB_MINUTES = 45;
const SUNSET_AFTER_MAGHRIB_MINUTES = 25;

/** Below this the "bitter cold" catalogue entry fires; the picture follows it. */
const COLD_CELSIUS = 5;

/**
 * Where the sun is.
 *
 * With real sun times the windows are anchored to fajr, sunrise and maghrib,
 * which is what makes "sunset" arrive at the right minute in Dhaka and in
 * Oslo alike. Without them the clock stands in, with bands wide enough to be
 * right more often than not at ordinary latitudes.
 */
export function dayPhase(now: Date, timezone: string, sun?: SunTimes | null): DayPhase {
  if (sun) {
    const t = now.getTime();
    if (t < sun.fajr.getTime()) return 'night';
    if (t < sun.sunrise.getTime() + DAWN_AFTER_SUNRISE_MINUTES * MINUTE) return 'dawn';
    if (t < sun.maghrib.getTime() - SUNSET_BEFORE_MAGHRIB_MINUTES * MINUTE) return 'day';
    if (t < sun.maghrib.getTime() + SUNSET_AFTER_MAGHRIB_MINUTES * MINUTE) return 'sunset';
    return 'night';
  }

  const minutes = toMinuteOfDay(timeOfDayAt(now, timezone));
  if (minutes < 4 * 60 + 30) return 'night';
  if (minutes < 7 * 60) return 'dawn';
  if (minutes < 17 * 60 + 15) return 'day';
  if (minutes < 19 * 60) return 'sunset';
  return 'night';
}

function weekdayInTimezone(now: Date, timezone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(
    now,
  );
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/**
 * The background, from the sky outwards.
 *
 * Weather wins over the time of day: rain at noon is a rain picture, not a
 * sunny one. Then the moon, only at night and only while the crescent is
 * genuinely new. Then Friday, which gets the mosque during the day. Then the
 * plain phase of the day.
 */
export function resolveScene(input: SceneInput): { scene: WidgetScene; phase: DayPhase } {
  const phase = dayPhase(input.now, input.timezone, input.sun);
  const weather = input.weather ?? null;

  if (weather?.condition === 'rain' || weather?.condition === 'storm') {
    return { scene: 'rain', phase };
  }
  if (weather?.condition === 'snow' || (weather && weather.temperatureCelsius <= COLD_CELSIUS)) {
    return { scene: 'cold', phase };
  }
  if (phase === 'night' && isNewCrescentVisible(input.now)) {
    return { scene: 'moon', phase };
  }
  if (phase === 'day' && weekdayInTimezone(input.now, input.timezone) === 5) {
    return { scene: 'mosque', phase };
  }
  return { scene: phase, phase };
}

/**
 * The dua occasion for this moment, if the moment has one.
 *
 * Reads the WHOLE catalogue, placeholders included, because the widget shows
 * the occasion's title and prompt even before its words have been sourced —
 * "Evening remembrance" over a sunset is worth showing on its own. The
 * caller decides whether the text underneath is real; see `hasRealContent`.
 *
 * Everyday actions ("before eating") have no trigger and match at any hour.
 * They are excluded here: a widget that says "Entering the washroom" on a
 * Tuesday afternoon is not context, it is noise.
 */
export function resolveOccasion(input: SceneInput): DuaOccasion | null {
  const context: DuaContext = {
    now: input.now,
    timezone: input.timezone,
    weather: input.weather ?? undefined,
    moonAgeDays: moonAgeDays(input.now),
    recentlyShownIds: [],
  };

  const eligible = eligibleOccasions(context, duaCatalogue);
  const first = eligible[0];
  if (!first || triggerSpecificity(first.trigger) === 0) return null;
  return first;
}

export function resolveWidgetScene(input: SceneInput): SceneResolution {
  const { scene, phase } = resolveScene(input);
  return { scene, phase, occasion: resolveOccasion(input) };
}
