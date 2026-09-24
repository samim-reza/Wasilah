/**
 * Web confirmation prompt.
 *
 * The platform variant Metro picks for the web bundle, because `Alert.alert`
 * does nothing at all there. `window.confirm` is plain, but it is native to
 * the browser, accessible, and impossible to miss — all of which beat a
 * custom modal for a question this small.
 *
 * Guarded anyway: `confirm` is absent during the static render performed at
 * build time, and a destructive action must never proceed merely because the
 * prompt could not be shown.
 */
import type { AlertOptions, ConfirmOptions } from './confirm';

export type { AlertOptions, ConfirmOptions };

export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (typeof globalThis.confirm !== 'function') return Promise.resolve(false);

  const message = options.message ? `${options.title}\n\n${options.message}` : options.title;
  return Promise.resolve(globalThis.confirm(message));
}

export function alert(options: AlertOptions): Promise<void> {
  if (typeof globalThis.alert === 'function') {
    globalThis.alert(`${options.title}\n\n${options.message}`);
  }
  return Promise.resolve();
}
