/**
 * Transient confirmations ("Bookmarked", "Copied").
 *
 * A single queue-free toast host: a new toast replaces the current one rather
 * than stacking. Stacked toasts in a reading app end up covering the text the
 * user is trying to read.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

export type ToastTone = 'neutral' | 'success' | 'error';

interface ToastOptions {
  tone?: ToastTone;
  icon?: IconName;
  /** Milliseconds on screen. */
  durationMs?: number;
}

interface ToastState extends Required<Omit<ToastOptions, 'icon'>> {
  id: number;
  message: string;
  icon?: IconName;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  neutral: 'bg-content',
  success: 'bg-success',
  error: 'bg-danger',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const durationMs = options.durationMs ?? 2200;
    const next: ToastState = {
      id: Date.now(),
      message,
      tone: options.tone ?? 'neutral',
      icon: options.icon,
      durationMs,
    };

    setToast(next);
    timeoutRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {toast && (
        <View
          className="absolute inset-x-0 items-center px-4"
          style={{ bottom: insets.bottom + 80 }}
          pointerEvents="none"
        >
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(140)}
            className={`flex-row items-center gap-2 rounded-full px-4 py-3 ${toneClasses[toast.tone]}`}
            // Announced by the screen reader without stealing focus.
            accessibilityLiveRegion="polite"
            accessible
          >
            {toast.icon && <Icon name={toast.icon} size={16} tint="#FFFFFF" />}
            <Text className="text-sm font-medium text-white">{toast.message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
