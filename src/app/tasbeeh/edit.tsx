/**
 * Adding or editing a tasbeeh.
 *
 * One screen for both, distinguished by whether an `id` arrives in the query.
 * The fields are the same either way, and two nearly identical screens would
 * drift apart the first time one of them gained a field.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTasbeeh } from '@/features/tasbeeh/hooks/useTasbeeh';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

/** Only digits, and empty parses to zero rather than NaN. */
function toNumber(value: string, fallback: number): number {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length === 0) return fallback;
  return Number.parseInt(digits, 10);
}

export default function TasbeehEditScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { find, create, edit } = useTasbeeh();

  const existing = id ? find(id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [arabic, setArabic] = useState(existing?.arabic ?? '');
  const [roundSize, setRoundSize] = useState(String(existing?.roundSize ?? 33));
  const [dailyTarget, setDailyTarget] = useState(String(existing?.dailyTarget ?? 0));

  const canSave = name.trim().length > 0;

  const onSave = () => {
    if (!canSave) return;

    const draft = {
      name,
      arabic,
      roundSize: toNumber(roundSize, 33),
      dailyTarget: toNumber(dailyTarget, 0),
    };

    if (existing) edit(existing.id, draft);
    else create(draft);

    router.back();
  };

  const inputStyle = {
    color: colors.text,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  };

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10" keyboardShouldPersistTaps="handled">
        <ScreenHeader title={existing ? t('tasbeeh.editTitle') : t('tasbeeh.add')} />

        <Card className="gap-4">
          <View className="gap-1">
            <Text variant="caption" tone="subtle">
              {t('tasbeeh.name')}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('tasbeeh.namePlaceholder')}
              placeholderTextColor={colors.textSubtle}
              className="rounded-xl border px-3 py-3"
              style={inputStyle}
              accessibilityLabel={t('tasbeeh.name')}
            />
          </View>

          <View className="gap-1">
            <Text variant="caption" tone="subtle">
              {t('tasbeeh.arabic')}
            </Text>
            <TextInput
              value={arabic}
              onChangeText={setArabic}
              placeholder={t('tasbeeh.arabicPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              multiline
              // The field holds Arabic, so it must lay out right-to-left even
              // though the surrounding interface does not.
              style={[inputStyle, { writingDirection: 'rtl', textAlign: 'right', minHeight: 64 }]}
              className="rounded-xl border px-3 py-3"
              accessibilityLabel={t('tasbeeh.arabic')}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Text variant="caption" tone="subtle">
                {t('tasbeeh.roundSize')}
              </Text>
              <TextInput
                value={roundSize}
                onChangeText={setRoundSize}
                keyboardType="number-pad"
                className="rounded-xl border px-3 py-3"
                style={inputStyle}
                accessibilityLabel={t('tasbeeh.roundSize')}
              />
            </View>

            <View className="flex-1 gap-1">
              <Text variant="caption" tone="subtle">
                {t('tasbeeh.dailyTarget')}
              </Text>
              <TextInput
                value={dailyTarget}
                onChangeText={setDailyTarget}
                keyboardType="number-pad"
                className="rounded-xl border px-3 py-3"
                style={inputStyle}
                accessibilityLabel={t('tasbeeh.dailyTarget')}
              />
            </View>
          </View>

          <Text variant="caption" tone="muted">
            {t('tasbeeh.targetHint')}
          </Text>
        </Card>

        <View className="mt-6">
          <Button label={t('common.save')} onPress={onSave} disabled={!canSave} />
        </View>
      </ScrollView>
    </Screen>
  );
}
