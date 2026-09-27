-- Weather reminders and the dua before sleep are on by default, alongside the
-- occasion duas that already were (20260925000000_dua_reminders_on_by_default).
--
-- Existing rows are switched on too: until now "off" was only ever the
-- default, not a choice anyone made, and leaving it would mean nobody who
-- already has an account ever sees these reminders. Anyone who does not want
-- them switches them off in notification settings, and that choice sticks.

alter table public.reminder_preferences
  alter column weather_reminders_enabled set default true,
  alter column sleep_dua_enabled set default true,
  alter column dua_reminders_enabled set default true;

update public.reminder_preferences
   set weather_reminders_enabled = true,
       sleep_dua_enabled = true,
       dua_reminders_enabled = true
 where weather_reminders_enabled = false
    or sleep_dua_enabled = false
    or dua_reminders_enabled = false;
