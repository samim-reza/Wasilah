/**
 * Native fallback for the admin route.
 *
 * expo-router requires every `*.web.tsx` route to have a sibling without the
 * platform extension — without this the whole web export fails, which is
 * exactly what took the deploy down.
 *
 * It is deliberately a stub. The real panel is `admin.web.tsx` and exists only
 * in the web bundle: an admin surface inside a binary on someone's phone is
 * attack surface for no benefit. This file must stay free of admin logic for
 * that reason, not merely as a convention.
 */
import { ScrollView } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { branding } from '@/config/branding';

export default function AdminNotAvailableScreen() {
  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <ScreenHeader title="Admin" />
        <Card>
          <Text tone="muted">
            {`The admin panel is on the web only, at ${branding.websiteUrl}admin.`}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
