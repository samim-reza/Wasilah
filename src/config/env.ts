/**
 * Validated access to build-time environment configuration.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` at bundle time, so these must be
 * referenced as full static property accesses — destructuring or dynamic keys
 * will silently produce `undefined` in a release build.
 *
 * Validation happens once at module load and throws loudly in development so a
 * missing key surfaces immediately rather than as a confusing network error.
 */
import { z } from 'zod';

const appEnvSchema = z.enum(['development', 'preview', 'production']);

const schema = z.object({
  supabaseUrl: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  supabaseAnonKey: z.string().min(1, 'EXPO_PUBLIC_SUPABASE_ANON_KEY is required'),
  appEnv: appEnvSchema,
  sentryDsn: z.string().url().optional().or(z.literal('')),
  posthogKey: z.string().optional().or(z.literal('')),
  posthogHost: z.string().url().optional().or(z.literal('')),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

const raw = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnv,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? '',
};

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(
    `Wasilah is misconfigured. Copy .env.example to .env.local and fill in:\n${issues}`,
  );
}

export const env = Object.freeze(parsed.data);

export const isDevelopment = env.appEnv === 'development';
export const isProduction = env.appEnv === 'production';

/** Observability is strictly opt-in; both integrations no-op without a key. */
export const isSentryEnabled = Boolean(env.sentryDsn);
export const isAnalyticsEnabled = Boolean(env.posthogKey);
