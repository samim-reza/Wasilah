/**
 * Expo app configuration.
 *
 * Written as TypeScript (rather than app.json) so identifiers, the runtime
 * version and analytics/monitoring wiring can be driven by the build
 * environment. Nothing secret belongs here — everything in this file is
 * readable from the shipped bundle.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Brand colours, generated from `src/theme/tokens.ts` by `npm run theme:build`.
 *
 * Required rather than imported: the Expo CLI transpiles this file and requires
 * it in isolation, so it cannot resolve a TypeScript module — but JSON is fine.
 * This keeps the native splash and adaptive-icon colours tied to the same
 * source of truth the app renders with.
 */
const brandColors = require('./assets/brand/colors.json') as {
  brand: string;
  lightBackground: string;
  darkBackground: string;
};

/** Bumped independently of the marketing version; drives OTA update compatibility. */
const RUNTIME_VERSION = '1.0.0';

const BUNDLE_ID = 'com.wasilah.app';

const BRAND = brandColors.brand;
const LIGHT_BACKGROUND = brandColors.lightBackground;
const DARK_BACKGROUND = brandColors.darkBackground;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Wasilah',
  slug: 'wasilah',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'wasilah',
  // The New Architecture and edge-to-edge rendering are the only options in
  // SDK 57, so there are no longer flags for either.
  // `automatic` lets the OS drive the initial colour scheme; the in-app theme
  // provider can still override it with the user's explicit preference.
  userInterfaceStyle: 'automatic',
  runtimeVersion: RUNTIME_VERSION,

  // The splash screen is configured exclusively through the
  // expo-splash-screen plugin below; SDK 57 removed the top-level `splash` key.
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    // Quran reading and recitation audio must survive the screen locking.
    infoPlist: {
      UIBackgroundModes: ['audio'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: BRAND,
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ],
    // Location is opt-in and only requested when the user turns on prayer times
    // or weather, so it is declared but never requested at launch.
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION'],
  },

  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },

  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
    'expo-localization',
    'expo-audio',
    'expo-font',
    'expo-image',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: LIGHT_BACKGROUND,
        dark: { backgroundColor: DARK_BACKGROUND },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: BRAND,
        // Reminders are scheduled locally, so the app must be allowed to post
        // them without a network round-trip.
        defaultChannel: 'daily-reminders',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Wasilah uses your approximate location only to calculate prayer times and local weather for optional reminders. You can use the whole app without it.',
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
