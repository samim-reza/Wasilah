import type { DuaOccasion } from '@/features/duas/types/dua.types';

/**
 * A catalogue with real content, for tests.
 *
 * The shipped catalogue holds only placeholders, and the selector deliberately
 * ignores those — so testing selection against it would assert nothing. These
 * fixtures mirror the shape and trigger variety of the real entries without
 * depending on how much content happens to be filled in on any given day.
 */
function text(source: string) {
  return {
    arabic: 'اللهم',
    transliteration: 'Allahumma',
    translation: 'O Allah',
    benefit: '',
    source,
  };
}

export const fixtureCatalogue: readonly DuaOccasion[] = [
  {
    id: 'rain-falling',
    group: 'sky_and_weather',
    title: 'When it rains',
    prompt: 'It is raining.',
    trigger: { weather: ['rain'] },
    imagery: 'rain',
    text: text('Sahih al-Bukhari 1032'),
  },
  {
    id: 'friday',
    group: 'calendar',
    title: 'Friday',
    prompt: 'It is Friday.',
    trigger: { weekdays: [5] },
    imagery: 'mosque',
    text: text('Sunan Abi Dawud 1047'),
  },
  {
    id: 'morning-adhkar',
    group: 'daily_rhythm',
    title: 'Morning remembrance',
    prompt: 'The morning words.',
    trigger: { timesOfDay: ['morning'] },
    imagery: 'dawn',
    text: text('Sahih Muslim 2723'),
  },
  {
    id: 'before-sleep',
    group: 'daily_rhythm',
    title: 'Before sleeping',
    prompt: 'Before you sleep.',
    trigger: { requiresSleepSchedule: true },
    imagery: 'night',
    text: text('Sahih al-Bukhari 6324'),
  },
  {
    id: 'leaving-home',
    group: 'everyday_actions',
    title: 'Leaving the house',
    prompt: 'Do you know the dua for leaving the house?',
    trigger: {},
    imagery: 'none',
    text: text('Sunan Abi Dawud 5095'),
  },
  {
    id: 'entering-home',
    group: 'everyday_actions',
    title: 'Entering the house',
    prompt: 'Do you know the dua for coming home?',
    trigger: {},
    imagery: 'none',
    text: text('Sunan Abi Dawud 5096'),
  },
];
