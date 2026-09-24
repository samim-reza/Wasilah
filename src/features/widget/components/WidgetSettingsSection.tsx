/**
 * The widget's corner of Settings: a live preview, and the two things a user
 * can do about it.
 *
 * The preview is drawn by the same native code that draws the real widget,
 * so what it shows is what the home screen will show — and when the home
 * screen shows nothing, this is how to tell whether the picture or the
 * launcher is at fault.
 *
 * Android only. The library is imported lazily so that the iOS bundle never
 * loads it; the web build has its own stub beside this file.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { Platform, View } from 'react-native';
import type { WidgetPreviewProps } from 'react-native-android-widget';

import { useToast } from '@/components/feedback/Toast';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { logger } from '@/lib/monitoring/logger';

import { refreshWidget } from '../services/updateWidget';
import { loadWidgetModel, type WidgetModel } from '../services/widgetModel';
import { WasilahWidget } from './WasilahWidget';

/** A 4x2 widget on a typical phone, in dp. */
const PREVIEW_WIDTH = 300;
const PREVIEW_HEIGHT = 140;

export function WidgetSettingsSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const [Preview, setPreview] = useState<ComponentType<WidgetPreviewProps> | null>(null);
  const [model, setModel] = useState<WidgetModel | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;

    void (async () => {
      try {
        const [library, loaded] = await Promise.all([
          import('react-native-android-widget'),
          loadWidgetModel(),
        ]);
        if (cancelled) return;
        setPreview(() => library.WidgetPreview);
        setModel(loaded);
      } catch (error) {
        logger.debug('widget.previewUnavailable', { error });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (Platform.OS !== 'android') return null;

  const addToHomeScreen = async () => {
    try {
      const { requestPinWidget } = await import('react-native-android-widget');
      const { WIDGET_NAME } = await import('../services/widgetTaskHandler');
      const supported = await requestPinWidget({ widgetName: WIDGET_NAME });
      if (!supported) toast.show(t('widget.pinUnsupported'));
    } catch (error) {
      logger.debug('widget.pinFailed', { error });
      toast.show(t('widget.pinUnsupported'));
    }
  };

  const refresh = async () => {
    await refreshWidget();
    setModel(await loadWidgetModel().catch(() => null));
    toast.show(t('widget.refreshed'));
  };

  return (
    <ListSection title={t('widget.title')}>
      <View className="items-center px-4 pb-2 pt-4">
        {Preview && model ? (
          <Preview
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
            renderWidget={({ width, height }) => (
              <WasilahWidget model={model} width={width} height={height} />
            )}
          />
        ) : (
          <View
            className="rounded-3xl bg-surface-pressed"
            style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          />
        )}
        <Text variant="caption" tone="muted" className="mt-3 text-center">
          {t('widget.hint')}
        </Text>
      </View>

      <ListRow label={t('widget.addToHome')} icon="add" onPress={() => void addToHomeScreen()} />
      <ListRow label={t('widget.refresh')} icon="sync" onPress={() => void refresh()} />
    </ListSection>
  );
}
