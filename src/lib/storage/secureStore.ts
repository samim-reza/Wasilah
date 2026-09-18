/**
 * Secure storage for credentials.
 *
 * Only the Supabase session belongs here. SecureStore has a ~2KB practical value
 * limit on iOS and is slower than AsyncStorage, so it must not be used for
 * general app state.
 */
import * as SecureStore from 'expo-secure-store';

import { logger } from '@/lib/monitoring/logger';

export const secureStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.warn('secureStore.readFailed', { key, error });
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.warn('secureStore.writeFailed', { key, error });
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.warn('secureStore.removeFailed', { key, error });
    }
  },
};
