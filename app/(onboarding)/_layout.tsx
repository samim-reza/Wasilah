import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  // Back-swipe is disabled so the four steps stay a sequence; each screen has
  // its own visible Back and Skip.
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
