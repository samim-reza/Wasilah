/**
 * A thin bar shown while offline or while writes are waiting to sync.
 *
 * Kept quiet on purpose: the app works offline, so this is information, not an
 * error. It disappears the moment everything is synced.
 */
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export function OfflineBanner() {
  const { isOnline, pending, isSyncing } = useOfflineSync();
  const { t } = useTranslation();

  const isVisible = !isOnline || pending > 0;
  if (!isVisible) return null;

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
      <View
        className={`flex-row items-center justify-center gap-2 px-4 py-1.5 ${
          isOnline ? 'bg-primary-muted' : 'bg-surface-muted'
        }`}
        accessibilityLiveRegion="polite"
      >
        <Icon
          name={isOnline ? 'sync' : 'offline'}
          size={13}
          color={isOnline ? 'primary' : 'textMuted'}
        />
        <Text variant="caption" tone={isOnline ? 'primary' : 'muted'}>
          {isOnline
            ? isSyncing
              ? t('common.loading')
              : t('offline.pendingSync', { count: pending })
            : t('offline.banner')}
        </Text>
      </View>
    </Animated.View>
  );
}
