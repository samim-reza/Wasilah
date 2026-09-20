/**
 * Web session storage.
 *
 * `expo-secure-store` is native-only — it throws on web — so this file exists
 * as the platform variant Metro picks for the web bundle. Nothing imports it
 * directly; the import of `./secureStore` resolves here automatically.
 *
 * The honest trade-off, which the native version does not have to make: a
 * browser has no keychain, so the refresh token lives in `localStorage` and is
 * readable by any script running on the origin. That is the standard
 * supabase-js web behaviour and there is no better option available to a
 * static site — but it does mean an XSS hole on this domain is a session
 * compromise, where on the device it would not be. Keeping the web app free of
 * third-party scripts is therefore a security requirement here, not a
 * preference.
 *
 * Every accessor is wrapped: `localStorage` throws rather than returning null
 * in a private window with site data blocked, and a thrown error here would
 * take down auth entirely rather than merely losing persistence.
 */
import { logger } from '@/lib/monitoring/logger';

export const secureStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch (error) {
      logger.warn('secureStore.readFailed', { key, error });
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch (error) {
      // Quota exceeded, or storage blocked. The session simply will not
      // survive a reload, which is far better than failing the sign-in.
      logger.warn('secureStore.writeFailed', { key, error });
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch (error) {
      logger.warn('secureStore.removeFailed', { key, error });
    }
  },
};
