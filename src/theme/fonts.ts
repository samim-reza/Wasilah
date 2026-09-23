/**
 * Font loading.
 *
 * Every bundled face is SIL Open Font Licence 1.1. Arabic offers a choice
 * because readers have strong, learned preferences: someone who memorised
 * from a South Asian mushaf reads a Nastaliq-flavoured page faster than a
 * Madinah one, and the reverse is just as true. The default stays Amiri
 * Quran, which carries the full set of Quranic diacritics and pause marks
 * and positions them correctly.
 *
 *   AmiriQuran        — Naskh designed specifically for typesetting the Quran.
 *   Amiri             — the general-text sibling; slightly lighter colour.
 *   ScheherazadeNew   — SIL's Naskh, very legible at small sizes.
 *   NotoNaskhArabic   — Google's Naskh; the most "system-like" of the set.
 *   NotoNastaliqUrdu  — Nastaliq, for readers used to IndoPak printing. Pairs
 *                       naturally with the IndoPak script setting but is not
 *                       tied to it; the two are independent choices.
 *   NotoSansBengali   — Bengali needs a face with correct conjunct shaping,
 *                       which the Android system font does not reliably give.
 *
 * The UI deliberately uses the SYSTEM font. It costs nothing to download, looks
 * native on each platform, and keeps the APK smaller — which matters more for
 * launch speed than a custom Latin face does for polish.
 *
 * The two Noto faces are variable fonts. expo-font loads them at their default
 * axis position (Regular), which is exactly the weight wanted here; static
 * Regular cuts are not published for them in the Google Fonts repository.
 *
 * See `docs/third-party-content-and-licenses.md` for the licence record.
 */
import { useFonts } from 'expo-font';

export const fontAssets = {
  AmiriQuran: require('../../assets/fonts/AmiriQuran-Regular.ttf'),
  Amiri: require('../../assets/fonts/Amiri-Regular.ttf'),
  ScheherazadeNew: require('../../assets/fonts/ScheherazadeNew-Regular.ttf'),
  NotoNaskhArabic: require('../../assets/fonts/NotoNaskhArabic-Variable.ttf'),
  NotoNastaliqUrdu: require('../../assets/fonts/NotoNastaliqUrdu-Variable.ttf'),
  NotoSansBengali: require('../../assets/fonts/NotoSansBengali-Regular.ttf'),
} as const;

/** The Arabic faces a reader may choose between, in the order settings lists them. */
export const arabicFontKeys = [
  'AmiriQuran',
  'Amiri',
  'ScheherazadeNew',
  'NotoNaskhArabic',
  'NotoNastaliqUrdu',
] as const;

export type ArabicFontKey = (typeof arabicFontKeys)[number];

/**
 * Nastaliq sits much taller than Naskh — its words descend in a diagonal
 * cascade — so it needs more leading or lines collide. Everything else shares
 * the app's standard Arabic ratio.
 */
export function arabicLineHeightFor(font: ArabicFontKey, baseRatio: number): number {
  return font === 'NotoNastaliqUrdu' ? baseRatio * 1.35 : baseRatio;
}

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
