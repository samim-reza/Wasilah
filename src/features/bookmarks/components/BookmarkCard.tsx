/**
 * One saved ayah, shown as the ayah — not as a reference.
 *
 * The list used to be rows of "Al-Baqarah / 2:255", which asked the user to
 * remember what each reference said. The card shows the words: the Arabic on
 * one line and the meaning under it, so a saved ayah is recognised at a glance.
 *
 * Each card loads its own ayah through the same cached query the reader uses,
 * and only while it is on screen — the list is virtualised — so a long list
 * costs a request per visible card, once, and nothing after that. Until it
 * arrives (or when offline with nothing cached) the card still works: the
 * reference is enough to open it.
 */
import { DateTime } from 'luxon';
import { memo } from 'react';
import { View } from 'react-native';

import { Skeleton } from '@/components/feedback/Skeleton';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { ArabicText } from '@/features/quran/components/ArabicText';
import { AyahNumber } from '@/features/quran/components/AyahNumber';
import { useVerse } from '@/features/quran/hooks/useVerse';
import type { ArabicScript } from '@/features/quran/types/quran.types';
import { sanitizeTranslationText } from '@/features/quran/utils/sanitizeTranslation';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { ArabicFontKey } from '@/theme/fonts';

import type { Bookmark } from '../services/bookmarkService';

export interface BookmarkCardProps {
  bookmark: Bookmark;
  surahName: string;
  collectionName: string | null;
  translationIds: number[];
  script: ArabicScript;
  arabicFont: ArabicFontKey;
  /** Hidden for guests, who have no collections. */
  showCollectionAction: boolean;
  onOpen: (bookmark: Bookmark) => void;
  onCollection: (bookmark: Bookmark) => void;
  onRemove: (bookmark: Bookmark) => void;
}

function BookmarkCardComponent({
  bookmark,
  surahName,
  collectionName,
  translationIds,
  script,
  arabicFont,
  showCollectionAction,
  onOpen,
  onCollection,
  onRemove,
}: BookmarkCardProps) {
  const { t, locale } = useTranslation();
  const verse = useVerse(bookmark.verseKey, { translationIds, script });

  const savedAgo = DateTime.fromISO(bookmark.createdAt).setLocale(locale).toRelative();
  const translation = verse.data?.translations[0]?.text;

  return (
    <Card
      onPress={() => onOpen(bookmark)}
      accessibilityLabel={`${surahName} ${bookmark.verseKey}`}
      className="mx-4 mb-3 gap-3"
    >
      <View className="flex-row items-center gap-3">
        <AyahNumber verseNumber={bookmark.verseNumber} />

        <View className="flex-1">
          <Text className="font-semibold" numberOfLines={1}>
            {surahName}
          </Text>
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {[bookmark.verseKey, collectionName, savedAgo].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {showCollectionAction && (
          <IconButton
            name="collection"
            color={bookmark.collectionId ? 'primary' : 'textSubtle'}
            size={18}
            onPress={() => onCollection(bookmark)}
            accessibilityLabel={t('bookmarks.collections')}
          />
        )}
        <IconButton
          name="bookmarkFilled"
          color="accent"
          size={18}
          onPress={() => onRemove(bookmark)}
          accessibilityLabel={t('bookmarks.remove')}
        />
      </View>

      {verse.data ? (
        <View className="gap-2">
          <ArabicText
            text={verse.data.arabicText}
            fontSize={22}
            fontFamily={arabicFont}
            numberOfLines={2}
            selectable={false}
            accessibilityLabel={bookmark.verseKey}
          />
          {translation ? (
            <Text tone="muted" numberOfLines={2}>
              {sanitizeTranslationText(translation)}
            </Text>
          ) : null}
        </View>
      ) : verse.isLoading ? (
        <View className="gap-2">
          <Skeleton height={24} />
          <Skeleton height={14} width="80%" />
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Re-renders only when what it shows changes; the callbacks the screen
 * passes are stable.
 */
export const BookmarkCard = memo(BookmarkCardComponent);
