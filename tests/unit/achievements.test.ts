import {
  achievementDefinitions,
  checkNewAchievements,
  reachedAchievements,
} from '@/features/streak/utils/achievements';

describe('reachedAchievements', () => {
  it('is empty for a new user', () => {
    expect(reachedAchievements({ totalVersesRead: 0, currentStreak: 0, longestStreak: 0 })).toEqual(
      [],
    );
  });

  it('includes every threshold at or below the total', () => {
    const reached = reachedAchievements({
      totalVersesRead: 120,
      currentStreak: 0,
      longestStreak: 0,
    });

    expect(reached).toContain('verses_10');
    expect(reached).toContain('verses_50');
    expect(reached).toContain('verses_100');
    expect(reached).not.toContain('verses_500');
  });

  it('keeps a streak milestone after the streak lapses', () => {
    // Reaching 30 days once is a fact about the past; a missed day since then
    // does not undo it.
    const reached = reachedAchievements({
      totalVersesRead: 0,
      currentStreak: 0,
      longestStreak: 30,
    });

    expect(reached).toContain('streak_7');
    expect(reached).toContain('streak_30');
  });
});

describe('checkNewAchievements', () => {
  it('reports only what is newly reached', () => {
    const fresh = checkNewAchievements(
      { totalVersesRead: 60, currentStreak: 0, longestStreak: 0 },
      ['verses_10'],
    );

    expect(fresh).toEqual(['verses_50']);
  });

  it('reports nothing when everything is already unlocked', () => {
    const all = reachedAchievements({
      totalVersesRead: 60,
      currentStreak: 0,
      longestStreak: 0,
    });

    expect(
      checkNewAchievements({ totalVersesRead: 60, currentStreak: 0, longestStreak: 0 }, all),
    ).toEqual([]);
  });
});

describe('achievementDefinitions', () => {
  it('has unique keys', () => {
    const keys = achievementDefinitions.map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has a translation key for every milestone', () => {
    for (const definition of achievementDefinitions) {
      expect(definition.labelKey).toMatch(/^achievements\./);
    }
  });
});
