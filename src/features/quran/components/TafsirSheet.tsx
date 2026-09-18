/**
 * Tafsir for an ayah.
 *
 * Presented as a clearly distinct content type, never mixed into the ayah card:
 * scripture, its translation and a scholar's commentary are three different
 * things, and the interface says so. The source edition is always named.
 */
import { ScrollView, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonText } from '@/components/feedback/Skeleton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { ArabicText } from './ArabicText';
import { useTafsir } from '../hooks/useTafsir';
import type { Verse } from '../types/quran.types';

export interface TafsirSheetProps {
  verse: Verse | null;
  /** Quran Foundation tafsir resource id; null means none selected. */
  tafsirId: number | null;
  /** Human-readable edition name, shown as attribution. */
  tafsirName: string | null;
  arabicFontSize: number;
  translationFontSize: number;
  onClose: () => void;
}

export function TafsirSheet({
  verse,
  tafsirId,
  tafsirName,
  arabicFontSize,
  translationFontSize,
  onClose,
}: TafsirSheetProps) {
  const { t } = useTranslation();
  const tafsir = useTafsir(tafsirId, verse?.verseKey ?? null);

  return (
    <BottomSheet
      visible={verse !== null}
      onClose={onClose}
      title={t('quran.tafsir')}
      heightRatio={0.8}
    >
      <ScrollView className="px-4" contentContainerClassName="pb-10">
        {verse && (
          <View className="border-b border-border pb-4 pt-2">
            <Text variant="caption" tone="primary" className="mb-2 font-semibold">
              {verse.verseKey}
            </Text>
            <ArabicText
              text={verse.arabicText}
              fontSize={arabicFontSize * 0.8}
              selectable={false}
            />
          </View>
        )}

        <View className="pt-4">
          {tafsirId === null ? (
            <Text tone="muted">{t('reader.selectTranslation')}</Text>
          ) : tafsir.isLoading ? (
            <SkeletonText lines={8} />
          ) : tafsir.error ? (
            <ErrorState error={tafsir.error} onRetry={() => void tafsir.refetch()} compact />
          ) : tafsir.data ? (
            <>
              <Text
                className="text-content-muted"
                style={{ fontSize: translationFontSize, lineHeight: translationFontSize * 1.7 }}
                allowFontScaling={false}
                selectable
              >
                {tafsir.data}
              </Text>

              {tafsirName && (
                <Text variant="caption" tone="subtle" className="mt-4">
                  {t('about.tafsirSource', { name: tafsirName })}
                </Text>
              )}
            </>
          ) : (
            <Text tone="muted">{t('search.noResults')}</Text>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
