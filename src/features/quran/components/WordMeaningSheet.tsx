/**
 * The meaning of a single tapped word.
 *
 * Kept to a sheet rather than a screen: looking up one word is a glance in the
 * middle of reading, and pushing a route would lose the reader's place and
 * their scroll position.
 *
 * The word-level translation comes from the Quran Foundation API alongside the
 * ayah, so this adds no request of its own. Both fields are nullable there —
 * not every word in every translation set carries one — and an absent value is
 * shown as absent rather than as an empty row.
 */
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import type { WordSegment } from '@/features/quran/types/quran.types';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { arabicLineHeightRatio } from '@/theme/tokens';

export interface WordMeaningSheetProps {
  word: WordSegment | null;
  onClose: () => void;
}

export function WordMeaningSheet({ word, onClose }: WordMeaningSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet visible={word !== null} onClose={onClose} heightRatio={0.4}>
      {word && (
        <View className="gap-6 px-4 pb-4">
          <View className="items-center">
            <Text
              className="font-arabic text-content"
              style={{ fontSize: 40, lineHeight: 40 * arabicLineHeightRatio }}
              allowFontScaling={false}
            >
              {word.text}
            </Text>
          </View>

          {word.transliteration && (
            <View className="gap-1">
              <Text variant="caption" tone="subtle">
                {t('quran.pronunciation')}
              </Text>
              <Text className="italic">{word.transliteration}</Text>
            </View>
          )}

          {word.translation ? (
            <View className="gap-1">
              <Text variant="caption" tone="subtle">
                {t('quran.meaning')}
              </Text>
              <Text>{word.translation}</Text>
            </View>
          ) : (
            <Text tone="muted">{t('quran.noWordMeaning')}</Text>
          )}
        </View>
      )}
    </BottomSheet>
  );
}
