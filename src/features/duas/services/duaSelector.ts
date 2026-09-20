/**
 * Choosing which dua to offer.
 *
 * The question here is "WHICH words fit this moment?" — never "should the user
 * be interrupted?" (that is `features/reminders`) and never "how is this
 * delivered?" (that is `features/notifications`). Keeping the three apart is
 * what stops notification logic sprawling, which spec §46 asks for explicitly.
 *
 * Pure throughout: the world arrives as a `DuaContext` argument, so every
 * branch below is reachable from a test without mocking a clock, the weather
 * or the sky.
 */
import { timeOfDayAt, toMinuteOfDay } from '@/lib/datetime/timeOfDay';

import { readyOccasions } from '../data/duaCatalogue';
import { isNewCrescentVisible } from '../utils/moonPhase';
import type { DuaContext, DuaOccasion, DuaTrigger } from '../types/dua.types';

/**
 * How specific a trigger is.
 *
 * A dua tied to rain on a Friday night should beat a generic "do you know the
 * dua for leaving the house?", because the specific one is the reason the
 * moment is worth interrupting at all. Counting matched conditions is a crude
 * but predictable way to express that, and it is easy to reason about when a
 * new occasion is added.
 */
export function triggerSpecificity(trigger: DuaTrigger): number {
  let score = 0;
  if (trigger.timesOfDay) score += 1;
  if (trigger.weather) score += 2;
  if (trigger.minTemperatureCelsius !== undefined) score += 2;
  if (trigger.maxTemperatureCelsius !== undefined) score += 2;
  if (trigger.weekdays) score += 2;
  if (trigger.newMoon) score += 3;
  if (trigger.requiresSleepSchedule) score += 3;
  return score;
}

/** Which hour band the instant falls into, in the user's own timezone. */
function currentTimeOfDay(context: DuaContext): 'morning' | 'afternoon' | 'evening' | 'night' {
  const time = timeOfDayAt(context.now, context.timezone);
  const minutes = toMinuteOfDay(time);
  if (minutes < 5 * 60) return 'night';
  if (minutes < 12 * 60) return 'morning';
  if (minutes < 17 * 60) return 'afternoon';
  if (minutes < 21 * 60) return 'evening';
  return 'night';
}

/**
 * The weekday in the user's timezone.
 *
 * `Date.getDay()` would answer for the device's zone, which is wrong for a
 * traveller whose profile timezone has not changed — and Friday being right is
 * the whole point of several entries here.
 */
function weekdayInTimezone(now: Date, timezone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(
    now,
  );
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.indexOf(name);
}

/** Whether every condition a trigger states is met. An empty trigger matches. */
export function matchesTrigger(trigger: DuaTrigger, context: DuaContext): boolean {
  if (trigger.timesOfDay && !trigger.timesOfDay.includes(currentTimeOfDay(context))) {
    return false;
  }

  if (trigger.weekdays) {
    const weekday = weekdayInTimezone(context.now, context.timezone);
    if (!trigger.weekdays.includes(weekday)) return false;
  }

  if (trigger.newMoon && !isNewCrescentVisible(context.now)) return false;

  if (trigger.requiresSleepSchedule && !context.sleepTime) return false;

  // Weather conditions can only be judged when weather is actually known. An
  // absent reading means "cannot tell", which must not be treated as a match —
  // otherwise a user who declined location would get rain duas on a clear day.
  const needsWeather =
    trigger.weather !== undefined ||
    trigger.minTemperatureCelsius !== undefined ||
    trigger.maxTemperatureCelsius !== undefined;

  if (needsWeather) {
    if (!context.weather) return false;
    const { condition, temperatureCelsius } = context.weather;
    if (trigger.weather && !trigger.weather.includes(condition)) return false;
    if (
      trigger.minTemperatureCelsius !== undefined &&
      temperatureCelsius < trigger.minTemperatureCelsius
    ) {
      return false;
    }
    if (
      trigger.maxTemperatureCelsius !== undefined &&
      temperatureCelsius > trigger.maxTemperatureCelsius
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Every occasion whose conditions currently hold, most specific first.
 *
 * Selects from `readyOccasions()` — entries that have real words — rather than
 * the whole catalogue, so a half-filled catalogue offers only what it can
 * actually show. `catalogue` is injectable so tests can supply a fixture
 * instead of depending on how much content happens to be filled in.
 */
export function eligibleOccasions(
  context: DuaContext,
  catalogue: readonly DuaOccasion[] = readyOccasions(),
): DuaOccasion[] {
  return catalogue
    .filter((occasion) => matchesTrigger(occasion.trigger, context))
    .sort((a, b) => triggerSpecificity(b.trigger) - triggerSpecificity(a.trigger));
}

/**
 * Picks one occasion, or null when nothing fits.
 *
 * `recentlyShownIds` is honoured first and relaxed only if it would leave
 * nothing at all: repeating a dua is a much smaller failure than a reminder
 * that arrives empty, and the everyday-actions group is finite enough that a
 * committed user will cycle through it.
 *
 * `randomSeed` is injected rather than calling Math.random so the choice is
 * reproducible in tests.
 */
export function selectOccasion(
  context: DuaContext,
  randomSeed = Math.random(),
  catalogue: readonly DuaOccasion[] = readyOccasions(),
): DuaOccasion | null {
  const eligible = eligibleOccasions(context, catalogue);
  if (eligible.length === 0) return null;

  const unseen = eligible.filter((occasion) => !context.recentlyShownIds.includes(occasion.id));
  const pool = unseen.length > 0 ? unseen : eligible;

  // Everything sharing the top specificity is equally apt, so choose among
  // those at random. Without this the same Friday dua would arrive every week.
  const topScore = triggerSpecificity(pool[0]!.trigger);
  const contenders = pool.filter((occasion) => triggerSpecificity(occasion.trigger) === topScore);

  const index = Math.floor(randomSeed * contenders.length) % contenders.length;
  return contenders[index] ?? null;
}
