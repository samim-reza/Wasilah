-- Simplifies the tasbeeh model to what the counter actually needs.
--
-- Two fields go:
--
--   `arabic` — the name is the display. A user writing "سُبْحَانَ ٱللَّٰهِ" as the
--   name gets exactly that on screen, so a second field for the same text was
--   asking the same question twice.
--
--   `round_size` — it duplicated `daily_target`. Rounds are now completed
--   daily targets, which is the number a user actually tracks.

alter table public.tasbeeh drop column if exists arabic;
alter table public.tasbeeh drop column if exists round_size;

comment on column public.tasbeeh.daily_target is
  'Target per day. Also the round size: rounds are completed targets.';
