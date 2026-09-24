import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { useToast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { AuthField } from '@/features/auth/components/AuthField';
import { signUp } from '@/features/auth/services/authService';
import { hasValidationErrors, validateSignUp } from '@/features/auth/utils/authValidation';
import type { AuthValidationErrors } from '@/features/auth/types/auth.types';
import { isAppError } from '@/lib/api/errors';
import { alert } from '@/lib/ui/confirm';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validation = validateSignUp({ email, password, confirmPassword });
    setErrors(validation);
    if (hasValidationErrors(validation)) return;

    setIsSubmitting(true);
    try {
      const session = await signUp({ email, password, displayName });

      // With email confirmation on there is no session yet; that is a success,
      // not a failure, and the user needs to be told what happens next — in a
      // dialog they have to dismiss, not a toast that slides away while they
      // are still looking at the form. Then straight to sign-in, which is
      // where the confirmation link will send them anyway.
      if (!session) {
        await alert({
          title: t('auth.confirmSentTitle'),
          message: t('auth.confirmSentBody', { email }),
          dismissLabel: t('common.ok'),
        });
        router.replace('/(auth)/login');
        return;
      }
      router.back();
    } catch (error) {
      const messageKey = isAppError(error)
        ? error.kind === 'forbidden'
          ? 'auth.emailInUse'
          : error.userMessageKey
        : 'errors.unknown';
      toast.show(t(messageKey), { tone: 'error', icon: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen edges={['top']} noPadding>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-4 pb-10" keyboardShouldPersistTaps="handled">
          <ScreenHeader title={t('auth.signUpTitle')} onBack={() => router.back()} />

          <View className="gap-4 pt-4">
            <AuthField
              label={t('profile.displayName')}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              textContentType="name"
            />

            <AuthField
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              errorKey={errors.email}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <AuthField
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              errorKey={errors.password}
              isPassword
              textContentType="newPassword"
              autoComplete="new-password"
            />

            <AuthField
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              errorKey={errors.confirmPassword}
              isPassword
              textContentType="newPassword"
              onSubmitEditing={() => void handleSubmit()}
              returnKeyType="go"
            />

            <Button
              label={t('profile.signUp')}
              onPress={() => void handleSubmit()}
              loading={isSubmitting}
              fullWidth
            />

            <View className="flex-row items-center justify-center gap-1 pt-2">
              <Text variant="caption" tone="muted">
                {t('auth.hasAccount')}
              </Text>
              <Pressable onPress={() => router.replace('/(auth)/login')} haptic="none">
                <Text variant="caption" tone="primary" className="font-semibold">
                  {t('profile.signIn')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
