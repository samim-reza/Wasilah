/**
 * Horizontal collection filter.
 *
 * A scrolling chip row rather than a dropdown: with a handful of collections
 * every one is visible and one tap away, and the row simply disappears for the
 * many users who never create any.
 */
import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

import type { BookmarkCollection } from '../services/bookmarkService';

/** `null` means "everything", which is the default and always first. */
export type CollectionFilter = string | null;

export interface CollectionFilterBarProps {
  collections: readonly BookmarkCollection[];
  selected: CollectionFilter;
  onSelect: (filter: CollectionFilter) => void;
  onCreate: () => void;
  /** Hidden entirely in guest mode, where collections do not apply. */
  visible: boolean;
}

export function CollectionFilterBar({
  collections,
  selected,
  onSelect,
  onCreate,
  visible,
}: CollectionFilterBarProps) {
  const { t } = useTranslation();

  // Nothing to filter and nothing to show: keep the screen clean rather than
  // displaying a row containing only a "new" button.
  if (!visible) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 pb-3"
      accessibilityRole="tablist"
    >
      <Chip
        label={t('bookmarks.title')}
        selected={selected === null}
        onPress={() => onSelect(null)}
      />

      {collections.map((collection) => (
        <Chip
          key={collection.id}
          label={collection.name}
          selected={selected === collection.id}
          onPress={() => onSelect(collection.id)}
        />
      ))}

      <Pressable
        className="flex-row items-center gap-1 rounded-full border border-dashed border-border-strong px-3 py-1.5"
        pressedClassName="active:bg-surface-pressed"
        onPress={onCreate}
        enforceMinTapTarget={false}
        accessibilityLabel={t('bookmarks.newCollection')}
      >
        <Icon name="add" size={13} color="textMuted" />
        <Text variant="caption" tone="muted">
          {t('bookmarks.newCollection')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-full px-3 py-1.5 ${selected ? 'bg-primary' : 'bg-surface-muted'}`}
      pressedClassName="active:opacity-80"
      onPress={onPress}
      enforceMinTapTarget={false}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <View>
        <Text
          variant="caption"
          className={selected ? 'font-semibold text-primary-foreground' : 'text-content-muted'}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
