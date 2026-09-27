/**
 * Today's Ayah — the card the whole app is built around.
 *
 * Two ways into the reader sit under it: on from today's ayah, and back to
 * wherever the user last left off. The day's target is time spent reading,
 * so there is no "mark as read" here any more — a tap is not ten minutes.
 */
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Pressable } from '@/components/ui/Pressable';
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
  onPlay: () => void;
  onBookmark: () => void;
  onShare: () => void;
  /** Opens the reader at today's ayah. */
  onOpenInReader: () => void;
  /**
   * Where the user last stopped reading, e.g. "Al-Baqarah · 2:45", or null
   * when they have not read anything yet.
   */
  lastReadLabel: string | null;
  onResumeLastRead: () => void;
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
  onPlay,
  onBookmark,
  onShare,
  onOpenInReader,
  lastReadLabel,
  onResumeLastRead,
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

      <View className="gap-2">
        <Button
          label={t('home.continueReading')}
          onPress={onOpenInReader}
          icon="forward"
          iconPosition="trailing"
          fullWidth
          accessibilityHint={t('home.continueReadingHint')}
        />

        {lastReadLabel && (
          <Pressable
            onPress={onResumeLastRead}
            className="flex-row items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3"
            enforceMinTapTarget={false}
            accessibilityRole="button"
            accessibilityLabel={`${t('home.fromLastRead')}. ${lastReadLabel}`}
          >
            <Icon name="bookmark" size={18} color="primary" />
            <View className="flex-1">
              <Text className="font-semibold">{t('home.fromLastRead')}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {lastReadLabel}
              </Text>
            </View>
            <Icon name="forward" size={18} color="textSubtle" />
          </Pressable>
        )}
      </View>
    </Card>
  );
}
