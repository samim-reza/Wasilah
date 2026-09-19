/**
 * The user's notes.
 *
 * Signing in is required, because a note that vanishes with a reinstall is
 * worse than one that asked for an account first.
 */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useChapters } from '@/features/quran/hooks/useChapters';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function NotesScreen() {
  const { t } = useTranslation();
  const { isGuest } = useAuth();
  const notes = useNotes();
  const { data: chapters } = useChapters();

  const chapterNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const chapter of chapters ?? []) map.set(chapter.id, chapter.nameSimple);
    return map;
  }, [chapters]);

  return (
    <Screen edges={['top']} noPadding>
      <View className="px-4">
        <ScreenHeader title={t('notes.title')} />
      </View>

      {isGuest ? (
        <EmptyState
          icon="note"
          title={t('profile.guestMode')}
          body={t('profile.guestBody')}
          actionLabel={t('profile.signUp')}
          onAction={() => router.push('/(auth)/signup')}
        />
      ) : notes.notes.length === 0 ? (
        <EmptyState icon="note" title={t('notes.empty')} body={t('notes.emptyBody')} />
      ) : (
        <FlashList
          data={notes.notes}
          keyExtractor={(note) => note.id}
          renderItem={({ item }) => (
            <Pressable
              className="gap-1 border-b border-border px-4 py-3"
              pressedClassName="active:bg-surface-pressed"
              onPress={() => router.push(`/quran/${item.chapterId}?ayah=${item.verseNumber}`)}
              enforceMinTapTarget={false}
              accessibilityLabel={`${item.verseKey}`}
            >
              <Text variant="caption" tone="primary" className="font-semibold">
                {chapterNames.get(item.chapterId) ?? item.chapterId} · {item.verseKey}
              </Text>
              <Text tone="muted" numberOfLines={3}>
                {item.body}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
