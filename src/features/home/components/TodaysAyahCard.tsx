/**
 * Today's Ayah — the card the whole app is built around.
 *
 * It is the one place a user can complete their day without navigating
 * anywhere, so it carries a primary action rather than only a link. Everything
 * else on the home screen defers to it.
 */
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Text } from '@/components/ui/Text';
import { ArabicText } from '@/features/quran/components/ArabicText';
import { TranslationText } from '@/features/quran/components/TranslationText';
import type { Verse } from '@/features/quran/types/quran.types';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { ArabicFontKey } from '@/theme/fonts';

export interface TodaysAyahCardProps {
  verse: Verse | undefined;
  chapterName: string | undefined;
  isLoading: boolean;
  arabicFontSize: number;
  arabicFont: ArabicFontKey;
  translationFontSize: number;
  languageCode: string;
  isBookmarked: boolean;
  isPlaying: boolean;
  /** True once today's minimum has been met. */
  completed: boolean;
  onPlay: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onMarkAsRead: () => void;
  onOpenInReader: () => void;
}

export function TodaysAyahCard({
  verse,
  chapterName,
  isLoading,
  arabicFontSize,
  arabicFont,
  translationFontSize,
  languageCode,
  isBookmarked,
  isPlaying,
  completed,
  onPlay,
  onBookmark,
  onShare,
  onMarkAsRead,
  onOpenInReader,
}: TodaysAyahCardProps) {
  const { t } = useTranslation();

  if (isLoading || !verse) {
    return (
      <Card className="gap-4">
        <Skeleton width={120} height={12} />
        <Skeleton height={40} />
        <Skeleton height={40} width="80%" />
        <Skeleton height={44} radius={12} />
      </Card>
    );
  }

  const reference = `${chapterName ?? verse.chapterId} · ${verse.verseKey}`;
  const translation = verse.translations[0];

  return (
    <Card className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text variant="label" tone="subtle">
          {t('home.todaysAyah')}
        </Text>

        <View className="flex-row items-center">
          <IconButton
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isPlaying ? 'primary' : 'textMuted'}
            onPress={onPlay}
            accessibilityLabel={t('a11y.playAyah', { reference: verse.verseKey })}
          />
          <IconButton
            name={isBookmarked ? 'bookmarkFilled' : 'bookmark'}
            size={18}
            color={isBookmarked ? 'accent' : 'textMuted'}
            onPress={onBookmark}
            accessibilityLabel={t('a11y.bookmarkToggle', { reference: verse.verseKey })}
          />
          <IconButton
            name="share"
            size={18}
            color="textMuted"
            onPress={onShare}
            accessibilityLabel={t('common.share')}
          />
        </View>
      </View>

      {/* Centred, because this ayah is the focus of the screen rather than one
          row in a list. */}
      <ArabicText
        text={verse.arabicText}
        fontSize={arabicFontSize}
        fontFamily={arabicFont}
        align="center"
        accessibilityLabel={reference}
      />

      {translation && (
        <TranslationText
          text={translation.text}
          fontSize={translationFontSize}
          languageCode={languageCode}
          sourceName={translation.resourceName}
        />
      )}

      <Text variant="caption" tone="subtle">
        {reference}
      </Text>

      {completed ? (
        <Button
          label={t('home.continueReading')}
          onPress={onOpenInReader}
          variant="secondary"
          icon="forward"
          iconPosition="trailing"
          fullWidth
        />
      ) : (
        <Button
          label={t('home.markAsRead')}
          onPress={onMarkAsRead}
          icon="check"
          fullWidth
          accessibilityHint={t('home.minimumIncomplete')}
        />
      )}
    </Card>
  );
}
