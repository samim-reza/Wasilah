/**
 * Everything the widget draws, gathered from what the device already holds.
 *
 * Runs in the headless widget task as well as in the app, so it must not
 * touch React, navigation or the theme. It reads the habit state, the stored
 * locale, the last weather reading and the prayer settings the app wrote
 * down, computes today's prayer times on the device, and asks `widgetCards`
 * what all of that adds up to right now.
 *
 * Weather is the one thing it may fetch: a short, bounded request when the
 * last reading is stale and a location is known. Everything else is optional
 * — a device with no location has no prayer times and no weather, and the
 * widget simply follows the clock.
 */
import { calculatePrayerTimes } from '@/features/prayer/services/prayerTimeService';
import type { PrayerSettings } from '@/features/prayer/types/prayer.types';
import { getLocalHabitState } from '@/features/streak/services/localHabitStore';
import { fetchWeather } from '@/features/weather/services/weatherService';
import type { WeatherSnapshot } from '@/features/weather/types/weather.types';
import { getDeviceTimezone, todayLocalDate, type LocalDate } from '@/lib/datetime/localDate';
import { supportedLocales, t, type Locale } from '@/lib/i18n';
import { logger } from '@/lib/monitoring/logger';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import {
  nextCardChanges,
  resolveWidgetCard,
  type CardInput,
  type DayTimes,
  type WidgetCard,
  type WidgetScene,
} from './widgetCards';

export type { WidgetScene };

/** The server's answer for a signed-in user, written by the app for the widget. */
export interface HabitSnapshot {
  today: LocalDate;
  currentStreak: number;
  minimumMet: boolean;
  goalMet: boolean;
}

export interface WidgetModel {
  card: WidgetCard;
  scene: WidgetScene;
  title: string;
  line: string;
  arabic: string | null;
  occasionId: string | null;
  currentStreak: number;
  minimumMet: boolean;
  streakLabel: string;
  status: string;
  /** When the widget should next be redrawn, for the alarms. */
  changes: Date[];
}

/** A weather reading is refreshed once it is older than this. */
const WEATHER_REFRESH_MS = 25 * 60_000;
/** The weather request in the headless task gets this long, then goes without. */
const WEATHER_FETCH_DEADLINE_MS = 5_000;

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (supportedLocales as readonly string[]).includes(value);
}

function withDeadline<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

function toDayTimes(
  settings: PrayerSettings,
  now: Date,
  dayOffset: number,
): DayTimes | null {
  if (!settings.coordinates) return null;
  const date = new Date(now.getTime() + dayOffset * 24 * 3_600_000);
  const times = calculatePrayerTimes(settings.coordinates, date, settings);
  return times
    ? {
        fajr: times.fajr,
        sunrise: times.sunrise,
        dhuhr: times.dhuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha,
      }
    : null;
}

/**
 * The habit figures the widget shows.
 *
 * For a signed-in user the server is the truth and the app writes a snapshot
 * of it; the local store only knows what this device read as a guest. A
 * snapshot from an earlier day still knows the streak — a streak is not lost
 * until a day is missed — but says nothing about today's reading.
 */
async function loadHabit(today: LocalDate): Promise<{ currentStreak: number; minimumMet: boolean }> {
  const snapshot = await keyValueStore.get<HabitSnapshot>(storageKeys.habitSnapshot);
  if (snapshot) {
    return {
      currentStreak: snapshot.currentStreak,
      minimumMet: snapshot.today === today ? snapshot.minimumMet : false,
    };
  }
  const local = await getLocalHabitState(today);
  return { currentStreak: local.streak.currentStreak, minimumMet: local.minimumMet };
}

/** The last reading, refreshed when it is stale and a location is known. */
async function loadWeather(
  settings: PrayerSettings | null,
  now: Date,
  allowFetch: boolean,
): Promise<WeatherSnapshot | null> {
  const stored = await keyValueStore.get<WeatherSnapshot>(storageKeys.lastWeather);
  const age = stored ? now.getTime() - Date.parse(stored.fetchedAt) : Infinity;
  if (!allowFetch || !settings?.coordinates || age < WEATHER_REFRESH_MS) return stored;

  const fresh = await withDeadline(
    fetchWeather(settings.coordinates, { notifyWidget: false }),
    WEATHER_FETCH_DEADLINE_MS,
    null,
  );
  return fresh ?? stored;
}

export interface LoadWidgetModelOptions {
  now?: Date;
  /** Off for the in-app preview, which should not spend a network request. */
  allowWeatherFetch?: boolean;
}

export async function loadWidgetModel(options: LoadWidgetModelOptions = {}): Promise<WidgetModel> {
  const now = options.now ?? new Date();
  const timezone = getDeviceTimezone();
  const today = todayLocalDate(timezone, now);

  const [storedLocale, storedPrayer] = await Promise.all([
    keyValueStore.get<string>(storageKeys.locale),
    keyValueStore.get<PrayerSettings>(storageKeys.lastPrayerSettings),
  ]);
  const locale: Locale = isLocale(storedLocale) ? storedLocale : 'en';

  const [habit, weather] = await Promise.all([
    loadHabit(today),
    loadWeather(storedPrayer, now, options.allowWeatherFetch ?? true),
  ]);

  const today0 = storedPrayer ? toDayTimes(storedPrayer, now, 0) : null;
  const times =
    storedPrayer && today0
      ? {
          yesterday: toDayTimes(storedPrayer, now, -1) ?? today0,
          today: today0,
          tomorrow: toDayTimes(storedPrayer, now, 1) ?? today0,
        }
      : null;

  const input: CardInput = {
    now,
    timezone,
    locale,
    times,
    weather: weather
      ? {
          condition: weather.condition,
          temperatureCelsius: weather.temperatureCelsius,
          fetchedAt: new Date(weather.fetchedAt),
        }
      : null,
    habit,
  };

  const card = resolveWidgetCard(input);
  logger.debug('widget.card', { kind: card.kind, scene: card.scene, occasion: card.occasionId });

  return {
    card,
    scene: card.scene,
    title: card.title,
    line: card.line,
    arabic: card.arabic,
    occasionId: card.occasionId,
    currentStreak: habit.currentStreak,
    minimumMet: habit.minimumMet,
    streakLabel: t('widget.streakLabel', { locale }),
    status: habit.minimumMet
      ? t('widget.readToday', { locale })
      : t('widget.callToAction', { locale }),
    changes: nextCardChanges(input),
  };
}

/**
 * Something to draw when nothing can be read — a fresh install, or storage
 * that has not answered. The clock alone decides the card.
 */
export function placeholderWidgetModel(now: Date = new Date()): WidgetModel {
  const input: CardInput = {
    now,
    timezone: getDeviceTimezone(),
    locale: 'en',
    times: null,
    weather: null,
    habit: { currentStreak: 0, minimumMet: false },
  };
  const card = resolveWidgetCard(input);
  return {
    card,
    scene: card.scene,
    title: card.title,
    line: card.line,
    arabic: card.arabic,
    occasionId: card.occasionId,
    currentStreak: 0,
    minimumMet: false,
    streakLabel: t('widget.streakLabel', { locale: 'en' }),
    status: t('widget.callToAction', { locale: 'en' }),
    changes: nextCardChanges(input),
  };
}
