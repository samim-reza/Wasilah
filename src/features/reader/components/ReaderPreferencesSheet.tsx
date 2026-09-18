/**
 * Reading preferences, presented as a bottom sheet over the text.
 *
 * A sheet rather than a separate screen so the user can see their change take
 * effect on the ayahs behind it — choosing a font size blind, then navigating
 * back to check, is a much worse experience.
 */
import { ScrollView, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Divider } from '@/components/ui/Divider';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { ReadingModeValue } from '@/lib/supabase/database.types';

import type { ReaderPreferences } from '../hooks/useReaderPreferences';

export interface ReaderPreferencesSheetProps {
  visible: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onUpdate: (patch: Partial<ReaderPreferences>) => Promise<void>;
  onStepArabic: (direction: 1 | -1) => Promise<void>;
  onStepTranslation: (direction: 1 | -1) => Promise<void>;
  onOpenTranslationPicker: () => void;
  onOpenReciterPicker: () => void;
  /** Hidden when the feature flag is off or no word data is available. */
  wordByWordAvailable: boolean;
}

export function ReaderPreferencesSheet({
  visible,
  onClose,
  preferences,
  onUpdate,
  onStepArabic,
  onStepTranslation,
  onOpenTranslationPicker,
  onOpenReciterPicker,
  wordByWordAvailable,
}: ReaderPreferencesSheetProps) {
  const { t } = useTranslation();

  const modeOptions: { value: ReadingModeValue; label: string }[] = [
    { value: 'translation', label: t('reader.modeTranslation') },
    { value: 'arabic_only', label: t('reader.modeArabicOnly') },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('reader.preferences')}
      heightRatio={0.7}
    >
      <ScrollView className="px-4" contentContainerClassName="pb-8">
        <View className="py-4">
          <Text variant="label" tone="subtle" className="mb-2">
            {t('reader.readingMode')}
          </Text>
          <SegmentedControl
            options={modeOptions}
            value={preferences.mode === 'mushaf' ? 'translation' : preferences.mode}
            onChange={(mode) => void onUpdate({ mode, showTranslation: mode === 'translation' })}
            accessibilityLabel={t('reader.readingMode')}
          />
        </View>

        <Divider />

        <SizeStepper
          label={t('reader.arabicSize')}
          value={preferences.arabicFontSize}
          onStep={onStepArabic}
        />

        {preferences.showTranslation && (
          <SizeStepper
            label={t('reader.translationSize')}
            value={preferences.translationFontSize}
            onStep={onStepTranslation}
          />
        )}

        <Divider />

        <Switch
          label={t('reader.showTranslation')}
          value={preferences.showTranslation}
          onValueChange={(showTranslation) => void onUpdate({ showTranslation })}
        />

        {wordByWordAvailable && (
          <Switch
            label={t('reader.showWordByWord')}
            value={preferences.showWordByWord}
            onValueChange={(showWordByWord) => void onUpdate({ showWordByWord })}
          />
        )}

        <Switch
          label={t('reader.keepScreenAwake')}
          value={preferences.keepScreenAwake}
          onValueChange={(keepScreenAwake) => void onUpdate({ keepScreenAwake })}
        />

        <Divider />

        <View className="gap-1 pt-2">
          <PickerRow label={t('reader.selectTranslation')} onPress={onOpenTranslationPicker} />
          <PickerRow label={t('reader.selectReciter')} onPress={onOpenReciterPicker} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function SizeStepper({
  label,
  value,
  onStep,
}: {
  label: string;
  value: number;
  onStep: (direction: 1 | -1) => Promise<void>;
}) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="flex-1">{label}</Text>

      <View className="flex-row items-center gap-2">
        <IconButton
          name="remove"
          onPress={() => void onStep(-1)}
          accessibilityLabel={`${label} smaller`}
          filled
          size={18}
        />
        <Text className="w-10 text-center tabular-nums" tone="muted">
          {value}
        </Text>
        <IconButton
          name="add"
          onPress={() => void onStep(1)}
          accessibilityLabel={`${label} larger`}
          filled
          size={18}
        />
      </View>
    </View>
  );
}

function PickerRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text>{label}</Text>
      <IconButton name="forward" onPress={onPress} accessibilityLabel={label} size={18} />
    </View>
  );
}
