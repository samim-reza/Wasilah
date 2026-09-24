/**
 * What the widget says right now, and when that will next change.
 *
 * Pure. The world comes in through `CardInput` and the answer is a `WidgetCard`
 * with an `until`, so the same function serves the headless draw, the in-app
 * preview and the tests — and so the alarm that wakes the widget can be set
 * for exactly the instant the card would change.
 *
 * The day is a sequence of MOMENTS laid over a background of ROTATION:
 *
 *   - Weather comes first. Rain now beats anything the clock says.
 *   - Then a prayer, for half an hour from its time.
 *   - Then the moments of the day — tahajjud, dawn, sunrise, morning, noon,
 *     afternoon, sunset, night, midnight — each a short window with the
 *     words that belong to it.
 *   - Then the sky and the calendar: the new crescent, the nights of Ramadan,
 *     a new month, Friday.
 *   - Otherwise the rotation: every hour, either a nudge to read (only while
 *     today's reading is not done), a word about the Quran, or an everyday
 *     dua — "do you know what to say when entering the house?"
 *
 * Nothing here reads storage or the network, and nothing here is localised
 * beyond calling `t` with the locale it was given.
 */
import { duaCatalogue, findOccasion, hasRealContent } from '@/features/duas/data/duaCatalogue';
import type { DuaOccasion } from '@/features/duas/types/dua.types';
import { isNewCrescentVisible } from '@/features/duas/utils/moonPhase';
import type { WeatherCondition } from '@/features/weather/types/weather.types';
import { hijriDateAt, hijriNightAt, isQadrNight, RAMADAN } from '@/lib/datetime/hijri';
import { timeOfDayAt, toMinuteOfDay } from '@/lib/datetime/timeOfDay';
import { t, type Locale } from '@/lib/i18n';

export type WidgetScene =
  | 'dawn'
  | 'sunrise'
  | 'day'
  | 'noon'
  | 'afternoon'
  | 'sunset'
  | 'night'
  | 'midnight'
  | 'tahajjud'
  | 'moon'
  | 'rain'
  | 'storm'
  | 'wind'
  | 'heat'
  | 'cold'
  | 'mosque'
  | 'prayer'
  | 'quran';

export type WidgetCardKind =
  | 'weather'
  | 'prayer'
  | 'moment'
  | 'moon'
  | 'calendar'
  | 'friday'
  | 'everyday'
  | 'nudge'
  | 'praise';

export interface WidgetCard {
  kind: WidgetCardKind;
  scene: WidgetScene;
  /** Small label at the top. */
  title: string;
  /** The line under it. */
  line: string;
  /** Short Arabic, when the card carries a dua short enough to read at a glance. */
  arabic: string | null;
  /** The dua behind the card, for the tap-through; null for a plain message. */
  occasionId: string | null;
  /** When this card stops being right. Null means "until the next hour". */
  until: Date;
}

/** One day's prayer and sun times. */
export interface DayTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface CardInput {
  now: Date;
  timezone: string;
  locale: Locale;
  /** Yesterday, today and tomorrow, so windows that straddle midnight resolve. */
  times: { yesterday: DayTimes; today: DayTimes; tomorrow: DayTimes } | null;
  weather: { condition: WeatherCondition; temperatureCelsius: number; fetchedAt: Date } | null;
  habit: { currentStreak: number; minimumMet: boolean };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A prayer's card stays up this long after its time. */
export const PRAYER_WINDOW_MINUTES = 30;
/** A moment of the day stays up this long. */
export const MOMENT_WINDOW_MINUTES = 25;
/** A weather reading older than this says nothing about the sky now. */
export const WEATHER_FRESH_MINUTES = 90;
/** Arabic longer than this is shown as its meaning instead, on a widget. */
const ARABIC_GLANCE_LENGTH = 70;

type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
const PRAYERS: readonly PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

function within(now: Date, start: Date, end: Date): boolean {
  return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
}

function endOfHour(now: Date): Date {
  return new Date(Math.floor(now.getTime() / HOUR) * HOUR + HOUR);
}

/**
 * Clock-based day times for a device without location. Wide of the mark at
 * high latitudes, close enough elsewhere, and only used for the moments —
 * a prayer card is never shown from a guess.
 */
export function approximateDayTimes(now: Date, timezone: string, dayOffset = 0): DayTimes {
  const local = timeOfDayAt(now, timezone);
  const midnight = new Date(now.getTime() - toMinuteOfDay(local) * MINUTE + dayOffset * 24 * HOUR);
  const at = (h: number, m = 0) => new Date(midnight.getTime() + (h * 60 + m) * MINUTE);
  return {
    fajr: at(4, 45),
    sunrise: at(6, 5),
    dhuhr: at(12, 0),
    asr: at(15, 30),
    maghrib: at(18, 0),
    isha: at(19, 30),
  };
}

interface Window {
  start: Date;
  end: Date;
  build: () => Omit<WidgetCard, 'until'>;
}

function localised(key: string, locale: Locale, options: Record<string, string | number> = {}) {
  return t(key, { ...options, locale });
}

function formatTime(date: Date, timezone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(date);
}

/** The Arabic if it is short enough to read on a widget, else null. */
function glanceArabic(occasion: DuaOccasion | undefined): string | null {
  if (!occasion || !hasRealContent(occasion)) return null;
  return occasion.text.arabic.length <= ARABIC_GLANCE_LENGTH ? occasion.text.arabic : null;
}

function occasionCard(
  kind: WidgetCardKind,
  scene: WidgetScene,
  occasionId: string,
  title: string,
  fallbackLine: string,
): Omit<WidgetCard, 'until'> {
  const occasion = findOccasion(occasionId);
  const line = occasion && hasRealContent(occasion) ? occasion.text.translation : fallbackLine;
  return {
    kind,
    scene,
    title,
    line: glanceArabic(occasion) ? line : (occasion?.prompt ?? fallbackLine),
    arabic: glanceArabic(occasion),
    occasionId: occasion ? occasion.id : null,
  };
}

// --- Weather -----------------------------------------------------------------

function weatherCard(input: CardInput): Omit<WidgetCard, 'until'> | null {
  const { weather } = input;
  if (!weather) return null;
  if (input.now.getTime() - weather.fetchedAt.getTime() > WEATHER_FRESH_MINUTES * MINUTE) return null;

  const { locale } = input;
  if (weather.condition === 'storm') {
    return occasionCard('weather', 'storm', 'thunder', localised('widget.weather.storm', locale), '');
  }
  if (weather.condition === 'rain') {
    return occasionCard('weather', 'rain', 'rain-falling', localised('widget.weather.rain', locale), '');
  }
  if (weather.condition === 'snow' || weather.temperatureCelsius <= 2) {
    return occasionCard('weather', 'cold', 'intense-cold', localised('widget.weather.cold', locale), '');
  }
  if (weather.temperatureCelsius >= 35) {
    return occasionCard('weather', 'heat', 'intense-heat', localised('widget.weather.heat', locale), '');
  }
  return null;
}

// --- Prayers and moments -----------------------------------------------------

function prayerWindows(input: CardInput, day: DayTimes): Window[] {
  const { locale, timezone, now } = input;
  const ramadan = hijriDateAt(now, timezone).month === RAMADAN;

  return PRAYERS.map((name) => {
    const at = day[name];
    return {
      start: at,
      end: minutesAfter(at, PRAYER_WINDOW_MINUTES),
      build: () => {
        const title = `${localised(`prayer.${name}`, locale)} · ${formatTime(at, timezone, locale)}`;
        // Maghrib in Ramadan is iftar before it is anything else.
        const occasionId = name === 'maghrib' && ramadan ? 'ramadan-iftar' : 'after-adhan';
        const card = occasionCard('prayer', 'prayer', occasionId, title, '');
        return {
          ...card,
          line: localised('widget.prayer.now', locale, { prayer: localised(`prayer.${name}`, locale) }),
        };
      },
    };
  });
}

function momentWindows(input: CardInput, day: DayTimes, next: DayTimes, prev: DayTimes): Window[] {
  const { locale } = input;
  const moment = (
    scene: WidgetScene,
    key: string,
    occasionId: string,
    start: Date,
    end: Date,
  ): Window => ({
    start,
    end,
    build: () => occasionCard('moment', scene, occasionId, localised(`widget.moment.${key}`, locale), ''),
  });

  const nightLength = day.fajr.getTime() - prev.maghrib.getTime();
  const tahajjudStart = new Date(day.fajr.getTime() - nightLength / 3);
  const solarMidnight = new Date(day.maghrib.getTime() + (next.fajr.getTime() - day.maghrib.getTime()) / 2);

  return [
    // The last third of the night, up to fajr.
    moment('tahajjud', 'tahajjud', 'tahajjud', tahajjudStart, day.fajr),
    // Between the fajr card and sunrise: the morning remembrance.
    moment('dawn', 'dawn', 'morning-adhkar', minutesAfter(day.fajr, PRAYER_WINDOW_MINUTES), day.sunrise),
    moment('sunrise', 'sunrise', 'waking-up', day.sunrise, minutesAfter(day.sunrise, MOMENT_WINDOW_MINUTES)),
    moment(
      'day',
      'morning',
      'three-quls',
      minutesAfter(day.sunrise, 60),
      minutesAfter(day.sunrise, 60 + MOMENT_WINDOW_MINUTES),
    ),
    moment('noon', 'noon', 'between-adhan-and-iqamah', minutesAfter(day.dhuhr, -MOMENT_WINDOW_MINUTES), day.dhuhr),
    moment('afternoon', 'afternoon', 'after-fard-prayer', minutesAfter(day.asr, -MOMENT_WINDOW_MINUTES), day.asr),
    moment('sunset', 'sunset', 'evening-adhkar', minutesAfter(day.maghrib, -MOMENT_WINDOW_MINUTES - 5), day.maghrib),
    moment(
      'night',
      'night',
      'ayat-al-kursi',
      minutesAfter(day.isha, PRAYER_WINDOW_MINUTES),
      minutesAfter(day.isha, PRAYER_WINDOW_MINUTES + MOMENT_WINDOW_MINUTES),
    ),
    moment(
      'midnight',
      'midnight',
      'last-two-ayahs-baqarah',
      solarMidnight,
      minutesAfter(solarMidnight, MOMENT_WINDOW_MINUTES),
    ),
  ];
}

/** Every timed window over yesterday, today and tomorrow, in order. */
function allWindows(input: CardInput): Window[] {
  const { now, timezone } = input;
  const times = input.times ?? {
    yesterday: approximateDayTimes(now, timezone, -1),
    today: approximateDayTimes(now, timezone, 0),
    tomorrow: approximateDayTimes(now, timezone, 1),
  };
  const dayAfter = input.times
    ? shiftDay(times.tomorrow, 1)
    : approximateDayTimes(now, timezone, 2);

  const windows: Window[] = [];
  // Prayer cards only from real times: a guess would announce a prayer that
  // has not arrived.
  if (input.times) {
    windows.push(...prayerWindows(input, times.today), ...prayerWindows(input, times.tomorrow));
  }
  windows.push(
    ...momentWindows(input, times.today, times.tomorrow, times.yesterday),
    ...momentWindows(input, times.tomorrow, dayAfter, times.today),
  );
  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function shiftDay(day: DayTimes, days: number): DayTimes {
  const shift = (d: Date) => new Date(d.getTime() + days * 24 * HOUR);
  return {
    fajr: shift(day.fajr),
    sunrise: shift(day.sunrise),
    dhuhr: shift(day.dhuhr),
    asr: shift(day.asr),
    maghrib: shift(day.maghrib),
    isha: shift(day.isha),
  };
}

// --- Sky and calendar --------------------------------------------------------

function afterSunset(input: CardInput): boolean {
  const today = input.times?.today ?? approximateDayTimes(input.now, input.timezone);
  const minutes = toMinuteOfDay(timeOfDayAt(input.now, input.timezone));
  return input.now.getTime() >= today.maghrib.getTime() || minutes < 4 * 60;
}

function skyAndCalendarCard(input: CardInput): Omit<WidgetCard, 'until'> | null {
  const { now, timezone, locale } = input;
  const sunset = afterSunset(input);
  const night = hijriNightAt(now, timezone, sunset);
  const day = hijriDateAt(now, timezone);

  if (sunset && isQadrNight(night)) {
    return occasionCard('calendar', 'tahajjud', 'laylat-al-qadr', localised('widget.calendar.qadr', locale), '');
  }
  if (sunset && isNewCrescentVisible(now)) {
    const occasionId = night.day <= 2 ? 'new-hijri-month' : 'new-crescent';
    return occasionCard('moon', 'moon', occasionId, localised('widget.calendar.crescent', locale), '');
  }
  if (!sunset && day.day === 1) {
    return occasionCard('calendar', 'moon', 'new-hijri-month', localised('widget.calendar.newMonth', locale), '');
  }

  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(now);
  if (weekday === 'Fri' && !sunset) {
    const minutes = toMinuteOfDay(timeOfDayAt(now, timezone));
    // Friday's own words at the start of the day; Surah al-Kahf through it.
    const occasionId = minutes < 11 * 60 ? 'friday' : 'surah-al-kahf';
    return occasionCard('friday', 'mosque', occasionId, localised('widget.calendar.friday', locale), '');
  }
  return null;
}

// --- Rotation ----------------------------------------------------------------

/** A stable pick per hour: the same card until the hour turns, then another. */
function hourSeed(now: Date, timezone: string): number {
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).format(now);
  let hash = 7;
  for (const char of local) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

const NUDGE_COUNT = 8;
const PRAISE_COUNT = 8;

function everydayPool(): DuaOccasion[] {
  return duaCatalogue.filter(
    (occasion) =>
      (occasion.group === 'everyday_actions' || occasion.group === 'states_of_heart') &&
      Object.keys(occasion.trigger).length === 0 &&
      hasRealContent(occasion),
  );
}

function rotationCard(input: CardInput): Omit<WidgetCard, 'until'> {
  const { locale } = input;
  const seed = hourSeed(input.now, input.timezone);
  const pool = everydayPool();

  // Every other hour is an everyday dua; the hours between are a word about
  // reading — a nudge while today's ayah is still unread, praise once it is.
  if (seed % 2 === 1 && pool.length > 0) {
    const occasion = pool[Math.floor(seed / 2) % pool.length]!;
    return {
      kind: 'everyday',
      scene: 'quran',
      title: localised('widget.everyday.title', locale),
      line: localised('widget.everyday.prompt', locale, { occasion: occasion.title.toLowerCase() }),
      arabic: glanceArabic(occasion),
      occasionId: occasion.id,
    };
  }

  if (!input.habit.minimumMet) {
    const index = (Math.floor(seed / 2) % NUDGE_COUNT) + 1;
    return {
      kind: 'nudge',
      scene: 'quran',
      title: localised('widget.nudge.title', locale),
      line: localised(`widget.nudge.n${index}`, locale, { streak: input.habit.currentStreak }),
      arabic: null,
      occasionId: null,
    };
  }

  const index = (Math.floor(seed / 2) % PRAISE_COUNT) + 1;
  return {
    kind: 'praise',
    scene: 'quran',
    title: localised('widget.praise.title', locale),
    line: localised(`widget.praise.n${index}`, locale, { streak: input.habit.currentStreak }),
    arabic: null,
    occasionId: null,
  };
}

// --- Resolution --------------------------------------------------------------

export function resolveWidgetCard(input: CardInput): WidgetCard {
  const { now } = input;
  const windows = allWindows(input);
  const nextWindowStart = windows.find((w) => w.start.getTime() > now.getTime())?.start ?? null;
  const rotationEnd = endOfHour(now);
  const untilRotation = nextWindowStart && nextWindowStart < rotationEnd ? nextWindowStart : rotationEnd;

  const weather = weatherCard(input);
  if (weather) {
    // Weather is re-read each tick; the card holds until the next look.
    const fresh = new Date(input.weather!.fetchedAt.getTime() + WEATHER_FRESH_MINUTES * MINUTE);
    return { ...weather, until: fresh < untilRotation ? fresh : untilRotation };
  }

  const active = windows.find((w) => within(now, w.start, w.end));
  if (active) {
    return { ...active.build(), until: active.end };
  }

  const sky = skyAndCalendarCard(input);
  if (sky) {
    return { ...sky, until: untilRotation };
  }

  return { ...rotationCard(input), until: untilRotation };
}

/**
 * The instants at which the card will change over the coming day, for the
 * alarms: every window start and end, and the top of every hour for the
 * rotation. The alarm module keeps the first two dozen.
 */
export function nextCardChanges(input: CardInput, horizonHours = 24): Date[] {
  const { now } = input;
  const horizon = now.getTime() + horizonHours * HOUR;
  const instants = new Set<number>();

  for (const window of allWindows(input)) {
    for (const edge of [window.start, window.end]) {
      if (edge.getTime() > now.getTime() && edge.getTime() <= horizon) instants.add(edge.getTime());
    }
  }
  for (let hour = endOfHour(now).getTime(); hour <= horizon; hour += HOUR) instants.add(hour);

  return [...instants].sort((a, b) => a - b).map((ms) => new Date(ms));
}
