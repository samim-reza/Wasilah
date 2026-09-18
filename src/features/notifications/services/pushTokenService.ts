/**
 * Expo push token registration.
 *
 * Push is only needed for decisions the device cannot make on its own — a
 * server-side reminder for a user whose app has not been opened in days.
 * Everything schedulable locally is scheduled locally, so most users never need
 * a token at all.
 */
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getDeviceTimezone } from '@/lib/datetime/localDate';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';
import type { DevicePlatform } from '@/lib/supabase/database.types';
import { fromPostgrestError } from '@/lib/supabase/errors';

function currentPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Fetches the Expo push token.
 *
 * Returns null rather than throwing on a simulator or a missing project id:
 * neither is an error the user can act on, and push is an optional enhancement.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    logger.debug('push.skippedOnSimulator');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.['eas']?.['projectId'] ?? Constants.easConfig?.projectId;

  if (!projectId) {
    logger.warn('push.missingProjectId');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    logger.warn('push.tokenFetchFailed', { error });
    return null;
  }
}

/**
 * Stores the token against the user.
 *
 * Upserting on the token itself (which is globally unique) means a device that
 * switches accounts moves to the new user rather than receiving both users'
 * notifications.
 */
export async function registerPushToken(userId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: currentPlatform(),
      device_id: Application.getAndroidId?.() ?? null,
      app_version: Application.nativeApplicationVersion,
      timezone: getDeviceTimezone(),
    },
    { onConflict: 'token' },
  );

  if (error) throw fromPostgrestError(error, { userId });
  logger.info('push.tokenRegistered');
}

/** Called on sign-out so the device stops receiving the old user's pushes. */
export async function unregisterPushToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  const { error } = await supabase
    .from('push_tokens')
    .update({ invalidated_at: new Date().toISOString() })
    .eq('token', token);

  if (error) logger.warn('push.unregisterFailed', { error });
}
