/**
 * Entry route.
 *
 * Decides where a launch lands: onboarding for a first run, otherwise the home
 * tab. Kept as a route rather than logic inside the tab layout so a deep link
 * to any other screen bypasses this check entirely and opens directly.
 */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

export default function Index() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    void keyValueStore
      .get<boolean>(storageKeys.onboardingCompleted)
      .then((value) => setHasOnboarded(Boolean(value)));
  }, []);

  // The native splash is still up at this point, so rendering nothing here
  // shows the splash rather than a blank screen.
  if (hasOnboarded === null) return null;

  return <Redirect href={hasOnboarded ? '/(tabs)/home' : '/(onboarding)/welcome'} />;
}
