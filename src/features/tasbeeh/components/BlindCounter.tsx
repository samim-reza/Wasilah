/**
 * Counting without looking: the screen goes black and the whole of it is the
 * bead.
 *
 * For dhikr with the eyes closed, in the dark, or with the phone in a pocket
 * or lap — the way a physical tasbeeh is used. Nothing is drawn that would
 * pull the eye: no number, no ring, no light but one small ash-grey button in
 * the corner to come back. The count is still felt, through the same haptics
 * as the counter, with the heavier one at each round.
 *
 * A full-screen Modal rather than a styled View so it covers the header and
 * the system bars too; the screen is kept awake, because a screen that dims
 * and locks mid-count would end the sitting.
 */
import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { useKeepScreenAwake } from '@/features/reader/hooks/useKeepScreenAwake';
import { useTranslation } from '@/lib/i18n/I18nProvider';

/** Dim enough not to light a dark room, visible enough to find. */
const ASH = '#2E2E2E';
const ASH_ICON = '#6B6B6B';

export interface BlindCounterProps {
  visible: boolean;
  /** One bead: count it and give the haptic. */
  onCount: () => void;
  onExit: () => void;
}

export function BlindCounter({ visible, onCount, onExit }: BlindCounterProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useKeepScreenAwake(visible);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onExit}
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <StatusBar hidden />
      <Pressable
        onPress={onCount}
        className="flex-1"
        style={{ backgroundColor: '#000000' }}
        accessibilityRole="button"
        accessibilityLabel={t('tasbeeh.countUp')}
        accessibilityHint={t('tasbeeh.blindHint')}
      >
        {/* Its own press target, outside the counting area's handler, so
            reaching for it never adds a bead. */}
        <View
          pointerEvents="box-none"
          className="absolute"
          style={{ right: 20 + insets.right, bottom: 24 + insets.bottom }}
        >
          <Pressable
            onPress={onExit}
            hitSlop={12}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: ASH }}
            accessibilityRole="button"
            accessibilityLabel={t('tasbeeh.blindExit')}
          >
            <Icon name="eye" size={18} tint={ASH_ICON} />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
