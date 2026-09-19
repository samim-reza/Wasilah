/**
 * Word-by-word Arabic with gloss and transliteration.
 *
 * Laid out as wrapping right-to-left columns so each Arabic word sits directly
 * above its own translation. A single flowing line cannot keep that alignment
 * once the text wraps.
 */
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { arabicLineHeightRatio } from '@/theme/tokens';

import type { WordSegment } from '../types/quran.types';

export interface WordByWordRowProps {
  words: readonly WordSegment[];
  arabicFontSize: number;
  showTransliteration?: boolean;
  /**
   * 1-based position of the word being recited right now, or null.
   *
   * Null covers a reciter with no word timings at all, which is the common
   * case — the row simply renders unhighlighted rather than degrading.
   */
  activeWordPosition?: number | null;
  onWordPress?: (word: WordSegment) => void;
}

export function WordByWordRow({
  words,
  arabicFontSize,
  showTransliteration = false,
  activeWordPosition = null,
  onWordPress,
}: WordByWordRowProps) {
  // The end-of-ayah glyph is not a word and has no translation; the ayah number
  // badge shows it instead.
  const readable = words.filter((word) => !word.isEndMarker);

  return (
    <View className="flex-row flex-wrap justify-end gap-x-4 gap-y-3" accessible={false}>
      {readable.map((word) => {
        const isActive = activeWordPosition === word.position;

        return (
        <Pressable
          key={word.id}
          className="items-center rounded-lg px-1 py-0.5"
          style={{ minWidth: 56 }}
          onPress={onWordPress ? () => onWordPress(word) : undefined}
          disabled={!onWordPress}
          accessibilityRole={onWordPress ? 'button' : undefined}
          accessibilityLabel={word.translation ?? word.text}
        >
          <Text
            className={isActive ? 'font-arabic text-primary' : 'font-arabic text-content'}
            style={{
              fontSize: arabicFontSize * 0.8,
              lineHeight: arabicFontSize * 0.8 * arabicLineHeightRatio,
            }}
            allowFontScaling={false}
          >
            {word.text}
          </Text>

          {showTransliteration && word.transliteration && (
            <Text variant="caption" tone="subtle" className="text-center">
              {word.transliteration}
            </Text>
          )}

          {word.translation && (
            <Text variant="caption" tone="muted" className="text-center">
              {word.translation}
            </Text>
          )}
        </Pressable>
        );
      })}
    </View>
  );
}
