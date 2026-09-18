import { View } from 'react-native';
import { router } from 'expo-router';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back button. Defaults to true when the stack can go back. */
  showBack?: boolean;
  onBack?: () => void;
  /** Right-aligned actions. */
  actions?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  actions,
}: ScreenHeaderProps) {
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    // Guard against a deep link opening a screen with nothing beneath it.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  return (
    <View className="flex-row items-center gap-2 py-2">
      {showBack && (
        <IconButton name="back" onPress={handleBack} accessibilityLabel={t('a11y.back')} />
      )}

      <View className="flex-1">
        <Text variant="heading" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {actions && <View className="flex-row items-center gap-1">{actions}</View>}
    </View>
  );
}
