/**
 * Progress.
 *
 * Calm by design. It reports what has happened — days completed, ayahs read,
 * time spent — and stops there. No comparison to other people, no projections,
 * no pressure.
 */
import { useState } from 'react';
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
import { useProgressCalendar } from '@/features/streak/hooks/useProgressCalendar';
import { achievementDefinitions, reachedAchievements } from '@/features/streak/utils/achievements';
import { addLocalDays, startOfLocalMonth } from '@/lib/datetime/localDate';
import { useLocalDate } from '@/lib/datetime/useLocalDate';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function ProgressScreen() {
  const { t } = useTranslation();
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

  const unlocked = new Set(
    reachedAchievements({
      totalVersesRead: habit.streak.totalVersesRead,
      currentStreak: habit.currentStreak,
      longestStreak: habit.streak.longestStreak,
    }),
  );

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
            {achievementDefinitions.map((definition) => {
              const isUnlocked = unlocked.has(definition.key);
              const count =
                definition.kind === 'juz'
                  ? Math.round(definition.threshold / 207)
                  : definition.threshold;

              return (
                <View
                  key={definition.key}
                  className={`rounded-full px-3 py-1.5 ${
                    isUnlocked ? 'bg-primary-muted' : 'bg-surface-muted'
                  }`}
                  accessible
                  accessibilityLabel={`${t(definition.labelKey, { count })}, ${
                    isUnlocked ? 'reached' : t('achievements.locked')
                  }`}
                >
                  <Text
                    variant="caption"
                    className={isUnlocked ? 'font-semibold text-primary' : 'text-content-subtle'}
                  >
                    {t(definition.labelKey, { count })}
                  </Text>
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
