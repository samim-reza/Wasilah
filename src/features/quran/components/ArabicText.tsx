/**
 * Renders Quran Arabic text.
 *
 * Small, but the single most important component in the app to get right.
 * Non-obvious decisions:
 *
 *   • `writingDirection: 'rtl'` is set explicitly rather than relying on the
 *     app's layout direction. The interface stays LTR for English and Bengali
 *     users, and without this the ayah number and any embedded Latin text land
 *     on the wrong side.
 *
 *   • Line height is a multiple of the font size (2.0), not a fixed value.
 *     Quranic diacritics extend well above and below the baseline; at normal
 *     leading they collide with the lines around them.
 *
 *   • `allowFontScaling` is OFF here alone. The user sets Arabic size directly
 *     in reader preferences, and compounding that with the OS multiplier
 *     produces text far larger than either setting implies. Every other piece
 *     of text in the app does scale.
 *
 *   • The text is passed through untouched. It is never trimmed, normalised or
 *     re-spaced.
 */
import { Text } from 'react-native';

import { arabicLineHeightRatio } from '@/theme/tokens';

export interface ArabicTextProps {
  text: string;
  fontSize: number;
  /** Right-aligned in the reader, centred on cards and share images. */
  align?: 'right' | 'center';
  /** Screen-reader label; the ayah reference, since the glyphs read poorly. */
  accessibilityLabel?: string;
  selectable?: boolean;
}

export function ArabicText({
  text,
  fontSize,
  align = 'right',
  accessibilityLabel,
  selectable = true,
}: ArabicTextProps) {
  return (
    <Text
      className="font-arabic text-content"
      style={{
        fontSize,
        lineHeight: fontSize * arabicLineHeightRatio,
        textAlign: align,
        writingDirection: 'rtl',
      }}
      allowFontScaling={false}
      selectable={selectable}
      accessibilityLabel={accessibilityLabel}
    >
      {text}
    </Text>
  );
}
