import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { useToast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Pressable } from '@/components/ui/Pressable';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { AuthField } from '@/features/auth/components/AuthField';
import { signIn } from '@/features/auth/services/authService';
import { hasValidationErrors, validateSignIn } from '@/features/auth/utils/authValidation';
import type { AuthValidationErrors } from '@/features/auth/types/auth.types';
import { isAppError } from '@/lib/api/errors';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export default function LoginScreen() {
  const { t } = useTranslation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<AuthValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirmed } = useLocalSearchParams<{ confirmed?: string }>();

  // Arriving from the confirmation link: say so, once, and ask for the sign-in.
  useEffect(() => {
    if (confirmed === '1') toast.show(t('auth.confirmedSignIn'), { icon: 'check' });
  }, [confirmed, toast, t]);

  const handleSubmit = async () => {
    const validation = validateSignIn({ email, password });
    setErrors(validation);
    if (hasValidationErrors(validation)) return;

    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      // The auth listener updates the session; dismissing returns the user to
      // wherever they were rather than resetting them to home.
      router.back();
    } catch (error) {
      const messageKey = isAppError(error)
        ? error.kind === 'unauthorized'
          ? 'auth.invalidCredentials'
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
          <ScreenHeader title={t('auth.signInTitle')} onBack={() => router.back()} />

          <View className="gap-4 pt-4">
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
              textContentType="password"
              autoComplete="current-password"
              onSubmitEditing={() => void handleSubmit()}
              returnKeyType="go"
            />

            <Pressable
              className="self-end"
              onPress={() => router.push('/(auth)/forgot-password')}
              haptic="none"
            >
              <Text variant="caption" tone="primary">
                {t('auth.forgotPassword')}
              </Text>
            </Pressable>

            <Button
              label={t('profile.signIn')}
              onPress={() => void handleSubmit()}
              loading={isSubmitting}
              fullWidth
            />

            <View className="flex-row items-center justify-center gap-1 pt-2">
              <Text variant="caption" tone="muted">
                {t('auth.noAccount')}
              </Text>
              <Pressable onPress={() => router.replace('/(auth)/signup')} haptic="none">
                <Text variant="caption" tone="primary" className="font-semibold">
                  {t('profile.signUp')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
