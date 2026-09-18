/**
 * One ayah in the reader.
 *
 * Rendered hundreds of times in a virtualized list, so it is memoised and every
 * callback it receives must be stable — an unstable `onBookmark` would defeat
 * the memo and re-render the visible window on each parent update.
 *
 * Accessibility: the Arabic glyphs read poorly through a screen reader, so the
 * card exposes the reference and the translation as its label and hides the raw
 * text from the accessibility tree.
 */
import { memo } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import { ArabicText } from './ArabicText';
import { AyahNumber } from './AyahNumber';
import { TranslationText } from './TranslationText';
import { WordByWordRow } from './WordByWordRow';
import type { Verse } from '../types/quran.types';

export interface AyahCardProps {
  verse: Verse;
  arabicFontSize: number;
  translationFontSize: number;
  showTranslation: boolean;
  showWordByWord: boolean;
  languageCode: string;
  isBookmarked: boolean;
  hasNote: boolean;
  /** True while this ayah is being recited. */
  isPlaying: boolean;
  /** Hidden when the tafsir flag is off or no edition is selected. */
  showTafsirAction: boolean;
  onPlay: (verse: Verse) => void;
  onTafsir: (verse: Verse) => void;
  onBookmark: (verse: Verse) => void;
  onNote: (verse: Verse) => void;
  onShare: (verse: Verse) => void;
}

function AyahCardComponent({
  verse,
  arabicFontSize,
  translationFontSize,
  showTranslation,
  showWordByWord,
  languageCode,
  isBookmarked,
  hasNote,
  isPlaying,
  showTafsirAction,
  onPlay,
  onTafsir,
  onBookmark,
  onNote,
  onShare,
}: AyahCardProps) {
  const { t } = useTranslation();
  const reference = `${verse.chapterId}:${verse.verseNumber}`;
  const primaryTranslation = verse.translations[0];

  return (
    <View
      className={`border-b border-border px-4 py-5 ${isPlaying ? 'bg-primary-muted/40' : ''}`}
      accessible
      accessibilityLabel={
        primaryTranslation
          ? `${t('quran.ayahNumber', { number: verse.verseNumber })}. ${primaryTranslation.text}`
          : t('quran.ayahNumber', { number: verse.verseNumber })
      }
    >
      <View className="mb-3 flex-row items-center justify-between">
        <AyahNumber verseNumber={verse.verseNumber} active={isPlaying} />

        <View className="flex-row items-center">
          <IconButton
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isPlaying ? 'primary' : 'textMuted'}
            onPress={() => onPlay(verse)}
            accessibilityLabel={t('a11y.playAyah', { reference })}
          />
          <IconButton
            name={isBookmarked ? 'bookmarkFilled' : 'bookmark'}
            size={18}
            color={isBookmarked ? 'accent' : 'textMuted'}
            onPress={() => onBookmark(verse)}
            accessibilityLabel={t('a11y.bookmarkToggle', { reference })}
          />
          {showTafsirAction && (
            <IconButton
              name="info"
              size={18}
              color="textMuted"
              onPress={() => onTafsir(verse)}
              accessibilityLabel={t('quran.tafsir')}
            />
          )}
          <IconButton
            name="note"
            size={18}
            color={hasNote ? 'primary' : 'textMuted'}
            onPress={() => onNote(verse)}
            accessibilityLabel={t('notes.add')}
          />
          <IconButton
            name="share"
            size={18}
            color="textMuted"
            onPress={() => onShare(verse)}
            accessibilityLabel={t('common.share')}
          />
        </View>
      </View>

      {showWordByWord && verse.words.length > 0 ? (
        <WordByWordRow words={verse.words} arabicFontSize={arabicFontSize} />
      ) : (
        <ArabicText text={verse.arabicText} fontSize={arabicFontSize} />
      )}

      {showTranslation && verse.translations.length > 0 && (
        <View className="mt-4 gap-4">
          {verse.translations.map((translation) => (
            <TranslationText
              key={translation.resourceId}
              text={translation.text}
              fontSize={translationFontSize}
              languageCode={languageCode}
              // Only label the source when several editions are shown at once;
              // a single translation is already named in the reader header.
              sourceName={verse.translations.length > 1 ? translation.resourceName : null}
            />
          ))}
        </View>
      )}

      {verse.sajdahNumber !== null && (
        <Text variant="caption" tone="accent" className="mt-3">
          ۩
        </Text>
      )}
    </View>
  );
}

/**
 * Custom comparison rather than the default shallow one: `verse` is a stable
 * object from the query cache, so comparing the handful of fields that actually
 * affect rendering avoids re-rendering every visible ayah when an unrelated
 * piece of parent state changes.
 */
export const AyahCard = memo(AyahCardComponent, (previous, next) => {
  return (
    previous.verse.verseKey === next.verse.verseKey &&
    previous.arabicFontSize === next.arabicFontSize &&
    previous.translationFontSize === next.translationFontSize &&
    previous.showTranslation === next.showTranslation &&
    previous.showWordByWord === next.showWordByWord &&
    previous.isBookmarked === next.isBookmarked &&
    previous.hasNote === next.hasNote &&
    previous.isPlaying === next.isPlaying &&
    previous.showTafsirAction === next.showTafsirAction &&
    previous.languageCode === next.languageCode
  );
});
