/**
 * Note editor.
 *
 * Nothing is pre-filled. The placeholder is a prompt, never a suggestion, and
 * no text is generated on the user's behalf — a note presented as the user's
 * own must actually be theirs.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { MAX_NOTE_LENGTH } from '../services/noteService';
import { useTheme } from '@/theme/useTheme';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export interface NoteEditorSheetProps {
  visible: boolean;
  verseKey: string;
  initialBody: string;
  onClose: () => void;
  onSave: (body: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function NoteEditorSheet({
  visible,
  verseKey,
  initialBody,
  onClose,
  onSave,
  onDelete,
}: NoteEditorSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Seeded once per mount. The caller passes a `key` of the ayah being edited,
  // so opening the sheet for a different ayah remounts it with the right note —
  // which is simpler and less error-prone than re-syncing state from props.
  const [body, setBody] = useState(initialBody);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(body);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initialBody ? t('notes.edit') : t('notes.add')}
      heightRatio={0.65}
    >
      <View className="flex-1 gap-3 px-4 pt-4">
        <Text variant="caption" tone="subtle">
          {verseKey} · {t('notes.private')}
        </Text>

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t('notes.placeholder')}
          placeholderTextColor={colors.textSubtle}
          multiline
          textAlignVertical="top"
          maxLength={MAX_NOTE_LENGTH}
          autoFocus
          className="flex-1 rounded-lg bg-surface-muted p-3 text-base text-content"
          accessibilityLabel={t('notes.add')}
        />

        <View className="flex-row gap-2 pb-4">
          {initialBody.length > 0 && (
            <Button
              label={t('common.delete')}
              onPress={() => void onDelete()}
              variant="danger"
              size="md"
            />
          )}
          <View className="flex-1">
            <Button
              label={t('common.save')}
              onPress={() => void handleSave()}
              loading={isSaving}
              fullWidth
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
