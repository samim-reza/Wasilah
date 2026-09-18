/**
 * Renders a translation.
 *
 * Kept separate from `ArabicText` because the two have genuinely different
 * typographic needs, and because conflating scripture with its translation —
 * even in a component — is the kind of blurring this app avoids.
 *
 * Bengali gets an explicit font: conjunct clusters render incorrectly in the
 * Android system font on many devices.
 */
import { Text } from 'react-native';

export interface TranslationTextProps {
  text: string;
  fontSize: number;
  /** Drives font selection; Bengali needs a dedicated face. */
  languageCode?: string;
  /** Shown beneath the text so the edition is always attributable. */
  sourceName?: string | null;
}

export function TranslationText({
  text,
  fontSize,
  languageCode = 'en',
  sourceName,
}: TranslationTextProps) {
  const isBengali = languageCode === 'bn';

  return (
    <>
      <Text
        className={`text-content-muted ${isBengali ? 'font-bengali' : ''}`}
        style={{
          fontSize,
          // Bengali needs more leading than Latin for its ascenders and
          // below-baseline marks.
          lineHeight: fontSize * (isBengali ? 1.9 : 1.6),
        }}
        allowFontScaling={false}
        selectable
      >
        {text}
      </Text>

      {sourceName && (
        <Text className="mt-1 text-xs text-content-subtle" numberOfLines={1}>
          — {sourceName}
        </Text>
      )}
    </>
  );
}
