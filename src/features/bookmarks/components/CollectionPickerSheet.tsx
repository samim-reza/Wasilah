/**
 * Moves a bookmark into a collection, or creates one on the spot.
 *
 * Creating from inside the picker matters: deciding where something belongs is
 * usually the moment you realise the folder does not exist yet, and sending the
 * user to a separate screen to make one loses the bookmark they were filing.
 */
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

import type { BookmarkCollection } from '../services/bookmarkService';

export interface CollectionPickerSheetProps {
  visible: boolean;
  collections: readonly BookmarkCollection[];
  /** The bookmark's current collection, so it can be shown as selected. */
  currentCollectionId: string | null;
  onClose: () => void;
  onAssign: (collectionId: string | null) => Promise<void>;
  onCreate: (name: string) => Promise<BookmarkCollection | null>;
}

export function CollectionPickerSheet({
  visible,
  collections,
  currentCollectionId,
  onClose,
  onAssign,
  onCreate,
}: CollectionPickerSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [newName, setNewName] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const assign = async (collectionId: string | null) => {
    setIsBusy(true);
    try {
      await onAssign(collectionId);
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  const createAndAssign = async () => {
    const name = newName.trim();
    if (!name) return;

    setIsBusy(true);
    try {
      const created = await onCreate(name);
      // File the bookmark into the collection that was just made — otherwise
      // the user has to pick it in a second step, which is the whole friction
      // this flow exists to remove.
      if (created) await onAssign(created.id);
      setNewName('');
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('bookmarks.collections')}
      heightRatio={0.6}
    >
      <ScrollView
        className="px-4"
        contentContainerClassName="pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <Row
          label={t('bookmarks.title')}
          icon="bookmark"
          selected={currentCollectionId === null}
          onPress={() => void assign(null)}
          disabled={isBusy}
        />

        {collections.map((collection) => (
          <Row
            key={collection.id}
            label={collection.name}
            icon="collection"
            selected={currentCollectionId === collection.id}
            onPress={() => void assign(collection.id)}
            disabled={isBusy}
          />
        ))}

        <View className="mt-4 gap-2 border-t border-border pt-4">
          <Text variant="label" tone="subtle">
            {t('bookmarks.newCollection')}
          </Text>

          <View className="flex-row items-center gap-2">
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={t('bookmarks.collectionName')}
              placeholderTextColor={colors.textSubtle}
              className="flex-1 rounded-lg bg-surface-muted px-3 py-2.5 text-base text-content"
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={() => void createAndAssign()}
              accessibilityLabel={t('bookmarks.collectionName')}
            />
            <Button
              label={t('common.save')}
              onPress={() => void createAndAssign()}
              size="sm"
              disabled={newName.trim().length === 0 || isBusy}
            />
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function Row({
  label,
  icon,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  icon: 'bookmark' | 'collection';
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-3 border-b border-border py-3"
      pressedClassName="active:opacity-70"
      onPress={onPress}
      disabled={disabled}
      enforceMinTapTarget={false}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
    >
      <Icon name={icon} size={18} color={selected ? 'primary' : 'textMuted'} />
      <Text className={`flex-1 ${selected ? 'font-semibold text-primary' : ''}`} numberOfLines={1}>
        {label}
      </Text>
      {selected && <Icon name="checkCircle" size={18} color="primary" />}
    </Pressable>
  );
}
