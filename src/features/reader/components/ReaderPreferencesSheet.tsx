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
import { Pressable } from '@/components/ui/Pressable';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { ReadingModeValue } from '@/lib/supabase/database.types';
import { arabicFontKeys } from '@/theme/fonts';

import { arabicScripts, type ReaderPreferences } from '../hooks/useReaderPreferences';
import { ArabicSample } from './ArabicSample';

export interface ReaderPreferencesSheetProps {
  visible: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onUpdate: (patch: Partial<ReaderPreferences>) => Promise<void>;
  onStepArabic: (direction: 1 | -1) => Promise<void>;
  onStepTranslation: (direction: 1 | -1) => Promise<void>;
  onOpenTranslationPicker: () => void;
  onOpenReciterPicker: () => void;
  onOpenTafsirPicker: () => void;
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
  onOpenTafsirPicker,
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
      heightRatio={0.8}
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

        {/* The font settings live here, beside the text they change, as well
            as in Settings: the sample below redraws as each one is chosen,
            and the ayahs behind the sheet do too. */}
        <Text variant="label" tone="subtle" className="pt-4">
          {t('reader.fontSettings')}
        </Text>

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

        <ChipGroup
          label={t('reader.arabicScript')}
          options={arabicScripts.map((script) => ({
            value: script,
            label: t(`reader.script${script.charAt(0).toUpperCase()}${script.slice(1)}`),
          }))}
          value={preferences.arabicScript}
          onChange={(arabicScript) => void onUpdate({ arabicScript })}
        />

        <ChipGroup
          label={t('reader.arabicFont')}
          options={arabicFontKeys.map((font) => ({ value: font, label: t(`reader.font${font}`) }))}
          value={preferences.arabicFont}
          onChange={(arabicFont) => void onUpdate({ arabicFont })}
        />

        <View className="mb-2 overflow-hidden rounded-xl border border-border pt-3">
          <ArabicSample script={preferences.arabicScript} fontFamily={preferences.arabicFont} />
        </View>

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
          <PickerRow label={t('quran.tafsir')} onPress={onOpenTafsirPicker} />
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

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="gap-2 py-3">
      <Text>{label}</Text>
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`rounded-full border px-3 py-1.5 ${
                selected ? 'border-primary bg-primary-muted' : 'border-border bg-surface'
              }`}
              enforceMinTapTarget={false}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
            >
              <Text
                variant="caption"
                className={selected ? 'font-semibold text-primary' : ''}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
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
