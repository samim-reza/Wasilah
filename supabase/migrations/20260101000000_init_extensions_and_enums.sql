-- ---------------------------------------------------------------------------
-- Extensions and shared enums.
--
-- Enums are used instead of text + CHECK because they are self-documenting in
-- generated TypeScript types and make invalid values impossible at the storage
-- layer rather than only at the application layer.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto" with schema extensions;

-- How a daily goal or minimum is measured.
create type public.goal_unit as enum ('ayahs', 'pages', 'minutes', 'rukus');

-- Where a reading session came from. Used for analytics and to let the habit
-- engine weight a deliberate reading session differently from a tap on the
-- Today's Ayah card, should that ever become desirable.
create type public.session_source as enum ('reader', 'daily_ayah', 'audio', 'search');

create type public.notification_category as enum (
  'daily_reminder',
  'goal_reminder',
  'streak_reminder',
  'todays_ayah',
  'prayer_reminder',
  'weather_reminder',
  'announcement'
);

create type public.notification_outcome as enum ('sent', 'delivered', 'opened', 'dismissed', 'failed');

create type public.prayer_name as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');

create type public.reminder_offset_direction as enum ('before', 'after');

create type public.device_platform as enum ('ios', 'android', 'web');

create type public.reading_mode as enum ('translation', 'arabic_only', 'mushaf');

create type public.theme_preference as enum ('light', 'dark', 'system');

-- ---------------------------------------------------------------------------
-- Shared trigger: keeps `updated_at` honest without trusting the client.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
