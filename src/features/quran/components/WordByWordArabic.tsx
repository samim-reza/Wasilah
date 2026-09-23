/**
 * Quran Arabic rendered one tappable word at a time.
 *
 * The critical structural choice: each word is a NESTED `<Text>` inside a
 * single parent `<Text>`, not a `<View>` per word inside a flex row. Nested
 * text still participates in the parent's line layout, so RTL flow, wrapping
 * and justification behave exactly as they do in `ArabicText`. Laying words
 * out as separate views would break line breaking and produce visibly
 * different pages.
 *
 * Everything else here mirrors `ArabicText` — the same line-height ratio, the
 * same explicit RTL, the same `allowFontScaling={false}` — because this is the
 * same text with interaction added, and the two must not drift apart.
 *
 * Selection is off. `selectable` and per-word `onPress` fight each other on
 * Android, and tapping a word for its meaning is the more useful of the two.
 */
import { Text } from 'react-native';

import type { WordSegment } from '@/features/quran/types/quran.types';
import { arabicLineHeightFor, type ArabicFontKey } from '@/theme/fonts';
import { arabicLineHeightRatio } from '@/theme/tokens';

export interface WordByWordArabicProps {
  words: readonly WordSegment[];
  fontSize: number;
  align?: 'right' | 'center';
  /** 1-based position of the word currently being recited, if any. */
  activeWordPosition?: number | null;
  onWordPress?: (word: WordSegment) => void;
  accessibilityLabel?: string;
  fontFamily?: ArabicFontKey;
}

export function WordByWordArabic({
  words,
  fontSize,
  align = 'right',
  activeWordPosition = null,
  onWordPress,
  accessibilityLabel,
  fontFamily = 'AmiriQuran',
}: WordByWordArabicProps) {
  return (
    <Text
      className="font-arabic text-content"
      style={{
        fontFamily,
        fontSize,
        lineHeight: fontSize * arabicLineHeightFor(fontFamily, arabicLineHeightRatio),
        textAlign: align,
        writingDirection: 'rtl',
      }}
      allowFontScaling={false}
      accessibilityLabel={accessibilityLabel}
    >
      {words.map((word, index) => {
        const isActive = activeWordPosition === word.position;
        // The ayah-number glyph is not a word: it has no meaning to show and
        // is never recited, so it stays inert.
        const isInteractive = Boolean(onWordPress) && !word.isEndMarker;

        return (
          <Text
            key={word.id}
            className={isActive ? 'text-primary' : 'text-content'}
            onPress={isInteractive ? () => onWordPress?.(word) : undefined}
            suppressHighlighting
          >
            {/* A space BEFORE each word but the first keeps the separators
                inside the parent's flow, so wrapping points stay natural. */}
            {index > 0 ? ' ' : ''}
            {word.text}
          </Text>
        );
      })}
    </Text>
  );
}
