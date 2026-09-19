/**
 * Lunar phase, calculated locally.
 *
 * No API and no network: the synodic month is regular enough that a mean-phase
 * calculation is accurate to a few hours, which is far finer than anything this
 * app needs. That also keeps the feature working offline and adds no new
 * third-party dependency for a single number.
 *
 * Note this is the ASTRONOMICAL new moon (conjunction), which is invisible. The
 * crescent that is actually sighted appears a day or more later, which is why
 * `isNewCrescentVisible` deliberately excludes the conjunction itself.
 */

/** Mean length of one lunation, in days. */
const SYNODIC_MONTH_DAYS = 29.530588853;

/** A known new moon: 2000-01-06 18:14 UTC. */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

const MS_PER_DAY = 86_400_000;

/**
 * Days elapsed since the last conjunction, in the range [0, 29.53).
 *
 * 0 is the new moon, ~14.8 is the full moon.
 */
export function moonAgeDays(now: Date): number {
  const elapsedDays = (now.getTime() - REFERENCE_NEW_MOON_MS) / MS_PER_DAY;
  const age = elapsedDays % SYNODIC_MONTH_DAYS;
  // JavaScript's % keeps the sign of the dividend, so dates before the
  // reference epoch would otherwise produce a negative age.
  return age < 0 ? age + SYNODIC_MONTH_DAYS : age;
}

/**
 * Fraction of the disc lit, from 0 (new) to 1 (full).
 *
 * The mean phase angle is good enough here; the small libration and orbital
 * eccentricity corrections would change the third decimal place.
 */
export function moonIllumination(now: Date): number {
  const phase = moonAgeDays(now) / SYNODIC_MONTH_DAYS;
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

/**
 * Earliest the crescent is realistically visible after conjunction, in days.
 *
 * Under ~20 hours the crescent is too thin and too close to the sun to see
 * with the naked eye in ordinary conditions.
 */
const CRESCENT_MIN_AGE_DAYS = 0.9;

/** Beyond this the moon reads as an ordinary waxing crescent, not a new month. */
const CRESCENT_MAX_AGE_DAYS = 3.5;

/**
 * Whether tonight plausibly shows a new crescent.
 *
 * Deliberately a window rather than an instant: sighting depends on the
 * observer's latitude, horizon and weather, none of which this app models. A
 * generous window is honest about that, where a precise answer would not be.
 */
export function isNewCrescentVisible(now: Date): boolean {
  const age = moonAgeDays(now);
  return age >= CRESCENT_MIN_AGE_DAYS && age <= CRESCENT_MAX_AGE_DAYS;
}
