/**
 * "Available offline" for a surah's recitation: download it, watch it come
 * down, stop it, or delete it to free the space.
 */
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import type { ChapterDownload } from '@/features/audio/hooks/useAyahAudio';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { confirm } from '@/lib/ui/confirm';

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1);
}

export function OfflineAudioRow({ download }: { download: ChapterDownload }) {
  const { t } = useTranslation();
  const { state } = download;

  const onRemove = async () => {
    const confirmed = await confirm({
      title: t('reader.offlineRemoveTitle'),
      message: t('reader.offlineRemoveBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (confirmed) await download.remove();
  };

  return (
    <View className="gap-2 rounded-xl border border-border px-4 py-3">
      <View className="flex-row items-center gap-3">
        <Icon
          name={state.status === 'downloaded' ? 'checkCircle' : 'download'}
          size={20}
          color={state.status === 'downloaded' ? 'success' : 'textMuted'}
        />
        <View className="flex-1">
          <Text className="font-semibold">{t('reader.offlineTitle')}</Text>
          <Text variant="caption" tone="muted">
            {state.status === 'downloaded'
              ? t('reader.offlineReady', { size: megabytes(state.bytes) })
              : state.status === 'downloading'
                ? t('reader.offlineProgress', { ...state.progress })
                : state.status === 'failed'
                  ? t('reader.offlineFailed')
                  : t('reader.offlineHint')}
          </Text>
        </View>

        {state.status === 'downloaded' ? (
          <IconButton
            name="trash"
            size={18}
            color="textMuted"
            onPress={() => void onRemove()}
            accessibilityLabel={t('reader.offlineRemoveTitle')}
          />
        ) : state.status === 'downloading' ? (
          <IconButton
            name="close"
            size={18}
            color="textMuted"
            onPress={download.cancel}
            accessibilityLabel={t('common.cancel')}
          />
        ) : (
          <Button
            label={state.status === 'failed' ? t('common.retry') : t('reader.offlineDownload')}
            size="sm"
            variant="secondary"
            onPress={() => void download.start()}
          />
        )}
      </View>

      {state.status === 'downloading' && (
        <ProgressBar
          value={state.progress.total > 0 ? state.progress.done / state.progress.total : 0}
          height={3}
          accessibilityLabel={t('reader.offlineProgress', { ...state.progress })}
        />
      )}
    </View>
  );
}
