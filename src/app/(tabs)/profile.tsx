/**
 * Profile.
 *
 * Doubles as the settings hub. For a guest it leads with the reason to create
 * an account (syncing a streak across devices) without ever blocking anything.
 */
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { useHabitState } from '@/features/streak/hooks/useHabitState';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { confirm } from '@/lib/ui/confirm';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, isGuest, signOut } = useAuth();
  const habit = useHabitState();

  const handleSignOut = () => {
    void (async () => {
      const confirmed = await confirm({
        title: t('profile.signOutConfirm'),
        message: t('profile.signOutBody'),
        confirmLabel: t('profile.signOut'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (confirmed) await signOut();
    })();
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen noPadding>
      <ScrollView contentContainerClassName="px-4 pb-8">
        <Text variant="heading" className="py-3" accessibilityRole="header">
          {t('profile.title')}
        </Text>

        {isGuest ? (
          <Card className="mb-6 gap-3">
            <Text className="font-semibold">{t('profile.guestMode')}</Text>
            <Text variant="caption" tone="muted">
              {t('profile.guestBody')}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('profile.signUp')}
                  onPress={() => router.push('/(auth)/signup')}
                  fullWidth
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('profile.signIn')}
                  onPress={() => router.push('/(auth)/login')}
                  variant="secondary"
                  fullWidth
                />
              </View>
            </View>
          </Card>
        ) : (
          <Card className="mb-6 gap-1">
            <Text className="font-semibold">
              {(user?.user_metadata?.['display_name'] as string | undefined) ?? t('profile.title')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('profile.signedInAs', { email: user?.email ?? '' })}
            </Text>
          </Card>
        )}

        <Card tone="muted" className="mb-6 flex-row justify-between">
          <SummaryStat label={t('streak.current')} value={String(habit.currentStreak)} />
          <SummaryStat label={t('streak.longest')} value={String(habit.streak.longestStreak)} />
          <SummaryStat label={t('streak.totalDays')} value={String(habit.streak.totalActiveDays)} />
        </Card>

        <ListSection title={t('common.settings')}>
          <ListRow
            label={t('bookmarks.title')}
            icon="bookmark"
            onPress={() => router.push('/bookmarks')}
          />
          <ListRow label={t('notes.title')} icon="note" onPress={() => router.push('/notes')} />
          <ListRow
            label={t('prayer.title')}
            icon="prayer"
            onPress={() => router.push('/prayer-times')}
          />
          <ListRow
            label={t('reminders.title')}
            icon="notifications"
            onPress={() => router.push('/notification-settings')}
          />
          <ListRow
            label={t('common.settings')}
            icon="settings"
            onPress={() => router.push('/settings')}
          />
        </ListSection>

        <ListSection>
          <ListRow label={t('profile.about')} icon="info" onPress={() => router.push('/about')} />
          <ListRow
            label={t('profile.version', { version })}
            icon="quran"
            // Informational only.
            onPress={undefined}
          />
        </ListSection>

        {!isGuest && (
          <ListSection>
            <ListRow
              label={t('profile.signOut')}
              icon="signOut"
              destructive
              onPress={handleSignOut}
            />
          </ListSection>
        )}
      </ScrollView>
    </Screen>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center" accessible accessibilityLabel={`${label}: ${value}`}>
      <Text className="text-2xl font-bold tabular-nums">{value}</Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
