-- Occasion-linked dua reminders.
--
-- Two independent switches rather than one, because they interrupt at very
-- different moments and a user may well want one without the other:
--
--   dua_reminders_enabled — contextual duas (rain, the new crescent, Friday),
--     which fire shortly after the app observes the condition.
--   sleep_dua_enabled     — the nightly "do you know the dua for…?" prompt,
--     which needs sleep_time to know when the night begins.
--
-- Both default to false. A notification the user did not ask for is the fastest
-- way to lose notification permission altogether, and the existing reminder
-- categories already follow this rule.

alter table public.reminder_preferences
  add column dua_reminders_enabled boolean not null default false,
  add column sleep_dua_enabled boolean not null default false,
  -- Local wall-clock time, interpreted in the user's timezone from profiles,
  -- exactly as daily_reminder_time and the quiet-hours columns are.
  add column sleep_time time not null default '23:00';

comment on column public.reminder_preferences.sleep_time is
  'When the user says they go to sleep. The dua prompt fires before this, not at it.';
