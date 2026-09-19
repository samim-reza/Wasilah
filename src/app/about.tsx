/**
 * About and attribution.
 *
 * Required by the Quran Foundation developer terms, and required by simple
 * honesty: the Quran content in this app comes from someone else's work, and
 * this screen says so plainly. Nothing here may be removed or obscured.
 */
import * as Linking from 'expo-linking';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { Text } from '@/components/ui/Text';
import { attribution, branding } from '@/config/branding';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function AboutScreen() {
  const { t } = useTranslation();

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title={t('about.title')} />

        <View className="items-center gap-1 py-6">
          <Text
            className="font-arabic text-content"
            style={{ fontSize: 34, lineHeight: 68 }}
            allowFontScaling={false}
          >
            {branding.appNameArabic}
          </Text>
          <Text variant="heading">{branding.appName}</Text>
          <Text variant="caption" tone="muted">
            {branding.tagline}
          </Text>
        </View>

        <Card className="mb-6 gap-3">
          <Text className="font-semibold">
            {t('about.quranSource', { provider: attribution.quranDataProvider })}
          </Text>
          <Text variant="caption" tone="muted">
            {t('about.independence')}
          </Text>
        </Card>

        <ListSection title={t('profile.credits')}>
          <ListRow
            label={attribution.quranDataProvider}
            hint="Quran content, translations, tafsir and recitations"
            icon="quran"
            onPress={() => void Linking.openURL(attribution.quranDataProviderUrl)}
          />
          <ListRow
            label="Amiri Quran"
            hint="Arabic typeface · SIL Open Font Licence 1.1"
            icon="textSize"
          />
          <ListRow
            label="Noto Sans Bengali"
            hint="Bengali typeface · SIL Open Font Licence 1.1"
            icon="language"
          />
        </ListSection>

        <ListSection>
          <ListRow
            label={t('profile.privacy')}
            icon="lock"
            onPress={() => void Linking.openURL(branding.privacyPolicyUrl)}
          />
          <ListRow
            label={t('profile.terms')}
            icon="info"
            onPress={() => void Linking.openURL(branding.termsUrl)}
          />
        </ListSection>
      </ScrollView>
    </Screen>
  );
}
