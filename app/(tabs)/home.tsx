/**
 * Home — the heart of the app.
 *
 * Ordered by what the user most likely came to do: read today's ayah, see that
 * today is (or is not) done, and get back to where they were. Everything else
 * is deliberately below the fold. The screen is not a dashboard.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Text } from '@/components/ui/Text';
import { useAudio } from '@/features/audio/hooks/AudioPlayerProvider';
import { useAyahPlayback } from '@/features/audio/hooks/useAyahAudio';
import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { useBookmarks } from '@/features/bookmarks/hooks/useBookmarks';
import { ContinueReadingCard } from '@/features/home/components/ContinueReadingCard';
import { DailyGoalCard } from '@/features/home/components/DailyGoalCard';
import { GreetingHeader } from '@/features/home/components/GreetingHeader';
import { TodaysAyahCard } from '@/features/home/components/TodaysAyahCard';
import { useDailyAyah } from '@/features/home/hooks/useDailyAyah';
import { useChapters } from '@/features/quran/hooks/useChapters';
import { useResolvedTranslationIds } from '@/features/quran/hooks/useResolvedTranslations';
import { useReaderPreferences } from '@/features/reader/hooks/useReaderPreferences';
import { useReadingPosition } from '@/features/reader/hooks/useReadingPosition';
import { useHabitState } from '@/features/streak/hooks/useHabitState';
import { useRecordReading } from '@/features/streak/hooks/useRecordReading';
import { shareVerse } from '@/features/quran/services/shareService';
import { trackEvent } from '@/lib/analytics/analytics';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const params = useLocalSearchParams<{ focus?: string }>();

  const habit = useHabitState();
  const { preferences } = useReaderPreferences();
  const { position } = useReadingPosition();
  const { data: chapters } = useChapters();
  const bookmarks = useBookmarks();
  const audio = useAudio();
  const recordReading = useRecordReading();

  const translationIds = useResolvedTranslationIds(preferences.translationIds);
  const dailyAyah = useDailyAyah({ translationIds });
  const { playAyah } = useAyahPlayback(preferences.recitationId);

  const positionChapter = useMemo(
    () => chapters?.find((chapter) => chapter.id === position?.chapterId),
    [chapters, position?.chapterId],
  );

  const handleContinueReading = useCallback(() => {
    if (position) {
      router.push(`/quran/${position.chapterId}?ayah=${position.verseNumber}`);
      return;
    }
    // Nothing read yet: Al-Fatihah is the natural place to begin.
    router.push('/quran/1');
  }, [position]);

  const handleOpenTodaysAyah = useCallback(() => {
    if (!dailyAyah.selection) return;
    router.push(`/quran/${dailyAyah.selection.chapterId}?ayah=${dailyAyah.selection.verseNumber}`);
  }, [dailyAyah.selection]);

  /**
   * Completing the day from the home screen.
   *
   * Recorded as a genuine one-ayah session rather than a special "mark done"
   * flag, so the habit engine has a single notion of what reading is and the
   * streak, totals and history all stay consistent.
   */
  const handleMarkAsRead = useCallback(async () => {
    if (!dailyAyah.selection) return;

    const startedAt = new Date(Date.now() - 20_000);
    const result = await recordReading({
      startedAt,
      endedAt: new Date(),
      versesRead: 1,
      chapterId: dailyAyah.selection.chapterId,
      startVerse: dailyAyah.selection.verseNumber,
      endVerse: dailyAyah.selection.verseNumber,
      source: 'daily_ayah',
    });

    trackEvent('todays_ayah_completed', {});

    if (result.completedMinimum) {
      toast.show(t('streak.extended'), { tone: 'success', icon: 'streak' });
    } else {
      toast.show(t('home.markedAsRead'), { icon: 'check' });
    }
  }, [dailyAyah.selection, recordReading, toast, t]);

  const handleBookmark = useCallback(async () => {
    if (!dailyAyah.selection) return;
    const added = await bookmarks.toggle(dailyAyah.selection.verseKey);
    toast.show(added ? t('bookmarks.added') : t('bookmarks.removed'), { icon: 'bookmark' });
  }, [dailyAyah.selection, bookmarks, toast, t]);

  const handleShare = useCallback(async () => {
    if (!dailyAyah.verse) return;
    await shareVerse(dailyAyah.verse, dailyAyah.chapter?.nameSimple);
  }, [dailyAyah.verse, dailyAyah.chapter]);

  const handlePlay = useCallback(async () => {
    if (!dailyAyah.selection) return;

    if (audio.currentTrack?.verseKey === dailyAyah.selection.verseKey) {
      audio.toggle();
      return;
    }
    await playAyah(dailyAyah.selection.verseKey);
  }, [dailyAyah.selection, audio, playAyah]);

  if (habit.error && !habit.isLoading) {
    return (
      <Screen>
        <ErrorState error={habit.error} onRetry={() => void habit.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen noPadding>
      <ScrollView
        contentContainerClassName="px-4 pb-8 gap-3"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void habit.refetch()} />
        }
        // The deep link from a notification can ask for a particular card; the
        // list is short enough that scrolling to the top is the right response.
        contentInsetAdjustmentBehavior="automatic"
      >
        <GreetingHeader
          displayName={(user?.user_metadata?.['display_name'] as string | undefined) ?? null}
          streakDays={habit.currentStreak}
          streakStatus={habit.status}
        />

        <TodaysAyahCard
          verse={dailyAyah.verse}
          chapterName={dailyAyah.chapter?.nameSimple}
          isLoading={dailyAyah.isLoading}
          arabicFontSize={preferences.arabicFontSize}
          translationFontSize={preferences.translationFontSize}
          languageCode={preferences.translationIds[0] === 161 ? 'bn' : 'en'}
          isBookmarked={
            dailyAyah.selection ? bookmarks.isBookmarked(dailyAyah.selection.verseKey) : false
          }
          isPlaying={
            audio.state === 'playing' &&
            audio.currentTrack?.verseKey === dailyAyah.selection?.verseKey
          }
          completed={habit.minimumMet}
          onPlay={() => void handlePlay()}
          onBookmark={() => void handleBookmark()}
          onShare={() => void handleShare()}
          onMarkAsRead={() => void handleMarkAsRead()}
          onOpenInReader={handleOpenTodaysAyah}
        />

        <DailyGoalCard
          goal={habit.goal}
          totals={habit.todayTotals}
          completionRatio={habit.completionRatio}
          minimumMet={habit.minimumMet}
          goalMet={habit.goalMet}
          onPress={() => router.push('/settings')}
        />

        <ContinueReadingCard
          position={position}
          chapter={positionChapter}
          onPress={handleContinueReading}
        />

        {dailyAyah.error && (
          <ErrorState error={dailyAyah.error} onRetry={dailyAyah.refetch} compact />
        )}

        {params.focus === 'todays-ayah' && (
          <View className="items-center pt-2">
            <Text variant="caption" tone="subtle">
              {t('home.todaysAyah')}
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
