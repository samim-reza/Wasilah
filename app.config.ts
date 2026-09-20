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

/**
 * Expo Go preview mode, enabled with `EXPO_GO_PREVIEW=1`.
 *
 * Expo Go will only load an update whose runtime version is `exposdk:<sdk>`,
 * so a preview published for testers has to declare that instead of this
 * app's own runtime version. The two can never collide: a shipped binary is
 * on runtime `1.0.0` and ignores anything published under an `exposdk:` one,
 * which is what keeps a preview from ever reaching a real install.
 *
 * Off by default, so ordinary builds and updates are completely unaffected.
 */
const isExpoGoPreview = process.env.EXPO_GO_PREVIEW === '1';

const BUNDLE_ID = 'com.wasilah.app';

/**
 * EAS project identity.
 *
 * Neither value is a secret — both are embedded in every build and readable
 * from the shipped bundle — so they are committed rather than kept in `.env`,
 * which is also what lets a fresh clone build without extra setup.
 */
const EAS_PROJECT_ID = 'c96e9c4d-69d3-4712-bf3d-2a46e9c6589e';
const EAS_ACCOUNT = 'samim101s-team';

/**
 * Sentry's config plugin is only added when Sentry is actually configured.
 *
 * The plugin installs a Gradle task that uploads source maps on every RELEASE
 * build. With no organization, project and auth token it runs `sentry-cli`
 * anyway and fails the whole build — which is exactly what happened to the
 * first preview build, ten minutes into Gradle. Development builds never run
 * that task, so the problem is invisible until the first non-dev build.
 *
 * Crash reporting is opt-in throughout this app (see `lib/monitoring/sentry`),
 * so the plugin being absent is the correct state when no DSN exists, not a
 * degradation.
 */
const sentryOrganization = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const isSentryConfigured = Boolean(sentryOrganization && sentryProject);

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
  owner: EAS_ACCOUNT,
  // The New Architecture and edge-to-edge rendering are the only options in
  // SDK 57, so there are no longer flags for either.
  // `automatic` lets the OS drive the initial colour scheme; the in-app theme
  // provider can still override it with the user's explicit preference.
  userInterfaceStyle: 'automatic',
  runtimeVersion: isExpoGoPreview ? 'exposdk:57.0.0' : RUNTIME_VERSION,

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
    //
    // FINE location is blocked outright. expo-location adds it unconditionally,
    // but coarse is all this app can use: coordinates are rounded to ~11km
    // before they are stored, and the column type enforces that. Shipping a
    // precise-location permission we deliberately never exercise would be a
    // claim on the store listing that the code contradicts.
    blockedPermissions: [
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      // "Display over other apps". React Native declares this in its debug
      // source set for the dev overlay, and with expo-dev-client installed it
      // reaches release builds too — it was present in the first preview APK.
      //
      // Nothing in Wasilah draws over other apps. On a Play Store listing this
      // is a permission users are right to be suspicious of, and one Google
      // scrutinises, so it is blocked outright rather than shipped and
      // explained away.
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },

  // Web IS a target now, serving mywasilah.com and the admin panel at /admin.
  //
  // The caveat that removed it originally still stands and is not a bug: local
  // notifications, background recitation and keychain-backed session storage
  // do not exist in a browser. The web build is therefore the reader, search,
  // bookmarks and progress — the habit engine's reminders stay native-only,
  // and web users are offered email instead. Platform variants (`*.web.ts`)
  // carry the differences so no `Platform.OS` checks leak into shared code.
  web: {
    output: 'static',
    bundler: 'metro',
  },

  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
    'expo-localization',
    [
      'expo-audio',
      {
        // Wasilah never records. The plugin adds RECORD_AUDIO by default, and a
        // Quran app asking for the microphone is a trust-destroying surprise on
        // the Play Store listing — and a claim we would have to justify on the
        // Data safety form for a capability we do not use.
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        // Recitation must survive the screen locking.
        enableBackgroundPlayback: true,
      },
    ],
    'expo-font',
    'expo-image',
    [
      // Android-only. The plugin generates the AppWidgetProvider and its XML
      // during prebuild, which EAS runs server-side — so no `android/`
      // directory is committed and the managed workflow is preserved.
      //
      // The widget cannot run in Expo Go, which has no way to install a
      // provider into its own manifest. That is fine: Expo Go was only ever a
      // preview path here, and APK builds are how this app is tested.
      'react-native-android-widget',
      {
        widgets: [
          {
            // Must match STREAK_WIDGET_NAME in features/widget.
            name: 'Streak',
            label: 'Wasilah streak',
            description: 'Your current reading streak',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            // Half-hourly is the floor Android honours for a widget update
            // anyway; the app also pushes an update the moment a session is
            // recorded, so this is only the fallback for a day the app is
            // never opened.
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
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
    // Spread so the entry disappears entirely when Sentry is not configured.
    ...(isSentryConfigured
      ? [
          [
            '@sentry/react-native/expo',
            { organization: sentryOrganization, project: sentryProject },
          ] as [string, Record<string, unknown>],
        ]
      : []),
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  // Over-the-air updates are served per project; `runtimeVersion` above is what
  // stops an update reaching a binary whose native code no longer matches.
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },

  extra: {
    eas: {
      // `expo-notifications` reads this to mint a push token, so a missing
      // value shows up as "push.missingProjectId" rather than as a build error.
      projectId: EAS_PROJECT_ID,
    },
  },
});
