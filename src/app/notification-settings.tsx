/**
 * Reminder settings.
 *
 * Every category can be turned off individually, quiet hours are on by default,
 * and the per-day cap is visible and editable. The design assumption is that
 * the user is doing us a favour by allowing notifications at all.
 */
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { isDuaCatalogueReady } from '@/features/duas/data/duaCatalogue';
import { useEmailReminders } from '@/features/notifications/hooks/useEmailReminders';
import { TimePickerRow } from '@/features/reminders/components/TimePickerRow';
import { useReminderSettings } from '@/features/reminders/hooks/useReminderSettings';
import { formatTimeForDisplay } from '@/lib/datetime/timeOfDay';
import { useTranslation } from '@/lib/i18n/I18nProvider';

/** Mirrors the database check constraint; 0 would mean "off", which the switches already express. */
const MIN_PER_DAY = 1;
const MAX_PER_DAY = 10;

export default function NotificationSettingsScreen() {
  const { t, locale } = useTranslation();
  const settings = useReminderSettings();
  const email = useEmailReminders();


  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title={t('reminders.title')} />

        {!settings.permissionGranted && (
          <Card tone="muted" className="mb-6 mt-2 gap-2">
            <Text className="font-semibold">{t('reminders.permissionRequired')}</Text>
            <Text variant="caption" tone="muted">
              {settings.permissionBlocked
                ? t('reminders.permissionRequiredBody')
                : t('onboarding.permissionBody')}
            </Text>
            <Button
              label={
                settings.permissionBlocked
                  ? t('reminders.openSystemSettings')
                  : t('onboarding.permissionAllow')
              }
              onPress={() => {
                if (settings.permissionBlocked) settings.openSystemSettings();
                else void settings.requestPermission();
              }}
              variant="secondary"
            />
          </Card>
        )}

        <ListSection>
          <View className="px-4">
            <Switch
              label={t('reminders.dailyReminder')}
              value={settings.preferences.dailyReminderEnabled}
              onValueChange={(value) => void settings.update({ dailyReminderEnabled: value })}
              disabled={!settings.permissionGranted || !settings.notificationsSupported}
            />
          </View>

          <TimePickerRow
            label={t('reminders.reminderTime')}
            value={settings.preferences.dailyReminderTime}
            onChange={(time) => void settings.update({ dailyReminderTime: time })}
            disabled={
              !settings.preferences.dailyReminderEnabled ||
              !settings.permissionGranted ||
              !settings.notificationsSupported
            }
          />
        </ListSection>

        <ListSection title={t('settings.notifications')}>
          <View className="px-4">
            <Switch
              label={t('reminders.streakReminder')}
              hint={t('reminders.streakReminderBody')}
              value={settings.preferences.streakReminderEnabled}
              onValueChange={(value) => void settings.update({ streakReminderEnabled: value })}
              disabled={!settings.permissionGranted || !settings.notificationsSupported}
            />
            <Switch
              label={t('reminders.goalReminder')}
              hint={t('reminders.goalReminderBody')}
              value={settings.preferences.goalReminderEnabled}
              onValueChange={(value) => void settings.update({ goalReminderEnabled: value })}
              disabled={!settings.permissionGranted || !settings.notificationsSupported}
            />
            <Switch
              label={t('reminders.prayerReminders')}
              value={settings.preferences.prayerRemindersEnabled}
              onValueChange={(value) => void settings.update({ prayerRemindersEnabled: value })}
              disabled={!settings.permissionGranted || !settings.notificationsSupported}
            />
            {/*
              Only offered to a signed-in user: there is no address to send
              to otherwise. Hidden rather than disabled, because a switch you
              cannot explain is worse than one that is not there.
            */}
            {email.isAvailable && (
              <Switch
                label={t('reminders.emailReminders')}
                hint={t('reminders.emailRemindersBody')}
                value={email.enabled}
                onValueChange={(value) => void email.setEnabled(value)}
                disabled={email.isLoading}
              />
            )}
            <Switch
              label={t('reminders.weatherReminders')}
              hint={t('weather.body')}
              value={settings.preferences.weatherRemindersEnabled}
              onValueChange={(value) => void settings.update({ weatherRemindersEnabled: value })}
              disabled={!settings.permissionGranted || !settings.notificationsSupported}
            />
          </View>
        </ListSection>

        {/*
          Hidden until at least one occasion has real words. The catalogue
          ships with placeholders so the machinery could be built and tested,
          and a toggle that leads to "Placeholder text" is worse than no
          toggle. This re-appears on its own as content lands — no release
          needed, no flag to remember to flip.
        */}
        {isDuaCatalogueReady() && (
        <ListSection title={t('reminders.duas')}>
          <View className="gap-4 px-4">
            <Switch
              label={t('reminders.duaReminders')}
              hint={t('reminders.duaRemindersBody')}
              value={settings.preferences.duaRemindersEnabled}
              onValueChange={(value) => void settings.update({ duaRemindersEnabled: value })}
              disabled={!settings.permissionGranted || !settings.notificationsSupported}
            />
            <Switch
              label={t('reminders.sleepDua')}
              hint={t('reminders.sleepDuaBody')}
              value={settings.preferences.sleepDuaEnabled}
              onValueChange={(value) => void settings.update({ sleepDuaEnabled: value })}
              disabled={!settings.permissionGranted || !settings.notificationsSupported}
            />
          </View>

          {/*
            The time only matters once the nightly prompt is on, so it stays
            disabled until then rather than asking for an answer nothing uses.
          */}
          <TimePickerRow
            label={t('reminders.sleepTime')}
            value={settings.preferences.sleepTime}
            onChange={(time) => void settings.update({ sleepTime: time })}
            disabled={!settings.preferences.sleepDuaEnabled}
          />
        </ListSection>
        )}

        <ListSection title={t('reminders.quietHours')}>
          <View className="px-4">
            <Switch
              label={t('reminders.quietHours')}
              hint={t('reminders.quietHoursBody')}
              value={settings.preferences.quietHoursEnabled}
              onValueChange={(value) => void settings.update({ quietHoursEnabled: value })}
            />
          </View>

          <TimePickerRow
            label={t('common.on')}
            value={settings.preferences.quietHoursStart}
            onChange={(time) => void settings.update({ quietHoursStart: time })}
            disabled={!settings.preferences.quietHoursEnabled}
          />
          <TimePickerRow
            label={t('common.off')}
            value={settings.preferences.quietHoursEnd}
            onChange={(time) => void settings.update({ quietHoursEnd: time })}
            disabled={!settings.preferences.quietHoursEnabled}
          />
        </ListSection>

        <View className="mb-6 gap-2">
          <Text variant="label" tone="subtle">
            {t('reminders.maxPerDay')}
          </Text>
          {/* A stepper rather than chips: the range is 1–10 now, and ten
              chips do not fit a phone width. The database enforces the same
              bounds, so the buttons only mirror them. */}
          <View className="flex-row items-center justify-between rounded-2xl bg-surface px-3 py-2">
            <IconButton
              name="remove"
              size={20}
              color="textMuted"
              disabled={settings.preferences.maxNotificationsPerDay <= MIN_PER_DAY}
              onPress={() =>
                void settings.update({
                  maxNotificationsPerDay: Math.max(
                    MIN_PER_DAY,
                    settings.preferences.maxNotificationsPerDay - 1,
                  ),
                })
              }
              accessibilityLabel={t('common.decrease')}
            />
            <Text
              variant="heading"
              accessibilityLiveRegion="polite"
              accessibilityLabel={t('reminders.maxPerDayValue', {
                count: settings.preferences.maxNotificationsPerDay,
              })}
            >
              {settings.preferences.maxNotificationsPerDay}
            </Text>
            <IconButton
              name="add"
              size={20}
              color="textMuted"
              disabled={settings.preferences.maxNotificationsPerDay >= MAX_PER_DAY}
              onPress={() =>
                void settings.update({
                  maxNotificationsPerDay: Math.min(
                    MAX_PER_DAY,
                    settings.preferences.maxNotificationsPerDay + 1,
                  ),
                })
              }
              accessibilityLabel={t('common.increase')}
            />
          </View>
        </View>

        {settings.nextReminder && (
          <ListSection>
            <ListRow
              label={t('reminders.reminderTime')}
              icon="clock"
              value={formatTimeForDisplay(
                {
                  hour: new Date(settings.nextReminder.scheduledFor).getHours(),
                  minute: new Date(settings.nextReminder.scheduledFor).getMinutes(),
                },
                locale,
              )}
            />
          </ListSection>
        )}
      </ScrollView>
    </Screen>
  );
}
