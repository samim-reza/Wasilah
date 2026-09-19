import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { AuthField } from '@/features/auth/components/AuthField';
import { requestPasswordReset } from '@/features/auth/services/authService';
import { validateEmail } from '@/features/auth/utils/authValidation';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [errorKey, setErrorKey] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationError = validateEmail(email);
    setErrorKey(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      // Deliberately unconditional: revealing whether an address is registered
      // would leak account existence.
      toast.show(t('auth.resetSent'), { icon: 'mail' });
      router.back();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen edges={['top']} noPadding>
      <ScrollView contentContainerClassName="px-4 pb-10" keyboardShouldPersistTaps="handled">
        <ScreenHeader title={t('auth.resetTitle')} onBack={() => router.back()} />

        <View className="gap-4 pt-4">
          <Text tone="muted">{t('auth.resetBody')}</Text>

          <AuthField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            errorKey={errorKey}
            keyboardType="email-address"
            autoComplete="email"
            onSubmitEditing={() => void handleSubmit()}
            returnKeyType="go"
          />

          <Button
            label={t('common.continue')}
            onPress={() => void handleSubmit()}
            loading={isSubmitting}
            fullWidth
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
