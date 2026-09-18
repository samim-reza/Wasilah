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
import { isDevelopment } from '@/config/env';

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
  const isUnconfigured = isAppError(error) && error.kind === 'not_configured';

  if (compact) {
    return (
      <View className="flex-row items-center gap-3 rounded-lg bg-danger-muted p-3">
        <Icon
          name={isOffline ? 'offline' : isUnconfigured ? 'settings' : 'error'}
          size={18}
          color="danger"
        />
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
      <View
        className={`rounded-full p-4 ${isUnconfigured ? 'bg-warning-muted' : 'bg-danger-muted'}`}
      >
        <Icon
          name={isOffline ? 'offline' : isUnconfigured ? 'settings' : 'error'}
          size={28}
          color={isUnconfigured ? 'warning' : 'danger'}
        />
      </View>

      <Text variant="subheading" className="text-center">
        {isUnconfigured ? t('errors.setupTitle') : t('errors.title')}
      </Text>
      <Text tone="muted" className="text-center">
        {t(messageKey)}
      </Text>

      {/*
        The exact next step, shown only in development. It is the difference
        between five minutes and an afternoon for whoever sets this up next, and
        it must never reach a user, so it is gated on the build environment.
      */}
      {isUnconfigured && isDevelopment && (
        <View className="mt-2 rounded-lg bg-surface-muted px-4 py-3">
          <Text variant="caption" tone="subtle" className="text-center">
            Deploy the proxy and set its credentials:{'\n'}
            supabase functions deploy quran-proxy{'\n'}
            supabase secrets set QF_CLIENT_ID=… QF_CLIENT_SECRET=…
          </Text>
        </View>
      )}

      {onRetry && canRetry && (
        <View className="mt-2">
          <Button label={t('common.retry')} onPress={onRetry} icon="sync" variant="secondary" />
        </View>
      )}
    </View>
  );
}
