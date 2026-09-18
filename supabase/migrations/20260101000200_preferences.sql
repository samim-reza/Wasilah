-- ---------------------------------------------------------------------------
-- User preferences.
--
-- Split into three tables by concern rather than one wide row:
--   user_preferences        — app-level (appearance, privacy consent)
--   user_quran_preferences  — reading/recitation choices
--   reminder_preferences    — when the user wants to be reminded
--   notification_preferences— how a reminder may be delivered
--
-- Keeping reminder intent separate from delivery mirrors the application's
-- module boundary: the reminder engine decides *whether*, the notification
-- service decides *how*.
-- ---------------------------------------------------------------------------

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme public.theme_preference not null default 'system',
  locale text not null default 'en',
  -- Analytics and crash reporting are opt-in, never assumed.
  analytics_opt_in boolean not null default false,
  crash_reports_opt_in boolean not null default true,
  haptics_enabled boolean not null default true,
  reduce_motion boolean not null default false,
  keep_screen_awake_while_reading boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_quran_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Quran Foundation translation resource IDs, in display order. An array
  -- because the reader supports showing several editions at once.
  translation_ids integer[] not null default array[131],
  tafsir_id integer,
  recitation_id integer not null default 7,
  arabic_font_size integer not null default 30 check (arabic_font_size between 18 and 60),
  translation_font_size integer not null default 16 check (translation_font_size between 12 and 32),
  show_translation boolean not null default true,
  show_word_by_word boolean not null default false,
  mode public.reading_mode not null default 'translation',
  playback_rate numeric(3, 2) not null default 1.0 check (playback_rate between 0.5 and 2.0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminder_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,

  daily_reminder_enabled boolean not null default true,
  -- Local wall-clock time, interpreted in the user's timezone from profiles.
  daily_reminder_time time not null default '20:00',

  streak_reminder_enabled boolean not null default true,
  goal_reminder_enabled boolean not null default false,
  todays_ayah_enabled boolean not null default true,
  prayer_reminders_enabled boolean not null default false,
  weather_reminders_enabled boolean not null default false,

  -- Quiet hours may wrap past midnight (e.g. 22:30 → 07:00); the reminder rules
  -- handle the wrap rather than storing two ranges.
  quiet_hours_enabled boolean not null default true,
  quiet_hours_start time not null default '22:30',
  quiet_hours_end time not null default '07:00',

  -- Hard ceiling on notifications per local day. The engine also applies a
  -- cooldown between individual notifications.
  max_notifications_per_day smallint not null default 2
    check (max_notifications_per_day between 0 and 6),
  min_minutes_between_notifications smallint not null default 180
    check (min_minutes_between_notifications between 0 and 1440),

  -- Set when the user repeatedly ignores reminders, so the engine can back off.
  adaptive_frequency_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled boolean not null default true,
  -- Per-category opt-out. Absent key means enabled, so adding a new category
  -- never silently disables it for existing users.
  disabled_categories public.notification_category[] not null default '{}',
  sound_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-prayer reminder rules. A row only exists for prayers the user enabled.
create table public.prayer_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prayer public.prayer_name not null,
  direction public.reminder_offset_direction not null default 'after',
  offset_minutes smallint not null default 15 check (offset_minutes between 0 and 180),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, prayer)
);

-- Prayer calculation settings live apart from reminder rules because they also
-- drive the prayer-times display, which works with no reminders enabled.
create table public.prayer_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Adhan library method key, e.g. 'MuslimWorldLeague', 'Karachi'.
  calculation_method text not null default 'MuslimWorldLeague',
  madhab text not null default 'shafi' check (madhab in ('shafi', 'hanafi')),
  high_latitude_rule text not null default 'middleofthenight',
  -- Coarse coordinates only, rounded by the client to ~1 decimal place (~11km)
  -- before storage. Precise location is never persisted.
  latitude numeric(5, 2),
  longitude numeric(5, 2),
  city_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- updated_at triggers ----------------------------------------------------
create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();
create trigger user_quran_preferences_set_updated_at before update on public.user_quran_preferences
  for each row execute function public.set_updated_at();
create trigger reminder_preferences_set_updated_at before update on public.reminder_preferences
  for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();
create trigger prayer_reminder_rules_set_updated_at before update on public.prayer_reminder_rules
  for each row execute function public.set_updated_at();
create trigger prayer_settings_set_updated_at before update on public.prayer_settings
  for each row execute function public.set_updated_at();

-- --- Row Level Security -----------------------------------------------------
-- Every preference table follows the same rule: a row is visible and writable
-- only by the user it belongs to.
alter table public.user_preferences enable row level security;
alter table public.user_quran_preferences enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.prayer_reminder_rules enable row level security;
alter table public.prayer_settings enable row level security;

create policy "own row" on public.user_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row" on public.user_quran_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row" on public.reminder_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row" on public.notification_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.prayer_reminder_rules for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row" on public.prayer_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index prayer_reminder_rules_user_idx on public.prayer_reminder_rules (user_id) where enabled;
