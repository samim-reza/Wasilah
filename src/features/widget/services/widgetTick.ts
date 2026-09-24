/**
 * What happens every time the widget wakes — whether Android, an alarm, or
 * the app asked.
 *
 * Three things, always in this order:
 *
 *   1. Set the alarms for the next changes of the card, so the next wake-up
 *      lands on the minute the sunset card should appear, not thirty minutes
 *      later.
 *   2. Raise the weather alert if the sky has just turned — it has started
 *      raining, it is dangerously hot — and this alert has not been raised
 *      in the last several hours. A long rain is one alert, not one per tick.
 *   3. Nothing else. Drawing is the caller's business, because the app and
 *      the headless task draw differently.
 *
 * Runs in the headless task, so: no React, no navigation, nothing thrown.
 */
import { findOccasion } from '@/features/duas/data/duaCatalogue';
import { buildDuaNotification } from '@/features/duas/utils/duaNotification';
import { presentNow } from '@/features/notifications/services/localNotificationService';
import { getPermissionState } from '@/features/notifications/services/notificationService';
import { logger } from '@/lib/monitoring/logger';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { WidgetAlarm } from '@modules/widget-alarm';

import type { WidgetModel } from './widgetModel';

/** The same weather alert is not repeated within this long. */
const WEATHER_ALERT_COOLDOWN_MS = 6 * 3_600_000;

type WeatherAlertLog = Record<string, string>;

async function raiseWeatherAlert(model: WidgetModel, now: Date): Promise<void> {
  const { card } = model;
  if (card.kind !== 'weather' || !card.occasionId) return;

  const log = (await keyValueStore.get<WeatherAlertLog>(storageKeys.weatherAlerts)) ?? {};
  const last = log[card.occasionId] ? Date.parse(log[card.occasionId]!) : 0;
  if (now.getTime() - last < WEATHER_ALERT_COOLDOWN_MS) return;

  const permission = await getPermissionState();
  if (permission.status !== 'granted') return;

  const occasion = findOccasion(card.occasionId);
  if (!occasion) return;

  const identifier = await presentNow(buildDuaNotification(occasion));
  if (identifier) {
    await keyValueStore.set(storageKeys.weatherAlerts, {
      ...log,
      [card.occasionId]: now.toISOString(),
    });
    logger.info('widget.weatherAlert', { occasion: card.occasionId });
  }
}

export async function runWidgetTick(model: WidgetModel, now: Date = new Date()): Promise<void> {
  try {
    if (WidgetAlarm.isAvailable) {
      WidgetAlarm.schedule(model.changes);
    }
  } catch (error) {
    logger.warn('widget.alarmScheduleFailed', { error });
  }

  try {
    await raiseWeatherAlert(model, now);
  } catch (error) {
    logger.warn('widget.weatherAlertFailed', { error });
  }
}
