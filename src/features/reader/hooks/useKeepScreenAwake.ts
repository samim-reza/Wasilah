/**
 * Keeps the screen awake while reading, when the user has asked for it.
 *
 * `useKeepAwake()` cannot express this: passing `undefined` as its tag does not
 * disable it, it just falls back to the default tag — so a conditional call
 * would keep the screen on even with the preference switched off. Activating
 * and deactivating explicitly is the only way to make it conditional.
 *
 * A dedicated tag means only this screen's lock is released, leaving any other
 * lock (for example one held by audio playback) untouched.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

const READER_TAG = 'wasilah-reader';

export function useKeepScreenAwake(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    // Unsupported on some platforms and in some browsers; a failure here is not
    // worth interrupting reading for.
    void activateKeepAwakeAsync(READER_TAG).catch(() => undefined);

    return () => {
      void deactivateKeepAwake(READER_TAG).catch(() => undefined);
    };
  }, [enabled]);
}
