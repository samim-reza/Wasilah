/**
 * A confirmation prompt that works on every platform.
 *
 * `Alert.alert` is a NO-OP in react-native-web — it does not throw, it simply
 * does nothing. So a destructive action guarded by it silently fails on the
 * web: the user taps Delete, no dialog appears, and nothing is deleted. That
 * is exactly how the tasbeeh delete button looked broken.
 *
 * Resolves to true when the user confirms. The caller does the work, so this
 * stays free of any opinion about what is being confirmed.
 */
import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: options.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: options.confirmLabel,
        style: options.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
