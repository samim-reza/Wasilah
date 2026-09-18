/**
 * The standard failure presentation.
 *
 * Takes the caught error rather than a message, so the user-facing copy always
 * comes from the error's own `userMessageKey` and can never drift from what
 * actually went wrong.
 */
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { isAppError } from '@/lib/api/errors';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  /** Compact form for inline use inside a list or card. */
  compact?: boolean;
}

export function ErrorState({ error, onRetry, compact = false }: ErrorStateProps) {
  const { t } = useTranslation();

  const messageKey = isAppError(error) ? error.userMessageKey : 'errors.unknown';
  const canRetry = !isAppError(error) || error.retryable;
  const isOffline = isAppError(error) && error.kind === 'offline';

  if (compact) {
    return (
      <View className="flex-row items-center gap-3 rounded-lg bg-danger-muted p-3">
        <Icon name={isOffline ? 'offline' : 'error'} size={18} color="danger" />
        <Text className="flex-1" tone="danger" variant="caption">
          {t(messageKey)}
        </Text>
        {onRetry && canRetry && (
          <Button label={t('common.retry')} onPress={onRetry} variant="ghost" size="sm" />
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-12">
      <View className="rounded-full bg-danger-muted p-4">
        <Icon name={isOffline ? 'offline' : 'error'} size={28} color="danger" />
      </View>

      <Text variant="subheading" className="text-center">
        {t('errors.title')}
      </Text>
      <Text tone="muted" className="text-center">
        {t(messageKey)}
      </Text>

      {onRetry && canRetry && (
        <View className="mt-2">
          <Button label={t('common.retry')} onPress={onRetry} icon="sync" variant="secondary" />
        </View>
      )}
    </View>
  );
}
