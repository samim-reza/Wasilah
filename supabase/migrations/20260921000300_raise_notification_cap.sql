-- Raises the per-day notification ceiling from 6 to 10.
--
-- The column allowed 0–6 and defaulted to 2, which was chosen when the only
-- notifications were the daily and streak reminders. With prayer reminders,
-- contextual duas and the nightly dua prompt all able to fire, 2 meant later
-- categories were silently dropped by the cap rather than by any rule about
-- whether they were worth sending.
--
-- The anti-fatigue rules still apply underneath this: quiet hours, the
-- minimum gap between notifications, and the adaptive back-off when someone
-- ignores several in a row. This is a ceiling, not a target.

alter table public.reminder_preferences
  drop constraint if exists reminder_preferences_max_notifications_per_day_check;

alter table public.reminder_preferences
  add constraint reminder_preferences_max_notifications_per_day_check
  check (max_notifications_per_day between 0 and 10);

alter table public.reminder_preferences
  alter column max_notifications_per_day set default 10;

-- Existing rows keep any value the user deliberately chose above the old
-- default; only the untouched default of 2 moves up.
update public.reminder_preferences
  set max_notifications_per_day = 10
  where max_notifications_per_day = 2;
