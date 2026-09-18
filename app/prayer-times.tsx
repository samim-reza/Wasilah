/**
 * Prayer times, and the reminders anchored to them.
 *
 * Times are calculated entirely on this device from a coarse location; nothing
 * is sent to a server. Which calculation method is correct is a matter of local
 * scholarly convention, so the app offers the standard set and never presents
 * one as authoritative.
 */
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { PrayerTimeRow } from '@/features/prayer/components/PrayerTimeRow';
import { usePrayerTimes } from '@/features/prayer/hooks/usePrayerTimes';
import { calculationMethods } from '@/features/prayer/services/prayerTimeService';
import type { DailyPrayerTimes } from '@/features/prayer/types/prayer.types';
import { useReminderSettings } from '@/features/reminders/hooks/useReminderSettings';
import { useTranslation } from '@/lib/i18n/I18nProvider';

interface PrayerRowSpec {
  key: keyof DailyPrayerTimes;
  labelKey: string;
  icon: IconName;
  informational?: boolean;
}

const rows: PrayerRowSpec[] = [
  { key: 'fajr', labelKey: 'prayer.fajr', icon: 'prayer' },
  { key: 'sunrise', labelKey: 'prayer.sunrise', icon: 'sun', informational: true },
  { key: 'dhuhr', labelKey: 'prayer.dhuhr', icon: 'sun' },
  { key: 'asr', labelKey: 'prayer.asr', icon: 'sun' },
  { key: 'maghrib', labelKey: 'prayer.maghrib', icon: 'prayer' },
  { key: 'isha', labelKey: 'prayer.isha', icon: 'prayer' },
];

export default function PrayerTimesScreen() {
  const { t } = useTranslation();
  const prayer = usePrayerTimes();
  const reminders = useReminderSettings();

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title={t('prayer.title')} subtitle={prayer.settings.cityLabel ?? undefined} />

        {!prayer.hasLocation ? (
          <Card className="mt-2 gap-3">
            <View className="flex-row items-center gap-2">
              <Icon name="location" size={18} color="primary" />
              <Text className="font-semibold">{t('prayer.locationNeeded')}</Text>
            </View>

            <Text variant="caption" tone="muted">
              {t('prayer.locationNeededBody')}
            </Text>

            <Button
              label={t('prayer.enableLocation')}
              onPress={() => void prayer.enableLocation()}
              loading={prayer.isRequestingLocation}
              icon="location"
              fullWidth
            />
          </Card>
        ) : prayer.times ? (
          <>
            <Card className="mt-2 gap-0.5 p-2">
              {rows.map((row) => (
                <PrayerTimeRow
                  key={row.key}
                  labelKey={row.labelKey}
                  time={(prayer.times as DailyPrayerTimes)[row.key]}
                  // Sunrise is never "next": it is not a prayer.
                  isNext={!row.informational && prayer.next?.name === row.key}
                  isInformational={row.informational}
                  icon={row.icon}
                />
              ))}
            </Card>

            <View className="mt-6 gap-2">
              <Text variant="label" tone="subtle">
                {t('prayer.madhab')}
              </Text>
              <SegmentedControl<'shafi' | 'hanafi'>
                options={[
                  { value: 'shafi', label: t('prayer.madhabShafi') },
                  { value: 'hanafi', label: t('prayer.madhabHanafi') },
                ]}
                value={prayer.settings.madhab}
                onChange={(madhab) => void prayer.updateSettings({ madhab })}
                accessibilityLabel={t('prayer.madhab')}
              />
            </View>

            <ListSection title={t('prayer.calculationMethod')}>
              {calculationMethods.map((method) => (
                <ListRow
                  key={method}
                  label={method.replace(/([a-z])([A-Z])/g, '$1 $2')}
                  value={prayer.settings.calculationMethod === method ? '✓' : undefined}
                  onPress={() => void prayer.updateSettings({ calculationMethod: method })}
                />
              ))}
            </ListSection>
          </>
        ) : (
          <Card className="mt-2">
            <Text tone="muted">{t('errors.notFound')}</Text>
          </Card>
        )}

        <ListSection title={t('reminders.title')}>
          <ListRow
            label={t('reminders.prayerReminders')}
            hint={
              reminders.preferences.prayerRemindersEnabled ? undefined : t('weather.locationNeeded')
            }
            value={reminders.preferences.prayerRemindersEnabled ? t('common.on') : t('common.off')}
            icon="notifications"
            onPress={() => router.push('/notification-settings')}
          />
        </ListSection>

        <Text variant="caption" tone="subtle" className="px-1">
          {t('prayer.locationNeededBody')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
