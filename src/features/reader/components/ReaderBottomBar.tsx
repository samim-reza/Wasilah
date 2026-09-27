/**
 * The reader's bottom bar: reading and listening controls, laid out like the
 * tab bar the user already knows from Home.
 *
 * It owns the surah-level actions that used to be squeezed onto every ayah:
 * playing on from where you are, repeating a passage, and letting the page
 * scroll by itself. Each ayah keeps only its own single-ayah play button.
 */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

/** Height of the bar's content, above the safe-area inset. */
export const READER_BAR_HEIGHT = 58;

export interface ReaderBottomBarProps {
  autoScrollOn: boolean;
  onToggleAutoScroll: () => void;
  /** 1-based, for display. */
  speedLevel: number;
  onCycleSpeed: () => void;
  /** Whether anything is being recited right now. */
  isPlaying: boolean;
  isBuffering: boolean;
  /** This surah's recitation is loaded, so previous and next make sense. */
  canSkip: boolean;
  /** 0–1 through the current ayah, or null when this surah is not loaded. */
  progress: number | null;
  onPlayPress: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenPlayOptions: () => void;
  /** True when a repeat is set, so the repeat button shows it is on. */
  repeatActive: boolean;
}

export function ReaderBottomBar({
  autoScrollOn,
  onToggleAutoScroll,
  speedLevel,
  onCycleSpeed,
  isPlaying,
  isBuffering,
  canSkip,
  progress,
  onPlayPress,
  onPrevious,
  onNext,
  onOpenPlayOptions,
  repeatActive,
}: ReaderBottomBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute inset-x-0 bottom-0 border-t border-border bg-surface"
      style={{ paddingBottom: insets.bottom }}
    >
      {progress !== null && (
        <ProgressBar value={progress} height={2} accessibilityLabel={t('audio.nowPlaying')} />
      )}

      <View
        className="flex-row items-center justify-around px-1"
        style={{ height: READER_BAR_HEIGHT }}
      >
        <BarItem
          icon={autoScrollOn ? 'autoScrollOn' : 'autoScroll'}
          label={t('reader.autoScroll')}
          active={autoScrollOn}
          onPress={onToggleAutoScroll}
          accessibilityState={{ checked: autoScrollOn }}
        />

        <Pressable
          onPress={onCycleSpeed}
          className="min-w-[52px] items-center justify-center py-1"
          accessibilityRole="button"
          accessibilityLabel={t('reader.scrollSpeedLevel', { level: speedLevel })}
        >
          <View className="h-6 items-center justify-center">
            <Text className="font-bold tabular-nums" tone={autoScrollOn ? 'primary' : 'muted'}>
              {`${speedLevel}×`}
            </Text>
          </View>
          <Text variant="caption" tone="subtle" className="text-[10px]">
            {t('reader.scrollSpeed')}
          </Text>
        </Pressable>

        <BarItem
          icon="skipPrevious"
          label={t('reader.previousShort')}
          onPress={onPrevious}
          disabled={!canSkip}
        />

        <Pressable
          onPress={onPlayPress}
          haptic="light"
          className="h-12 w-12 items-center justify-center rounded-full bg-primary"
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? t('audio.pause') : t('reader.playFromHere')}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={24} color="primaryForeground" />
        </Pressable>

        <BarItem
          icon="skipNext"
          label={t('reader.nextShort')}
          onPress={onNext}
          disabled={!canSkip}
        />

        <BarItem
          icon="repeat"
          label={isBuffering ? t('audio.buffering') : t('audio.repeat')}
          active={repeatActive}
          onPress={onOpenPlayOptions}
        />
      </View>
    </View>
  );
}

function BarItem({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  accessibilityState,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  accessibilityState?: { checked?: boolean };
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-w-[52px] items-center justify-center py-1 ${disabled ? 'opacity-40' : ''}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, ...accessibilityState }}
    >
      <Icon name={icon} size={22} color={active ? 'primary' : 'textMuted'} />
      <Text
        variant="caption"
        tone={active ? 'primary' : 'subtle'}
        className="text-[10px]"
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
