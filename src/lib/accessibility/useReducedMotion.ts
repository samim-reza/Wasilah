/**
 * Whether animations should be suppressed.
 *
 * Combines the OS "reduce motion" setting with the app's own toggle, so a user
 * can opt out inside Wasilah without changing a system-wide preference. Any
 * animation longer than a fade must check this.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [systemPrefersReduced, setSystemPrefersReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemPrefersReduced(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemPrefersReduced,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return systemPrefersReduced;
}
