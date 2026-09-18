/**
 * Whether this runtime can show notifications at all.
 *
 * Distinct from permission: permission is the user's answer, availability is
 * whether the question can even be asked. Expo Go on Android cannot, so the
 * reminder settings screen explains that rather than showing controls that
 * silently do nothing.
 */
import { useMemo } from 'react';

import { getNotificationsAvailability } from '../services/notificationsGateway';

export interface NotificationsAvailabilityState {
  available: boolean;
  /** True specifically for Expo Go on Android, which needs a dev build. */
  needsDevelopmentBuild: boolean;
}

export function useNotificationsAvailability(): NotificationsAvailabilityState {
  return useMemo(() => {
    const availability = getNotificationsAvailability();
    return {
      available: availability.available,
      needsDevelopmentBuild: availability.reason === 'expo_go_android',
    };
  }, []);
}
