/**
 * A surah row in the chapter list.
 *
 * Memoised: the list is 114 rows and re-renders on every scroll frame while the
 * user flicks through it.
 */
import { memo } from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import type { Chapter } from '../types/quran.types';

export interface ChapterListItemProps {
  chapter: Chapter;
  onPress: (chapter: Chapter) => void;
}

function ChapterListItemComponent({ chapter, onPress }: ChapterListItemProps) {
  const { t } = useTranslation();

  const revelation =
    chapter.revelationPlace === 'makkah'
      ? t('quran.revelationMeccan')
      : t('quran.revelationMedinan');

  return (
    <Pressable
      className="flex-row items-center gap-3 border-b border-border px-4 py-3"
      pressedClassName="active:bg-surface-pressed"
      onPress={() => onPress(chapter)}
      enforceMinTapTarget={false}
      accessibilityLabel={`${chapter.nameSimple}, ${t('quran.versesCount', { count: chapter.versesCount })}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-muted">
        <Text className="text-xs font-semibold tabular-nums text-primary">{chapter.id}</Text>
      </View>

      <View className="flex-1">
        <Text className="font-semibold" numberOfLines={1}>
          {chapter.nameSimple}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {chapter.translatedName} · {revelation} ·{' '}
          {t('quran.versesCount', { count: chapter.versesCount })}
        </Text>
      </View>

      <Text
        className="font-arabic text-content-muted"
        style={{ fontSize: 20, lineHeight: 34 }}
        allowFontScaling={false}
      >
        {chapter.nameArabic}
      </Text>
    </Pressable>
  );
}

export const ChapterListItem = memo(ChapterListItemComponent);
