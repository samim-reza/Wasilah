/**
 * A labelled auth input with inline validation.
 *
 * Errors are held until blur or submit rather than shown while typing: flagging
 * "invalid email" after the first character is technically correct and
 * genuinely unpleasant.
 */
import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

export interface AuthFieldProps extends Omit<TextInputProps, 'style' | 'className'> {
  label: string;
  /** i18n key for the error, or undefined when valid. */
  errorKey?: string;
  isPassword?: boolean;
}

export function AuthField({ label, errorKey, isPassword = false, ...props }: AuthFieldProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isHidden, setIsHidden] = useState(isPassword);

  return (
    <View className="gap-1.5">
      <Text variant="caption" tone="muted">
        {label}
      </Text>

      <View
        className={`flex-row items-center rounded-lg border bg-surface-muted px-3 ${
          errorKey ? 'border-danger' : 'border-transparent'
        }`}
      >
        <TextInput
          className="flex-1 py-3 text-base text-content"
          placeholderTextColor={colors.textSubtle}
          secureTextEntry={isHidden}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          {...props}
        />

        {isPassword && (
          <IconButton
            name={isHidden ? 'eye' : 'eyeOff'}
            size={18}
            color="textSubtle"
            onPress={() => setIsHidden((current) => !current)}
            accessibilityLabel={isHidden ? 'Show password' : 'Hide password'}
          />
        )}
      </View>

      {errorKey && (
        <Text variant="caption" tone="danger">
          {t(errorKey)}
        </Text>
      )}
    </View>
  );
}
