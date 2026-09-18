/**
 * Font loading.
 *
 * Only two faces are bundled, both SIL Open Font Licence 1.1:
 *
 *   AmiriQuran      — a Naskh face designed specifically for typesetting the
 *                     Quran. Chosen over a general-purpose Arabic font because
 *                     it carries the full set of Quranic diacritics and pause
 *                     marks and positions them correctly; a UI font renders
 *                     them clipped or misplaced, which would distort the text.
 *   NotoSansBengali — Bengali needs a face with correct conjunct (যুক্তাক্ষর)
 *                     shaping, which the Android system font does not reliably
 *                     provide on older devices.
 *
 * The UI deliberately uses the SYSTEM font. It costs nothing to download, looks
 * native on each platform, and keeps the APK smaller — which matters more for
 * launch speed than a custom Latin face does for polish.
 *
 * See `docs/third-party-content-and-licenses.md` for the licence record.
 */
import { useFonts } from 'expo-font';

export const fontAssets = {
  AmiriQuran: require('../../assets/fonts/AmiriQuran-Regular.ttf'),
  NotoSansBengali: require('../../assets/fonts/NotoSansBengali-Regular.ttf'),
} as const;

export interface FontLoadState {
  loaded: boolean;
  /** Non-null when a face failed; the app still renders with fallbacks. */
  error: Error | null;
}

/**
 * Loads the bundled faces.
 *
 * A load failure is reported but never blocks the app: Arabic falls back to the
 * platform's own Arabic font, which is legible even if less beautiful. Refusing
 * to start because a font is missing would be a worse outcome.
 */
export function useAppFonts(): FontLoadState {
  const [loaded, error] = useFonts(fontAssets);
  return { loaded, error };
}
