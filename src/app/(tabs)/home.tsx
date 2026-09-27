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
import { shareVerse } from '@/features/quran/services/shareService';
import { queryKeys } from '@/lib/api/queryKeys';
import { usePullToRefresh } from '@/lib/api/usePullToRefresh';
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
  const refresh = usePullToRefresh([
    queryKeys.habit.all,
    queryKeys.quran.all,
    queryKeys.library.all,
  ]);

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
    try {
      await playAyah(dailyAyah.selection.verseKey);
    } catch {
      toast.show(t('errors.audioUnavailable'), { tone: 'error', icon: 'error' });
    }
  }, [dailyAyah.selection, audio, playAyah, toast, t]);

  const lastReadLabel = position
    ? `${positionChapter?.nameSimple ?? t('quran.surahNumber', { number: position.chapterId })} · ${position.verseKey}`
    : null;

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
          <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} />
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
          arabicFont={preferences.arabicFont}
          translationFontSize={preferences.translationFontSize}
          languageCode={preferences.translationIds[0] === 161 ? 'bn' : 'en'}
          isBookmarked={
            dailyAyah.selection ? bookmarks.isBookmarked(dailyAyah.selection.verseKey) : false
          }
          isPlaying={
            audio.state === 'playing' &&
            audio.currentTrack?.verseKey === dailyAyah.selection?.verseKey
          }
          onPlay={() => void handlePlay()}
          onBookmark={() => void handleBookmark()}
          onShare={() => void handleShare()}
          onOpenInReader={handleOpenTodaysAyah}
          lastReadLabel={lastReadLabel}
          onResumeLastRead={handleContinueReading}
        />

        <DailyGoalCard
          goal={habit.goal}
          totals={habit.todayTotals}
          completionRatio={habit.completionRatio}
          minimumMet={habit.minimumMet}
          goalMet={habit.goalMet}
          onPress={() => router.push('/daily-goal')}
        />

        {/* The way back to the last position normally sits inside the card
            above. This one covers what it cannot: a first launch, with
            nothing read yet, and a day when today's ayah failed to load. */}
        {(!position || dailyAyah.error) && (
          <ContinueReadingCard
            position={position}
            chapter={positionChapter}
            onPress={handleContinueReading}
          />
        )}

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
