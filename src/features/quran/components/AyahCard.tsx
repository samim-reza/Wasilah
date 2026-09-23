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
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { ArabicFontKey } from '@/theme/fonts';

import { ArabicText } from './ArabicText';
import { AyahNumber } from './AyahNumber';
import { TranslationText } from './TranslationText';
import { WordByWordArabic } from './WordByWordArabic';
import { WordByWordRow } from './WordByWordRow';
import type { Verse, WordSegment } from '../types/quran.types';

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
  /**
   * 1-based position of the word being recited in THIS ayah, or null.
   *
   * Only ever non-null for the ayah currently playing, so a re-render from a
   * position tick touches one card rather than the whole list.
   */
  activeWordPosition?: number | null;
  onWordPress?: (word: WordSegment) => void;
  /** The face the Arabic is drawn in — the user's choice, from settings. */
  arabicFont: ArabicFontKey;
  /** Plays from this ayah and continues through the surah. */
  onPlay: (verse: Verse) => void;
  /** Plays this ayah alone and stops. */
  onPlaySingle: (verse: Verse) => void;
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
  activeWordPosition = null,
  onWordPress,
  arabicFont,
  onPlay,
  onPlaySingle,
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
          {/* Two play controls, not a chooser sheet. The plain one continues
              through the surah, which is how most listening starts; the one
              marked ¹ plays this ayah alone. A sheet asking which on every tap
              was the worse of both worlds. */}
          <IconButton
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isPlaying ? 'primary' : 'textMuted'}
            onPress={() => onPlay(verse)}
            accessibilityLabel={t('a11y.playFromHere', { reference })}
          />
          <Pressable
            onPress={() => onPlaySingle(verse)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.playAyah', { reference })}
            hitSlop={8}
            className="flex-row items-start px-2 py-2"
          >
            <Icon name="play" size={18} color="textMuted" />
            <Text
              variant="caption"
              tone="muted"
              className="-ml-0.5 text-[9px] font-bold"
              accessible={false}
            >
              1
            </Text>
          </Pressable>
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
        <WordByWordRow
          words={verse.words}
          arabicFontSize={arabicFontSize}
          activeWordPosition={activeWordPosition}
          onWordPress={onWordPress}
          fontFamily={arabicFont}
        />
      ) : verse.words.length > 0 ? (
        // Normal reading, as Quran.com does it: the ayah flows as one line of
        // text, and every word in it is a tap target. Words are nested Text,
        // not a row of Views, so wrapping and RTL flow are exactly those of
        // the plain string it replaces — only the interaction is added.
        <WordByWordArabic
          words={verse.words}
          fontSize={arabicFontSize}
          activeWordPosition={activeWordPosition}
          onWordPress={onWordPress}
          fontFamily={arabicFont}
          accessibilityLabel={reference}
        />
      ) : (
        // Only when the API returned no word data at all.
        <ArabicText text={verse.arabicText} fontSize={arabicFontSize} fontFamily={arabicFont} />
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
    previous.activeWordPosition === next.activeWordPosition &&
    previous.arabicFont === next.arabicFont &&
    previous.isBookmarked === next.isBookmarked &&
    previous.hasNote === next.hasNote &&
    previous.isPlaying === next.isPlaying &&
    previous.showTafsirAction === next.showTafsirAction &&
    previous.languageCode === next.languageCode
  );
});
