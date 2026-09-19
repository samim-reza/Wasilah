/**
 * Progress.
 *
 * Calm by design. It reports what has happened — days completed, ayahs read,
 * time spent — and stops there. No comparison to other people, no projections,
 * no pressure.
 */
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { ReadingCalendar } from '@/features/streak/components/ReadingCalendar';
import { StatTile } from '@/features/streak/components/StatTile';
import { useHabitState } from '@/features/streak/hooks/useHabitState';
import { useAchievements } from '@/features/streak/hooks/useAchievements';
import { useProgressCalendar } from '@/features/streak/hooks/useProgressCalendar';
import { addLocalDays, startOfLocalMonth } from '@/lib/datetime/localDate';
import { useLocalDate } from '@/lib/datetime/useLocalDate';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function ProgressScreen() {
  const { t, locale } = useTranslation();
  const { today } = useLocalDate();
  const habit = useHabitState();

  const [month, setMonth] = useState(() => startOfLocalMonth(today));
  const calendar = useProgressCalendar(month);

  const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const hours = Math.floor(habit.streak.totalSecondsRead / 3600);
  const minutes = Math.round((habit.streak.totalSecondsRead % 3600) / 60);
  const readingTime =
    hours > 0
      ? t('progress.hoursShort', { count: hours })
      : t('progress.minutesShort', { count: minutes });

  const achievements = useAchievements({
    totalVersesRead: habit.streak.totalVersesRead,
    currentStreak: habit.currentStreak,
    longestStreak: habit.streak.longestStreak,
  });

  // Record anything earned while offline, or before signing in. Idempotent, and
  // a no-op once everything reached is already stored.
  useEffect(() => {
    void achievements.reconcile();
  }, [achievements]);

  return (
    <Screen noPadding>
      <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
        <Text variant="heading" className="pt-3" accessibilityRole="header">
          {t('progress.title')}
        </Text>

        <View className="flex-row gap-2">
          <StatTile
            icon="streak"
            label={t('streak.current')}
            value={String(habit.currentStreak)}
            tone="accent"
          />
          <StatTile
            icon="trophy"
            label={t('streak.longest')}
            value={String(habit.streak.longestStreak)}
            tone="primary"
          />
        </View>

        <View className="flex-row gap-2">
          <StatTile
            icon="quran"
            label={t('progress.ayahsRead')}
            value={String(habit.streak.totalVersesRead)}
          />
          <StatTile icon="clock" label={t('progress.readingTime')} value={readingTime} />
        </View>

        <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold">{t('progress.calendar')}</Text>

            <View className="flex-row items-center">
              <IconButton
                name="back"
                size={18}
                onPress={() => setMonth(startOfLocalMonth(addLocalDays(month, -1)))}
                accessibilityLabel="Previous month"
              />
              <Text variant="caption" tone="muted" className="w-20 text-center tabular-nums">
                {month.slice(0, 7)}
              </Text>
              <IconButton
                name="forward"
                size={18}
                // Future months hold nothing to show.
                disabled={month >= startOfLocalMonth(today)}
                onPress={() => setMonth(startOfLocalMonth(addLocalDays(month, 32)))}
                accessibilityLabel="Next month"
              />
            </View>
          </View>

          {calendar.isLoading ? (
            <Skeleton height={200} radius={12} />
          ) : calendar.error ? (
            <ErrorState error={calendar.error} onRetry={() => void calendar.refetch()} compact />
          ) : (
            <ReadingCalendar
              month={month}
              today={today}
              weekdayLabels={weekdayLabels}
              entries={(calendar.data ?? []).map((day) => ({
                date: day.date,
                minimumMet: day.minimumMet,
                goalMet: day.goalMet,
              }))}
            />
          )}
        </Card>

        <Card className="gap-3">
          <Text className="font-semibold">{t('progress.achievements')}</Text>

          <View className="flex-row flex-wrap gap-2">
            {achievements.achievements.map(({ definition, reached, unlockedAt }) => {
              const count =
                definition.kind === 'juz'
                  ? Math.round(definition.threshold / 207)
                  : definition.threshold;
              const label = t(definition.labelKey, { count });

              // The date is the meaningful half — "100 ayahs" is a number,
              // "reached on 4 March" is a memory. Shown when we have it.
              const reachedOn = unlockedAt
                ? t('achievements.unlockedOn', {
                    date: new Date(unlockedAt).toLocaleDateString(locale),
                  })
                : null;

              return (
                <View
                  key={definition.key}
                  className={`rounded-full px-3 py-1.5 ${
                    reached ? 'bg-primary-muted' : 'bg-surface-muted'
                  }`}
                  accessible
                  accessibilityLabel={`${label}, ${reachedOn ?? (reached ? 'reached' : t('achievements.locked'))}`}
                >
                  <Text
                    variant="caption"
                    className={reached ? 'font-semibold text-primary' : 'text-content-subtle'}
                  >
                    {label}
                  </Text>
                  {reachedOn && (
                    <Text variant="caption" tone="subtle" className="text-[10px]">
                      {reachedOn}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          <Text variant="caption" tone="subtle">
            {t('achievements.disclaimer')}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
