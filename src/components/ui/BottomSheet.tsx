/**
 * Bottom sheet.
 *
 * Built on Reanimated and gesture-handler rather than pulling in a sheet
 * library: the app needs one sheet behaviour (slide up, drag to dismiss, tap
 * the scrim to close) and that is a small amount of code we fully control.
 *
 * The drag gesture and the spring both run on the UI thread, so the sheet stays
 * at 60fps even while the ayah list underneath is still rendering.
 *
 * `react-hooks/immutability` is disabled for this file: Reanimated shared values
 * are native objects living on the UI thread, and assigning to `.value` is the
 * library's documented API. It triggers no React render, so the cascading-render
 * hazard the rule guards against does not apply.
 */
/* eslint-disable react-hooks/immutability */
import { useCallback, useEffect } from 'react';
import { Modal, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/lib/accessibility/useReducedMotion';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { duration } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

/** Drag distance past which releasing dismisses instead of snapping back. */
const DISMISS_THRESHOLD_RATIO = 0.3;
/** Downward velocity that dismisses regardless of distance, in px/s. */
const DISMISS_VELOCITY = 800;

const SPRING = { damping: 22, stiffness: 240, mass: 0.8 } as const;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Fraction of screen height the sheet occupies. */
  heightRatio?: number;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  heightRatio = 0.6,
}: BottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const sheetHeight = screenHeight * heightRatio;
  const translateY = useSharedValue(sheetHeight);
  const scrimOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = reducedMotion ? 0 : withSpring(0, SPRING);
      scrimOpacity.value = withTiming(1, { duration: duration.fast });
    } else {
      translateY.value = sheetHeight;
      scrimOpacity.value = 0;
    }
  }, [visible, sheetHeight, reducedMotion, translateY, scrimOpacity]);

  const close = useCallback(() => {
    scrimOpacity.value = withTiming(0, { duration: duration.fast });
    translateY.value = withTiming(sheetHeight, { duration: duration.normal }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [onClose, sheetHeight, scrimOpacity, translateY]);

  const dragGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only downward drags move the sheet; pulling up should feel like a wall.
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldDismiss =
        event.translationY > sheetHeight * DISMISS_THRESHOLD_RATIO ||
        event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        translateY.value = withTiming(sheetHeight, { duration: duration.fast }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  return (
    <Modal
      visible={visible}
      transparent
      // The OS back gesture must close the sheet, not the screen behind it.
      onRequestClose={close}
      animationType="none"
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Animated.View
          className="absolute inset-0 bg-black/50"
          style={scrimStyle}
          onTouchEnd={close}
          accessibilityElementsHidden
        />

        <GestureDetector gesture={dragGesture}>
          <Animated.View
            className="rounded-t-2xl bg-surface"
            style={[{ height: sheetHeight, paddingBottom: insets.bottom }, sheetStyle]}
            accessibilityViewIsModal
          >
            {/* Drag handle — decorative; dismissal is also available via the button. */}
            <View className="items-center py-3">
              <View className="h-1 w-10 rounded-full bg-border-strong" />
            </View>

            {title && (
              <View className="flex-row items-center justify-between border-b border-border px-4 pb-3">
                <Text variant="subheading">{title}</Text>
                <IconButton
                  name="close"
                  onPress={close}
                  accessibilityLabel={t('a11y.closeSheet')}
                  size={20}
                />
              </View>
            )}

            <View className="flex-1">{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
