/**
 * Sharing an ayah.
 *
 * Two rules govern everything here:
 *   • The Arabic text is reproduced exactly as received. It is never trimmed,
 *     re-spaced, abbreviated or altered in any way.
 *   • The translation is always attributed to its edition, and the app's name
 *     never appears in a way that could read as endorsing the translation.
 */
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import { branding } from '@/config/branding';
import { logger } from '@/lib/monitoring/logger';

import type { Verse } from '../types/quran.types';

export interface ShareableVerse {
  arabicText: string;
  translationText: string | null;
  translationSource: string | null;
  reference: string;
}

export function toShareable(verse: Verse, chapterName?: string): ShareableVerse {
  const translation = verse.translations[0];

  return {
    arabicText: verse.arabicText,
    translationText: translation?.text ?? null,
    translationSource: translation?.resourceName ?? null,
    reference: chapterName ? `${chapterName} ${verse.verseKey}` : `Quran ${verse.verseKey}`,
  };
}

/**
 * Builds the shared text.
 *
 * Arabic first, then the translation, then the reference and its source. The
 * app's name comes last and is clearly separate, so nothing in the message can
 * be mistaken for part of the scripture or the translation.
 */
export function formatShareText(verse: ShareableVerse): string {
  const lines: string[] = [verse.arabicText];

  if (verse.translationText) {
    lines.push('', verse.translationText);
  }

  lines.push('', `— ${verse.reference}`);

  if (verse.translationSource) {
    lines.push(`Translation: ${verse.translationSource}`);
  }

  lines.push('', branding.shareFooter);

  return lines.join('\n');
}

export async function shareVerse(verse: Verse, chapterName?: string): Promise<boolean> {
  try {
    const result = await Share.share({
      message: formatShareText(toShareable(verse, chapterName)),
    });
    return result.action === Share.sharedAction;
  } catch (error) {
    // A cancelled share throws on some platforms; it is not a failure worth
    // surfacing to the user.
    logger.debug('share.failed', { error });
    return false;
  }
}

export async function copyVerse(verse: Verse, chapterName?: string): Promise<void> {
  await Clipboard.setStringAsync(formatShareText(toShareable(verse, chapterName)));
}
