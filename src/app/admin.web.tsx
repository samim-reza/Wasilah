/**
 * The admin panel, served at /admin.
 *
 * `.web.tsx` is load-bearing: Metro only resolves this file for the web
 * bundle, so none of it — not the screen, not the queries — ships inside the
 * Android app. An admin surface in a binary on someone's phone is attack
 * surface for no benefit.
 *
 * Authorisation is NOT enforced here. This screen hides itself from
 * non-admins, but that is presentation only — anyone can edit a JavaScript
 * bundle. The real check is row level security: `is_admin()` runs inside the
 * policies on every table below, so a tampered client sends its writes and
 * the database refuses them. What you see here is a convenience over that,
 * never the gate.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '@/theme/useTheme';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  rollout_percentage: number;
  description: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminScreen() {
  const userId = useUserId();
  const { colors } = useTheme();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  /**
   * Membership is read from `admin_users`, which every user may read exactly
   * one row of — their own. A non-admin gets an empty result rather than a
   * permission error, so this needs no special handling.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!userId) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!cancelled) setIsAdmin(Boolean(data));
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Bumped after every successful write to pull the tables again.
   *
   * A counter rather than calling a loader directly from the handlers: the
   * fetch then lives in one effect with one cancellation guard, instead of
   * several call sites each able to land after the screen unmounts.
   */
  const [refreshToken, setRefreshToken] = useState(0);
  const reload = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    void (async () => {
      const [flagResult, announcementResult] = await Promise.all([
        supabase.from('feature_flags').select('*').order('key'),
        supabase.from('app_announcements').select('*').order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;
      if (flagResult.data) setFlags(flagResult.data as FeatureFlag[]);
      if (announcementResult.data) setAnnouncements(announcementResult.data as Announcement[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, refreshToken]);

  const toggleFlag = async (flag: FeatureFlag, enabled: boolean) => {
    // Optimistic, then reconciled by reloading. A rejected write is the
    // database refusing an unauthorised caller, which must be visible.
    setFlags((current) =>
      current.map((entry) => (entry.key === flag.key ? { ...entry, enabled } : entry)),
    );

    const { error: writeError } = await supabase
      .from('feature_flags')
      .update({ enabled })
      .eq('key', flag.key);

    if (writeError) {
      logger.warn('admin.flagWriteFailed', { error: writeError });
      setError('That change was rejected. Reloading the current state.');
      reload();
      return;
    }
    setError(null);
  };

  const publish = async () => {
    if (title.trim().length === 0) return;

    const { error: writeError } = await supabase
      .from('app_announcements')
      .insert({ title: title.trim(), body: body.trim(), is_active: true });

    if (writeError) {
      logger.warn('admin.announcementFailed', { error: writeError });
      setError('That announcement was rejected.');
      return;
    }

    setTitle('');
    setBody('');
    setError(null);
    reload();
  };

  const retire = async (announcement: Announcement) => {
    await supabase
      .from('app_announcements')
      .update({ is_active: !announcement.is_active })
      .eq('id', announcement.id);
    reload();
  };

  if (isAdmin === null) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen edges={['top']} noPadding>
        <ScrollView contentContainerClassName="px-4 pb-10">
          <ScreenHeader title="Admin" />
          <Card className="gap-4">
            <Text tone="muted">
              {userId
                ? 'This account is not an administrator.'
                : 'Sign in with an administrator account to continue.'}
            </Text>

            {/* The screen used to say "sign in" and then offer no way to do
                it — the sign-in route is not linked from anywhere on the web,
                since the app reaches it through the profile tab. */}
            {!userId && (
              <Button label="Sign in" onPress={() => router.push('/(auth)/login')} />
            )}
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  const inputStyle = {
    color: colors.text,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  };

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title="Admin" />

        {error && (
          <Card className="mb-4">
            <Text tone="accent">{error}</Text>
          </Card>
        )}

        <Text variant="label" tone="subtle" className="mb-2">
          Feature flags
        </Text>
        <Card className="mb-6 gap-1">
          {flags.length === 0 && <Text tone="muted">No flags defined.</Text>}
          {flags.map((flag) => (
            <Switch
              key={flag.key}
              label={flag.key}
              hint={flag.description ?? undefined}
              value={flag.enabled}
              onValueChange={(value) => void toggleFlag(flag, value)}
            />
          ))}
        </Card>

        <Text variant="label" tone="subtle" className="mb-2">
          New announcement
        </Text>
        <Card className="mb-6 gap-3">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textSubtle}
            className="rounded-xl border px-3 py-3"
            style={inputStyle}
            accessibilityLabel="Announcement title"
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Body"
            placeholderTextColor={colors.textSubtle}
            multiline
            className="rounded-xl border px-3 py-3"
            style={[inputStyle, { minHeight: 80 }]}
            accessibilityLabel="Announcement body"
          />
          <Pressable
            onPress={() => void publish()}
            disabled={title.trim().length === 0}
            accessibilityRole="button"
            className="items-center rounded-xl bg-primary py-3 disabled:opacity-50"
          >
            <Text className="font-semibold text-white">Publish</Text>
          </Pressable>
        </Card>

        <Text variant="label" tone="subtle" className="mb-2">
          Announcements
        </Text>
        <View className="gap-3">
          {announcements.length === 0 && (
            <Card>
              <Text tone="muted">Nothing published yet.</Text>
            </Card>
          )}
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="gap-2">
              <Text className="font-semibold">{announcement.title}</Text>
              {announcement.body.length > 0 && (
                <Text variant="caption" tone="muted">
                  {announcement.body}
                </Text>
              )}
              <Pressable onPress={() => void retire(announcement)} accessibilityRole="button">
                <Text variant="caption" tone="accent">
                  {announcement.is_active ? 'Deactivate' : 'Reactivate'}
                </Text>
              </Pressable>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
