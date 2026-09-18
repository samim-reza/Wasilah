/**
 * Reading milestones.
 *
 * Deliberately modest in both design and language. These mark activity in an
 * app — how much has been read, how many days in a row — and nothing more.
 * There is no score, no ranking and no implication of spiritual merit, because
 * assigning points to worship is not something software should do.
 */
import { quranStructure } from '@/config/quran';
import { supabase } from '@/lib/supabase/client';
import { fromPostgrestError } from '@/lib/supabase/errors';

export type AchievementKind = 'verses' | 'juz' | 'streak';

export interface AchievementDefinition {
  key: string;
  kind: AchievementKind;
  threshold: number;
  /** i18n key for the title, with `count` interpolated. */
  labelKey: string;
}

/** Roughly how many ayahs make up one juz, used for the juz milestones. */
const VERSES_PER_JUZ = Math.round(quranStructure.verseCount / quranStructure.juzCount);

export const achievementDefinitions: readonly AchievementDefinition[] = [
  { key: 'verses_10', kind: 'verses', threshold: 10, labelKey: 'achievements.ayahsTitle' },
  { key: 'verses_50', kind: 'verses', threshold: 50, labelKey: 'achievements.ayahsTitle' },
  { key: 'verses_100', kind: 'verses', threshold: 100, labelKey: 'achievements.ayahsTitle' },
  { key: 'verses_500', kind: 'verses', threshold: 500, labelKey: 'achievements.ayahsTitle' },
  { key: 'verses_1000', kind: 'verses', threshold: 1000, labelKey: 'achievements.ayahsTitle' },

  { key: 'juz_1', kind: 'juz', threshold: VERSES_PER_JUZ, labelKey: 'achievements.juzTitle' },
  { key: 'juz_5', kind: 'juz', threshold: VERSES_PER_JUZ * 5, labelKey: 'achievements.juzTitle' },
  { key: 'juz_10', kind: 'juz', threshold: VERSES_PER_JUZ * 10, labelKey: 'achievements.juzTitle' },
  {
    key: 'juz_30',
    kind: 'juz',
    threshold: quranStructure.verseCount,
    labelKey: 'achievements.juzTitle',
  },

  { key: 'streak_7', kind: 'streak', threshold: 7, labelKey: 'achievements.streakTitle' },
  { key: 'streak_30', kind: 'streak', threshold: 30, labelKey: 'achievements.streakTitle' },
  { key: 'streak_100', kind: 'streak', threshold: 100, labelKey: 'achievements.streakTitle' },
  { key: 'streak_365', kind: 'streak', threshold: 365, labelKey: 'achievements.streakTitle' },
];

export interface AchievementProgress {
  totalVersesRead: number;
  currentStreak: number;
  longestStreak: number;
}

function isReached(definition: AchievementDefinition, progress: AchievementProgress): boolean {
  switch (definition.kind) {
    case 'verses':
    case 'juz':
      return progress.totalVersesRead >= definition.threshold;
    case 'streak':
      // The best streak ever counts, so a milestone reached last month is not
      // taken away by a missed day.
      return Math.max(progress.currentStreak, progress.longestStreak) >= definition.threshold;
  }
}

/** Every milestone reached at this level of progress. */
export function reachedAchievements(progress: AchievementProgress): string[] {
  return achievementDefinitions
    .filter((definition) => isReached(definition, progress))
    .map((definition) => definition.key);
}

/**
 * Milestones reached at this progress but not at the previous one.
 *
 * The caller passes the state AFTER the reading; comparing against the
 * definitions rather than against stored rows keeps this pure and testable.
 */
export function checkNewAchievements(
  progress: AchievementProgress,
  alreadyUnlocked: readonly string[] = [],
): string[] {
  const unlocked = new Set(alreadyUnlocked);
  return reachedAchievements(progress).filter((key) => !unlocked.has(key));
}

export async function persistAchievements(keys: readonly string[]): Promise<void> {
  for (const key of keys) {
    const { error } = await supabase.rpc('unlock_achievement', { p_achievement_key: key });
    if (error) throw fromPostgrestError(error, { key });
  }
}

export async function fetchUnlockedAchievements(userId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('achievements')
    .select('achievement_key, unlocked_at')
    .eq('user_id', userId);

  if (error) throw fromPostgrestError(error, { userId });

  const unlocked: Record<string, string> = {};
  for (const row of data ?? []) unlocked[row.achievement_key] = row.unlocked_at;
  return unlocked;
}
