/**
 * A live sample of Quran text, for the script and typeface pickers.
 *
 * A row that says "IndoPak" tells the reader nothing; the same row showing
 * بِسْمِ ٱللَّهِ as IndoPak prints it tells them everything. The sample is
 * the first ayah, fetched in the script being previewed — the API serves
 * each orthography as different text, so it cannot be faked with a font.
 *
 * Small and cached: three tiny requests at most, and React Query keeps them,
 * so opening Settings a second time costs nothing.
 */
import { View } from 'react-native';

import { ArabicText } from '@/features/quran/components/ArabicText';
import { useVerse } from '@/features/quran/hooks/useVerse';
import type { ArabicScript } from '@/features/quran/types/quran.types';
import type { ArabicFontKey } from '@/theme/fonts';

export interface ArabicSampleProps {
  script: ArabicScript;
  fontFamily: ArabicFontKey;
}

const SAMPLE_VERSE = '1:1';

export function ArabicSample({ script, fontFamily }: ArabicSampleProps) {
  const { data } = useVerse(SAMPLE_VERSE, { translationIds: [], script });

  // Reserve the height while loading so the list does not jump as samples
  // arrive one by one.
  return (
    <View className="min-h-[52px] justify-center px-4 pb-3">
      {data ? (
        <ArabicText
          text={data.arabicText}
          fontSize={22}
          fontFamily={fontFamily}
          selectable={false}
          accessibilityLabel={`${script} ${fontFamily}`}
        />
      ) : null}
    </View>
  );
}
