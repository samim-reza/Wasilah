/**
 * Notification content engine.
 *
 * Copy never appears inline in delivery code. Templates are separate, named and
 * translated, which means: wording can be tuned without touching scheduling
 * logic, every string goes through i18n, and the same template can be rendered
 * for a local notification or a server push.
 *
 * Each template also owns its deep link, so "what it says" and "where it goes"
 * stay together.
 */
import { t } from '@/lib/i18n';

import { routes } from '../utils/notificationRouting';
import { getCachedTemplate } from './remoteTemplates';
import type { NotificationTemplate, TemplateVariables } from './types';

/** Chooses morning/evening wording when the caller did not specify. */
function resolveTimeOfDay(variables: TemplateVariables): TemplateVariables['timeOfDay'] {
  if (variables.timeOfDay) return variables.timeOfDay;

  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 16) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

const dailyReminder: NotificationTemplate = {
  key: 'dailyReminder',
  category: 'daily_reminder',
  build: (variables) => {
    const timeOfDay = resolveTimeOfDay(variables);

    // Morning and night get their own voice; the rest share the neutral copy.
    const scope =
      timeOfDay === 'morning'
        ? 'notifications.dailyReminderMorning'
        : timeOfDay === 'night'
          ? 'notifications.dailyReminderEvening'
          : 'notifications.dailyReminder';

    return {
      title: t(`${scope}.title`),
      body: t(`${scope}.body`),
      data: { category: 'daily_reminder', templateKey: 'dailyReminder', route: routes.todaysAyah },
    };
  },
};

const goalReminder: NotificationTemplate = {
  key: 'goalReminder',
  category: 'goal_reminder',
  build: (variables) => {
    const remaining = variables.remainingVerses ?? 0;
    // Nothing left to do means nothing to say.
    if (remaining <= 0) return null;

    return {
      title: t('notifications.goalReminder.title'),
      body: t('notifications.goalReminder.body', { count: remaining }),
      data: {
        category: 'goal_reminder',
        templateKey: 'goalReminder',
        route: routes.continueReading,
      },
    };
  },
};

const streakReminder: NotificationTemplate = {
  key: 'streakReminder',
  category: 'streak_reminder',
  build: (variables) => {
    const streakDays = variables.streakDays ?? 0;
    // A "0-day streak is waiting" message would be nonsense.
    if (streakDays < 1) return null;

    return {
      title: t('notifications.streakReminder.title', { count: streakDays }),
      body: t('notifications.streakReminder.body'),
      data: {
        category: 'streak_reminder',
        templateKey: 'streakReminder',
        route: routes.todaysAyah,
      },
    };
  },
};

const todaysAyah: NotificationTemplate = {
  key: 'todaysAyah',
  category: 'todays_ayah',
  build: (variables) => ({
    title: t('notifications.todaysAyah.title'),
    body: variables.ayahReference
      ? t('notifications.todaysAyah.body', { reference: variables.ayahReference })
      : t('notifications.dailyReminder.body'),
    data: { category: 'todays_ayah', templateKey: 'todaysAyah', route: routes.todaysAyah },
  }),
};

const prayerReminder: NotificationTemplate = {
  key: 'prayerReminder',
  category: 'prayer_reminder',
  build: (variables) => {
    if (!variables.prayerName) return null;

    return {
      title: t('notifications.prayerReminder.title', { prayer: variables.prayerName }),
      body: t('notifications.prayerReminder.body'),
      data: {
        category: 'prayer_reminder',
        templateKey: 'prayerReminder',
        route: routes.todaysAyah,
      },
    };
  },
};

/**
 * Weather only changes the tone of the invitation.
 *
 * It never claims a weather event carries religious meaning — there is no
 * authoritative basis for that, and implying it would be a serious overstep for
 * a Quran app.
 */
const weatherReminder: NotificationTemplate = {
  key: 'weatherReminder',
  category: 'weather_reminder',
  build: (variables) => {
    const condition = variables.weatherCondition;
    if (!condition) return null;

    // Only the wet conditions get their own phrasing; everything else shares
    // the neutral morning wording.
    const isWet = condition === 'rain' || condition === 'snow' || condition === 'storm';
    const titleKey = isWet
      ? 'notifications.weatherReminder.titleRain'
      : 'notifications.weatherReminder.titleClear';

    return {
      title: t(titleKey),
      body: t('notifications.weatherReminder.body'),
      data: {
        category: 'weather_reminder',
        templateKey: 'weatherReminder',
        route: routes.todaysAyah,
      },
    };
  },
};

const templates: Record<string, NotificationTemplate> = {
  [dailyReminder.key]: dailyReminder,
  [goalReminder.key]: goalReminder,
  [streakReminder.key]: streakReminder,
  [todaysAyah.key]: todaysAyah,
  [prayerReminder.key]: prayerReminder,
  [weatherReminder.key]: weatherReminder,
};

export type TemplateKey = keyof typeof templates;

export function renderTemplate(key: string, variables: TemplateVariables = {}) {
  const content = templates[key]?.build(variables);
  if (!content) return null;

  // A remote row overrides the WORDING only. Category and route come from the
  // shipped template, so a server row cannot redirect a notification or
  // reclassify it onto a channel the user muted something else on.
  const override = getCachedTemplate(key);
  if (!override) return content;

  return {
    ...content,
    title: interpolate(override.title, variables),
    body: interpolate(override.body, variables),
  };
}

/**
 * Fills `{{name}}` placeholders in remote copy.
 *
 * Deliberately minimal: an unknown placeholder is left as written rather than
 * replaced with "undefined", so a mistake in a server row looks like a mistake
 * instead of looking like a bug in the app.
 */
function interpolate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = (variables as Record<string, unknown>)[name];
    return value === undefined || value === null ? match : String(value);
  });
}

export function getTemplate(key: string): NotificationTemplate | undefined {
  return templates[key];
}

export const templateKeys = Object.keys(templates);
