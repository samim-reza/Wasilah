/**
 * JS face of the widget alarm module (Android only; see the Kotlin beside it).
 *
 * Every function is a no-op elsewhere and when the native module is absent
 * (Expo Go, a build without the module), so callers never need a guard.
 */
import { Platform } from 'react-native';

interface WidgetAlarmNative {
  schedule(times: number[]): boolean;
  cancelAll(): boolean;
  canScheduleExact(): boolean;
  openExactAlarmSettings(): boolean;
}

function load(): WidgetAlarmNative | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: (name: string) => WidgetAlarmNative;
    };
    return requireNativeModule('WidgetAlarm');
  } catch {
    return null;
  }
}

const native = load();

export const WidgetAlarm = {
  /** Replaces every pending wake-up with these instants. */
  schedule(times: readonly Date[]): boolean {
    return native?.schedule(times.map((time) => time.getTime())) ?? false;
  },
  cancelAll(): boolean {
    return native?.cancelAll() ?? false;
  },
  /** Whether alarms land on the minute, or may drift by up to ten. */
  canScheduleExact(): boolean {
    return native?.canScheduleExact() ?? false;
  },
  openExactAlarmSettings(): boolean {
    return native?.openExactAlarmSettings() ?? false;
  },
  isAvailable: native !== null,
};
