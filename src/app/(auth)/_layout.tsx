import { Stack } from 'expo-router';

export default function AuthLayout() {
  // Presented as a modal stack: signing in is always optional and always
  // dismissible, never a wall in front of the Quran.
  return <Stack screenOptions={{ headerShown: false }} />;
}
