/**
 * The ayah marker.
 *
 * Drawn as a bordered badge rather than using the Unicode end-of-ayah glyph
 * (۝), because that glyph's rendering varies wildly across devices and at large
 * sizes it can overlap neighbouring text.
 */
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';

export interface AyahNumberProps {
  verseNumber: number;
  /** Highlighted while this ayah is being recited. */
  active?: boolean;
}

export function AyahNumber({ verseNumber, active = false }: AyahNumberProps) {
  return (
    <View
      className={`h-7 min-w-7 items-center justify-center rounded-full px-1.5 ${
        active ? 'bg-primary' : 'bg-primary-muted'
      }`}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text
        className={`text-xs font-semibold tabular-nums ${
          active ? 'text-primary-foreground' : 'text-primary'
        }`}
      >
        {verseNumber}
      </Text>
    </View>
  );
}
