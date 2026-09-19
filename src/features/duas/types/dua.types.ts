/**
 * Occasion-linked supplications and ayahs.
 *
 * The product rule this module exists to enforce is spec §23: a contextual
 * signal — rain, heat, a new moon, Friday — may only carry religious meaning
 * when an authoritative source says it does. So `source` below is REQUIRED on
 * every entry. An occasion cannot be added to the catalogue without naming the
 * narration or ayah it comes from, which makes the rule a compile error rather
 * than a code-review habit.
 *
 * Nothing here invents significance for a weather event. Rain does not "mean"
 * anything in this app; it is simply the occasion on which a transmitted dua
 * for rain becomes the relevant one to show.
 */
import type { TimeOfDay } from '@/lib/datetime/timeOfDay';
import type { WeatherCondition } from '@/features/weather/types/weather.types';

/** Broad grouping, used for the per-category toggles in settings. */
export type DuaGroup =
  | 'daily_rhythm'
  | 'sky_and_weather'
  | 'calendar'
  | 'everyday_actions'
  | 'states_of_heart'
  | 'prayer'
  | 'protective_ayahs';

/**
 * What has to be true for an occasion to be eligible.
 *
 * Every field is optional and all present fields must match. An occasion with
 * no conditions at all is always eligible, which is how the everyday-action
 * duas ("do you know the dua for leaving the house?") work — they are chosen
 * at random rather than triggered by the world.
 */
export interface DuaTrigger {
  /** Matches the part of the day the user is currently in. */
  timesOfDay?: readonly ('morning' | 'afternoon' | 'evening' | 'night')[];
  /** Matches current weather. */
  weather?: readonly WeatherCondition[];
  /** Fires at or above this temperature, in Celsius. */
  minTemperatureCelsius?: number;
  /** Fires at or below this temperature, in Celsius. */
  maxTemperatureCelsius?: number;
  /** 0 = Sunday … 5 = Friday … 6 = Saturday, in the user's timezone. */
  weekdays?: readonly number[];
  /** Requires the visible lunar disc to be within the new-crescent window. */
  newMoon?: boolean;
  /** Only offered when the user has switched on the before-sleep reminder. */
  requiresSleepSchedule?: boolean;
}

/**
 * The words themselves.
 *
 * Separated from the occasion so the catalogue can ship with placeholder text
 * while the trigger logic is developed and tested against real conditions.
 */
export interface DuaText {
  /** Arabic, as transmitted. */
  arabic: string;
  /** Latin-script pronunciation guide. */
  transliteration: string;
  /** Plain-English meaning. Not a claim to be a canonical translation. */
  translation: string;
  /**
   * Why it is said — the benefit named by the source, not an invented promise.
   * Empty string when the source names no particular virtue.
   */
  benefit: string;
  /**
   * REQUIRED. Where this comes from: a narration reference such as
   * 'Sahih al-Bukhari 1032', or an ayah reference such as 'Quran 2:255'.
   *
   * This field is what keeps spec §23 satisfied. Do not fill it with a
   * placeholder, a website name, or 'unknown' — if the source is not known,
   * the entry does not belong in the catalogue yet.
   */
  source: string;
}

/** Artwork shown on the notification and the detail screen. */
export type DuaImagery = 'rain' | 'sun' | 'moon' | 'night' | 'dawn' | 'mosque' | 'none';

export interface DuaOccasion {
  /** Stable identifier. Used in routes, analytics and notification payloads. */
  id: string;
  group: DuaGroup;
  /** Short label, e.g. 'When it rains'. Shown in settings and on the screen. */
  title: string;
  /**
   * The notification's opening line. Written as a question or an invitation
   * rather than an instruction — it should feel like an offer, not a demand.
   */
  prompt: string;
  trigger: DuaTrigger;
  imagery: DuaImagery;
  text: DuaText;
}

/** The world as the selector sees it. Gathered by the caller, never read here. */
export interface DuaContext {
  now: Date;
  timezone: string;
  /** Absent when the user has not granted location or weather is disabled. */
  weather?: {
    condition: WeatherCondition;
    temperatureCelsius: number;
  };
  /**
   * Days since the last conjunction, from `utils/moonPhase`. Always available
   * — it is calculated locally and needs neither network nor location.
   */
  moonAgeDays: number;
  /** Set when the user has configured a before-sleep reminder. */
  sleepTime?: TimeOfDay;
  /** Occasion ids already shown recently, so the same dua is not repeated. */
  recentlyShownIds: readonly string[];
}
