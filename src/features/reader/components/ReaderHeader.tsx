/**
 * The reader's top bar: where you are, and the way into the reader's settings.
 *
 * Playback lives in the bottom bar, next to the rest of the listening
 * controls; a second play button up here only raised the question of which
 * one to press.
 */
import { View } from 'react-native';
import { router } from 'expo-router';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { Chapter } from '@/features/quran/types/quran.types';

export interface ReaderHeaderProps {
  chapter: Chapter | undefined;
  /** The ayah currently at the top of the viewport. */
  currentVerse: number | null;
  onOpenPreferences: () => void;
}

export function ReaderHeader({ chapter, currentVerse, onOpenPreferences }: ReaderHeaderProps) {
  const { t } = useTranslation();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/quran');
  };

  return (
    <View className="flex-row items-center gap-1 border-b border-border bg-surface px-2 py-2">
      <IconButton name="back" onPress={handleBack} accessibilityLabel={t('a11y.back')} />

      <View className="flex-1 px-1">
        <Text className="font-semibold" numberOfLines={1} accessibilityRole="header">
          {chapter?.nameSimple ?? ''}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {chapter
            ? currentVerse
              ? `${chapter.translatedName} · ${t('quran.ayahNumber', { number: currentVerse })}`
              : chapter.translatedName
            : ''}
        </Text>
      </View>

      <IconButton
        name="menu"
        onPress={onOpenPreferences}
        accessibilityLabel={t('reader.preferences')}
      />
    </View>
  );
}
