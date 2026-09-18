/**
 * Client-side credential validation.
 *
 * Purely to give immediate feedback — the server validates independently and
 * is the authority. Kept as pure functions so the rules can be tested without
 * rendering a form.
 */
import type { AuthValidationErrors } from '../types/auth.types';

/**
 * Deliberately permissive. Strict email regexes reject valid addresses far more
 * often than they catch typos; delivery is the real test.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Supabase's own floor is 6; 8 is a more defensible minimum. */
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return 'auth.invalidEmail';
  if (!EMAIL_PATTERN.test(trimmed)) return 'auth.invalidEmail';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) return 'auth.passwordTooShort';
  return undefined;
}

export function validateSignUp(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): AuthValidationErrors {
  const errors: AuthValidationErrors = {};

  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;

  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'auth.passwordsDoNotMatch';
  }

  return errors;
}

export function validateSignIn(input: { email: string; password: string }): AuthValidationErrors {
  const errors: AuthValidationErrors = {};

  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = 'auth.passwordTooShort';

  return errors;
}

export function hasValidationErrors(errors: AuthValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}
