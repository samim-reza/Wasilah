-- The dua catalogue now has its words, so the contextual dua reminders
-- (rain, thunder, the crescent, Friday, the nightly "do you know…") are on
-- by default. They were off only because there was nothing to send.
--
-- Existing rows are switched on too: every account so far was created while
-- the toggle could not do anything, so "off" there was never a choice.
alter table public.reminder_preferences
  alter column dua_reminders_enabled set default true;

update public.reminder_preferences
   set dua_reminders_enabled = true
 where dua_reminders_enabled = false;
