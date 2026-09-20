/**
 * The screen a dua notification opens.
 *
 * Deliberately one screen with no next step: the words, how to say them, what
 * they mean, and where they come from. Nothing to dismiss, nothing upsold. A
 * reminder that leads somewhere demanding is a reminder people switch off.
 */
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { findOccasion, SOURCE_PLACEHOLDER } from '@/features/duas/data/duaCatalogue';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function DuaDetailScreen() {
  const { t } = useTranslation();
  const { occasionId } = useLocalSearchParams<{ occasionId: string }>();
  const occasion = findOccasion(occasionId ?? '');

  // A notification can outlive the build that scheduled it, so an id that no
  // longer exists is an ordinary state rather than an error.
  if (!occasion) {
    return (
      <Screen edges={['top']} noPadding>
        <ScrollView contentContainerClassName="px-4 pb-10">
          <ScreenHeader title={t('quran.duaTitle')} />
          <Card>
            <Text tone="muted">{t('quran.duaUnavailable')}</Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  const { text } = occasion;
  const hasSource = text.source !== SOURCE_PLACEHOLDER;

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title={occasion.title} />

        <Card className="mb-4 items-center gap-4 py-8">
          <Text
            className="font-arabic text-center text-content"
            style={{ fontSize: 30, lineHeight: 64 }}
          >
            {text.arabic}
          </Text>
        </Card>

        <Card className="mb-4 gap-2">
          <Text variant="caption" tone="subtle">
            {t('quran.pronunciation')}
          </Text>
          <Text className="italic">{text.transliteration}</Text>
        </Card>

        <Card className="mb-4 gap-2">
          <Text variant="caption" tone="subtle">
            {t('quran.meaning')}
          </Text>
          <Text>{text.translation}</Text>
        </Card>

        {text.benefit.length > 0 && (
          <Card className="mb-4 gap-2">
            <Text variant="caption" tone="subtle">
              {t('quran.duaWhySaid')}
            </Text>
            <Text>{text.benefit}</Text>
          </Card>
        )}

        {/*
          The citation is shown, not hidden behind a tap. A supplication tied to
          an occasion is only legitimate because something transmits it, so the
          source belongs on the same screen as the words.
        */}
        {hasSource && (
          <View className="px-1 pt-2">
            <Text variant="caption" tone="muted">
              {text.source}
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
