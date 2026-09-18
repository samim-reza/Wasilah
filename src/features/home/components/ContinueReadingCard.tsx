/**
 * "Continue reading" — the fastest path back into the Quran.
 *
 * Falls back to an invitation to start when there is no saved position, so the
 * home screen never has a hole in it on a first launch.
 */
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { Chapter } from '@/features/quran/types/quran.types';
import type { ReadingPosition } from '@/features/reader/services/readingPositionService';

export interface ContinueReadingCardProps {
  position: ReadingPosition | null;
  chapter: Chapter | undefined;
  onPress: () => void;
}

export function ContinueReadingCard({ position, chapter, onPress }: ContinueReadingCardProps) {
  const { t } = useTranslation();

  const title = position ? t('home.continueReading') : t('home.startReading');
  const subtitle =
    position && chapter
      ? t('home.continueReadingFrom', {
          surah: chapter.nameSimple,
          ayah: position.verseNumber,
        })
      : t('home.minimumIncomplete');

  return (
    <Card onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary-muted">
          <Icon name="quran" size={20} color="primary" />
        </View>

        <View className="flex-1">
          <Text className="font-semibold">{title}</Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <Icon name="forward" size={18} color="textSubtle" />
      </View>
    </Card>
  );
}
