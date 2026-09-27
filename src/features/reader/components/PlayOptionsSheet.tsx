/**
 * What to recite: from which ayah, to which, and how many times.
 *
 * Opened from the reader's bottom bar. The defaults — from the ayah on
 * screen to the end of the surah, once — are what "play" means to most
 * people, so a single tap on Play here is the common case; the ranges and
 * repeats are for memorising a passage.
 */
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import type { RepeatOptions } from '@/features/audio/services/audioQueue';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

export interface PlayRange extends RepeatOptions {
  fromVerse: number;
  toVerse: number;
}

export interface PlayOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Ayahs in the surah; the range is clamped to it. */
  verseCount: number;
  /** Where the sheet opens: usually the ayah on screen, to the surah's end. */
  initial: PlayRange;
  onPlay: (range: PlayRange) => void;
}

const repeatEachChoices = [1, 2, 3, 5, 10] as const;
/** 0 is "until stopped". */
const repeatRangeChoices = [1, 2, 3, 5, 0] as const;

export function PlayOptionsSheet({
  visible,
  onClose,
  verseCount,
  initial,
  onPlay,
}: PlayOptionsSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('reader.playOptions')}
      heightRatio={0.72}
    >
      {/* Remounted on every open, so it starts from the ayah on screen now
          rather than wherever it was left last time. */}
      {visible && <PlayOptionsForm verseCount={verseCount} initial={initial} onPlay={onPlay} />}
    </BottomSheet>
  );
}

function PlayOptionsForm({
  verseCount,
  initial,
  onPlay,
}: Pick<PlayOptionsSheetProps, 'verseCount' | 'initial' | 'onPlay'>) {
  const { t } = useTranslation();
  const last = Math.max(1, verseCount);
  const clamp = (value: number) => Math.min(last, Math.max(1, Math.round(value)));

  const [fromVerse, setFromVerse] = useState(() => clamp(initial.fromVerse));
  const [toVerse, setToVerse] = useState(() => clamp(initial.toVerse));
  const [repeatEach, setRepeatEach] = useState(initial.repeatEach);
  const [repeatRange, setRepeatRange] = useState(initial.repeatRange);

  // Keeping from ≤ to as either changes, so the range can never be empty.
  const changeFrom = (value: number) => {
    const next = clamp(value);
    setFromVerse(next);
    if (next > toVerse) setToVerse(next);
  };
  const changeTo = (value: number) => {
    const next = clamp(value);
    setToVerse(next);
    if (next < fromVerse) setFromVerse(next);
  };

  return (
    <ScrollView
      className="px-4"
      contentContainerClassName="gap-5 pb-8 pt-2"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row gap-3">
        <VerseStepper
          label={t('reader.fromAyah')}
          value={fromVerse}
          max={last}
          onChange={changeFrom}
        />
        <VerseStepper label={t('reader.toAyah')} value={toVerse} max={last} onChange={changeTo} />
      </View>

      <ChoiceRow
        label={t('reader.repeatEachAyah')}
        choices={repeatEachChoices}
        value={repeatEach}
        onChange={setRepeatEach}
        format={(count) => `${count}×`}
      />

      <ChoiceRow
        label={t('reader.repeatPassage')}
        choices={repeatRangeChoices}
        value={repeatRange}
        onChange={setRepeatRange}
        format={(count) => (count === 0 ? '∞' : `${count}×`)}
      />

      <Button
        label={
          fromVerse === toVerse
            ? t('reader.playAyahNumber', { ayah: fromVerse })
            : t('reader.playAyahRange', { from: fromVerse, to: toVerse })
        }
        icon="play"
        fullWidth
        onPress={() => onPlay({ fromVerse, toVerse, repeatEach, repeatRange })}
      />
    </ScrollView>
  );
}

function VerseStepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const { colors } = useTheme();
  // The field holds text while it is being typed, so clearing it to type a new
  // number does not snap straight back to 1.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed)) onChange(parsed);
    setDraft(null);
  };

  return (
    <View className="flex-1 gap-1.5">
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <View className="flex-row items-center rounded-xl border border-border bg-surface-muted">
        <IconButton
          name="remove"
          size={18}
          onPress={() => onChange(value - 1)}
          disabled={value <= 1}
          accessibilityLabel={`${label} −`}
        />
        <TextInput
          value={draft ?? String(value)}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={3}
          selectTextOnFocus
          className="flex-1 py-2 text-center text-base font-semibold tabular-nums"
          style={{ color: colors.text }}
          accessibilityLabel={`${label}, 1–${max}`}
        />
        <IconButton
          name="add"
          size={18}
          onPress={() => onChange(value + 1)}
          disabled={value >= max}
          accessibilityLabel={`${label} +`}
        />
      </View>
    </View>
  );
}

function ChoiceRow<T extends number>({
  label,
  choices,
  value,
  onChange,
  format,
}: {
  label: string;
  choices: readonly T[];
  value: number;
  onChange: (value: T) => void;
  format: (value: T) => string;
}) {
  return (
    <View className="gap-2">
      <Text variant="label" tone="subtle">
        {label}
      </Text>
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {choices.map((choice) => {
          const selected = choice === value;
          return (
            <Pressable
              key={choice}
              onPress={() => onChange(choice)}
              className={`flex-1 items-center rounded-lg border py-2.5 ${
                selected ? 'border-primary bg-primary-muted' : 'border-border bg-surface'
              }`}
              enforceMinTapTarget={false}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${format(choice)}`}
            >
              <Text className={`tabular-nums ${selected ? 'font-semibold text-primary' : ''}`}>
                {format(choice)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
