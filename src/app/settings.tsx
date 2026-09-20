/**
 * Settings.
 *
 * Grouped by what the user is trying to change, not by which table the value
 * lives in. Privacy toggles are opt-in and default to off.
 */
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { useReaderPreferences } from '@/features/reader/hooks/useReaderPreferences';
import { useAppPreferences } from '@/features/settings/hooks/useAppPreferences';
import { localeNames, supportedLocales, type Locale } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { confirm } from '@/lib/ui/confirm';
import { useTheme } from '@/theme/useTheme';
import type { ThemePreference } from '@/theme/types';

export default function SettingsScreen() {
  const { t, locale, setLocale } = useTranslation();
  const { preference, setPreference } = useTheme();
  const { isGuest } = useAuth();
  const appPreferences = useAppPreferences();
  const { preferences: reader, update: updateReader } = useReaderPreferences();

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ];

  const handleDeleteAccount = () => {
    void (async () => {
      const confirmed = await confirm({
        title: t('settings.deleteAccount'),
        message: t('settings.deleteAccountBody'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (confirmed) await appPreferences.deleteAccount();
    })();
  };

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title={t('settings.title')} />

        <View className="mb-6 mt-2 gap-2">
          <Text variant="label" tone="subtle">
            {t('settings.theme')}
          </Text>
          <SegmentedControl<ThemePreference>
            options={themeOptions}
            value={preference}
            onChange={setPreference}
            accessibilityLabel={t('settings.theme')}
          />
        </View>

        <ListSection title={t('settings.language')}>
          {supportedLocales.map((code) => (
            <ListRow
              key={code}
              label={localeNames[code as Locale]}
              value={locale === code ? '✓' : undefined}
              onPress={() => setLocale(code as Locale)}
            />
          ))}
        </ListSection>

        <ListSection title={t('settings.reading')}>
          <ListRow
            label={t('reader.arabicSize')}
            value={String(reader.arabicFontSize)}
            icon="textSize"
          />
          <ListRow
            label={t('reader.selectTranslation')}
            value={String(reader.translationIds.length)}
            icon="language"
            onPress={() => router.push('/reader-translations')}
          />
          <ListRow
            label={t('reader.selectReciter')}
            icon="volume"
            onPress={() => router.push('/reader-reciters')}
          />
          <ListRow
            label={t('quran.tafsir')}
            value={reader.tafsirId === null ? t('common.off') : undefined}
            icon="info"
            onPress={() => router.push('/reader-tafsirs')}
          />
          {/*
            A bare Switch in a padded View, NOT a ListRow accessory.
            `Switch` is a full-width row in its own right — label on the left,
            toggle on the right — so putting it in the narrow accessory slot
            let its flex-1 label consume the width and squeezed the toggle to
            nothing, leaving a label with no control. This matches how every
            switch on the notification settings screen is laid out.
          */}
          <View className="px-4">
            <Switch
              label={t('reader.showWordByWord')}
              hint={t('reader.showWordByWordHint')}
              value={reader.showWordByWord}
              onValueChange={(value) => void updateReader({ showWordByWord: value })}
            />
          </View>
        </ListSection>

        <ListSection title={t('settings.notifications')}>
          <ListRow
            label={t('reminders.title')}
            icon="notifications"
            onPress={() => router.push('/notification-settings')}
          />
        </ListSection>

        <ListSection title={t('settings.privacy')}>
          <View className="px-4">
            <Switch
              label={t('settings.analyticsOptIn')}
              hint={t('settings.analyticsBody')}
              value={appPreferences.analyticsOptIn}
              onValueChange={(value) => void appPreferences.setAnalyticsOptIn(value)}
            />
            <Switch
              label={t('settings.crashReports')}
              value={appPreferences.crashReportsOptIn}
              onValueChange={(value) => void appPreferences.setCrashReportsOptIn(value)}
            />
          </View>
        </ListSection>

        <ListSection>
          <ListRow label={t('profile.about')} icon="info" onPress={() => router.push('/about')} />
        </ListSection>

        {!isGuest && (
          <ListSection title={t('settings.data')}>
            <ListRow
              label={t('settings.deleteAccount')}
              hint={t('settings.deleteAccountBody')}
              icon="error"
              destructive
              onPress={handleDeleteAccount}
            />
          </ListSection>
        )}
      </ScrollView>
    </Screen>
  );
}
