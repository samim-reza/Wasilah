/**
 * Everything the widget draws, gathered from what the device already holds.
 *
 * Runs in the headless widget task as well as in the app, so it must not
 * touch React, navigation, the theme or the network. It reads the local
 * habit store, the stored locale, and the last weather reading and prayer
 * settings the app wrote down, then asks `widgetScene` what that adds up to.
 *
 * Every read is optional except the streak: a device with no location has no
 * sun times and no weather, and the widget simply follows the clock.
 */
import { hasRealContent } from '@/features/duas/data/duaCatalogue';
import { calculatePrayerTimes } from '@/features/prayer/services/prayerTimeService';
import type { PrayerSettings } from '@/features/prayer/types/prayer.types';
import { getLocalHabitState } from '@/features/streak/services/localHabitStore';
import type { WeatherSnapshot } from '@/features/weather/types/weather.types';
import { getDeviceTimezone, todayLocalDate } from '@/lib/datetime/localDate';
import { supportedLocales, t, type Locale } from '@/lib/i18n';
import { logger } from '@/lib/monitoring/logger';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import { resolveWidgetScene, type SunTimes, type WidgetScene } from './widgetScene';

export interface WidgetModel {
  scene: WidgetScene;
  /** Small label at the top: the occasion, or the app's name on an ordinary hour. */
  title: string;
  /** The line under it: the dua's meaning, its prompt, or the call to action. */
  line: string;
  /** The dua in Arabic, only once the catalogue entry has sourced words. */
  arabic: string | null;
  /** For the tap-through deep link; null when there is no occasion. */
  occasionId: string | null;
  currentStreak: number;
  minimumMet: boolean;
  streakLabel: string;
  status: string;
}

/** A weather reading older than this says nothing about the sky now. */
const WEATHER_FRESH_MS = 3 * 60 * 60_000;

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (supportedLocales as readonly string[]).includes(value);
}

/**
 * Something to draw when nothing can be read — a fresh install, or storage
 * that has not answered. Shows the app's name and an invitation, never an
 * error, because this is on the user's home screen.
 */
export function placeholderWidgetModel(now: Date = new Date()): WidgetModel {
  const timezone = getDeviceTimezone();
  const { scene } = resolveWidgetScene({ now, timezone });
  return {
    scene,
    title: t('widget.appName', { locale: 'en' }),
    line: t('widget.callToAction', { locale: 'en' }),
    arabic: null,
    occasionId: null,
    currentStreak: 0,
    minimumMet: false,
    streakLabel: t('widget.streakLabel', { locale: 'en' }),
    status: '',
  };
}

export async function loadWidgetModel(now: Date = new Date()): Promise<WidgetModel> {
  const timezone = getDeviceTimezone();
  const today = todayLocalDate(timezone, now);

  const [habit, storedLocale, storedWeather, storedPrayer] = await Promise.all([
    getLocalHabitState(today),
    keyValueStore.get<string>(storageKeys.locale),
    keyValueStore.get<WeatherSnapshot>(storageKeys.lastWeather),
    keyValueStore.get<PrayerSettings>(storageKeys.lastPrayerSettings),
  ]);

  const locale: Locale = isLocale(storedLocale) ? storedLocale : 'en';

  const weather =
    storedWeather && now.getTime() - Date.parse(storedWeather.fetchedAt) < WEATHER_FRESH_MS
      ? { condition: storedWeather.condition, temperatureCelsius: storedWeather.temperatureCelsius }
      : null;

  let sun: SunTimes | null = null;
  if (storedPrayer?.coordinates) {
    const times = calculatePrayerTimes(storedPrayer.coordinates, now, storedPrayer);
    if (times) sun = { fajr: times.fajr, sunrise: times.sunrise, maghrib: times.maghrib };
  }

  const { scene, occasion } = resolveWidgetScene({ now, timezone, weather, sun });

  if (occasion) {
    logger.debug('widget.occasion', { id: occasion.id, scene });
  }

  const real = occasion ? hasRealContent(occasion) : false;

  return {
    scene,
    title: occasion ? occasion.title : t('widget.appName', { locale }),
    line: occasion
      ? real
        ? occasion.text.translation
        : occasion.prompt
      : t('widget.callToAction', { locale }),
    arabic: occasion && real ? occasion.text.arabic : null,
    occasionId: occasion?.id ?? null,
    currentStreak: habit.streak.currentStreak,
    minimumMet: habit.minimumMet,
    streakLabel: t('widget.streakLabel', { locale }),
    status: habit.minimumMet
      ? t('widget.readToday', { locale })
      : t('widget.callToAction', { locale }),
  };
}
