/**
 * Persistent playback controls.
 *
 * Renders nothing when nothing is playing, so it costs no space in the common
 * case. It lives in the tab bar background so recitation keeps playing — and
 * stays controllable — while the user browses elsewhere in the app.
 */
import { View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { useAudio } from '../hooks/AudioPlayerProvider';

export function MiniPlayer() {
  const audio = useAudio();
  const { t } = useTranslation();

  if (!audio.currentTrack || audio.state === 'idle') return null;

  const progress = audio.durationSeconds > 0 ? audio.positionSeconds / audio.durationSeconds : 0;

  return (
    <View className="absolute inset-x-0 bottom-full border-t border-border bg-surface">
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
