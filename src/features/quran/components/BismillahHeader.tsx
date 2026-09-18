/**
 * The Bismillah shown above a surah.
 *
 * Omitted for At-Tawbah (surah 9), which does not begin with it, and for
 * Al-Fatihah, where it is the first ayah of the surah itself and would
 * otherwise appear twice. The API's `bismillah_pre` flag carries this, so the
 * rule is never hardcoded by surah number.
 */
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { arabicLineHeightRatio } from '@/theme/tokens';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

export interface BismillahHeaderProps {
  /** From the chapter's `bismillah_pre` flag. */
  show: boolean;
  fontSize: number;
  showTranslation?: boolean;
}

export function BismillahHeader({ show, fontSize, showTranslation = true }: BismillahHeaderProps) {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <View className="items-center border-b border-border px-6 py-8">
      <Text
        className="text-center font-arabic text-content"
        style={{
          fontSize,
          lineHeight: fontSize * arabicLineHeightRatio,
          writingDirection: 'rtl',
        }}
        allowFontScaling={false}
      >
        {BISMILLAH}
      </Text>

      {showTranslation && (
        <Text variant="caption" tone="subtle" className="mt-3 text-center">
          {t('quran.bismillah')}
        </Text>
      )}
    </View>
  );
}
