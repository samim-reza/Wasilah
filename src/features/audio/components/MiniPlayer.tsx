/**
 * Persistent playback controls.
 *
 * Renders nothing when nothing is playing, so it costs no space in the common
 * case.
 *
 * Mounted once in the ROOT layout, not in the tab navigator. It used to be
 * passed as `tabBarBackground`, which broke it two ways: that slot renders
 * behind the bar's own content, and the player positioned itself outside the
 * bar's bounds — where Android does not deliver touches to children at all, so
 * the close and skip buttons were dead. It also meant recitation became
 * uncontrollable the moment the user opened the reader, which is not a tab.
 *
 * As a root overlay it sits above every screen and owns its own hit area. The
 * only thing it has to know about the tab bar is how far to sit above it.
 */
import { usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { useAudio } from '../hooks/AudioPlayerProvider';

/** Height of the tab bar this has to clear on tab screens. */
const TAB_BAR_HEIGHT = 49;

/** Route prefixes that render a tab bar underneath the player. */
const TAB_ROUTES = ['/home', '/quran', '/progress', '/profile'];

export function MiniPlayer() {
  const audio = useAudio();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  if (!audio.currentTrack || audio.state === 'idle') return null;

  // On a tab screen the bar is below us and must not be covered; everywhere
  // else the player can sit directly on the safe area.
  const isTabScreen = TAB_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const bottom = insets.bottom + (isTabScreen ? TAB_BAR_HEIGHT : 0);

  const progress = audio.durationSeconds > 0 ? audio.positionSeconds / audio.durationSeconds : 0;

  return (
    <View
      className="absolute inset-x-0 border-t border-border bg-surface"
      style={{ bottom }}
    >
      <ProgressBar value={progress} height={2} accessibilityLabel={t('audio.nowPlaying')} />

      <View className="flex-row items-center gap-2 px-3 py-2">
        <View className="flex-1">
          <Text variant="caption" className="font-semibold" numberOfLines={1}>
            {audio.currentTrack.verseKey}
          </Text>
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {audio.state === 'loading' ? t('audio.buffering') : t('audio.nowPlaying')}
          </Text>
        </View>

        <IconButton
          name="skipPrevious"
          size={18}
          onPress={audio.previous}
          accessibilityLabel={t('audio.previous')}
        />
        <IconButton
          name={audio.state === 'playing' ? 'pause' : 'play'}
          size={22}
          color="primary"
          onPress={audio.toggle}
          accessibilityLabel={audio.state === 'playing' ? t('audio.pause') : t('audio.play')}
        />
        <IconButton
          name="skipNext"
          size={18}
          onPress={audio.next}
          accessibilityLabel={t('audio.next')}
        />
        <IconButton
          name="close"
          size={18}
          color="textSubtle"
          onPress={audio.stop}
          accessibilityLabel={t('audio.stop')}
        />
      </View>
    </View>
  );
}
