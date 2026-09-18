/**
 * Catches render-time crashes so a broken screen does not take the whole app
 * down to a white screen.
 *
 * A class component because React only exposes `componentDidCatch` /
 * `getDerivedStateFromError` to classes — there is no hook equivalent.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { logger } from '@/lib/monitoring/logger';
import { captureException } from '@/lib/monitoring/sentry';

interface Props {
  children: ReactNode;
  /** Identifies where the boundary sits, e.g. 'reader'. */
  scope: string;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('ui.renderCrash', { scope: this.props.scope, error });
    captureException(error, {
      scope: this.props.scope,
      componentStack: info.componentStack,
    });
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    // Deliberately not translated: the i18n provider may itself be the thing
    // that failed, and a crash screen that crashes is worse than English.
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
        <Icon name="error" size={32} color="danger" />
        <Text variant="subheading" className="text-center">
          Something went wrong
        </Text>
        <Text tone="muted" className="text-center">
          This screen could not be displayed. You can try again.
        </Text>
        <View className="mt-2">
          <Button label="Try again" onPress={this.reset} variant="secondary" />
        </View>
      </View>
    );
  }
}
