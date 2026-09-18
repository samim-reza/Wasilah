/**
 * Notification permission state and the request flow.
 *
 * The OS shows its prompt once. Screens must therefore explain the value first
 * and call `request()` only in response to a deliberate action — never on
 * mount.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { trackEvent } from '@/lib/analytics/analytics';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import {
  configureChannels,
  getPermissionState,
  requestPermission,
} from '../services/notificationService';
import type { NotificationPermissionState } from '../types/notification.types';

const initialState: NotificationPermissionState = {
  status: 'undetermined',
  canShowAlerts: false,
  isBlocked: false,
};

export interface UseNotificationPermissionsResult extends NotificationPermissionState {
  isLoading: boolean;
  /** True once the app has asked at least once. */
  hasAsked: boolean;
  request: () => Promise<boolean>;
  openSystemSettings: () => void;
  refresh: () => Promise<void>;
}

export function useNotificationPermissions(): UseNotificationPermissionsResult {
  const [state, setState] = useState<NotificationPermissionState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAsked, setHasAsked] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getPermissionState();
    setState(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // `refresh` awaits the OS before setting state, so this is an async
    // initialisation rather than the synchronous cascade the rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    void keyValueStore
      .get<boolean>(storageKeys.notificationPermissionAsked)
      .then((value) => setHasAsked(Boolean(value)));
  }, [refresh]);

  // A user who leaves to change the setting in system settings must come back
  // to an app that reflects the change.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    trackEvent('notification_permission_requested', {});

    const next = await requestPermission();
    setState(next);
    setHasAsked(true);
    await keyValueStore.set(storageKeys.notificationPermissionAsked, true);

    trackEvent('notification_permission_result', { granted: next.status === 'granted' });

    // Channels can only be created once permission exists on some Android
    // versions, so this runs after the grant rather than at startup.
    if (next.status === 'granted') await configureChannels();

    return next.status === 'granted';
  }, []);

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings().catch(() => {
      if (Platform.OS === 'android') void Linking.openURL('app-settings:');
    });
  }, []);

  return { ...state, isLoading, hasAsked, request, openSystemSettings, refresh };
}
