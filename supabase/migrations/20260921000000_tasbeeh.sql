-- Tasbeeh counters.
--
-- One row per dhikr the user keeps. The counting model follows what a physical
-- tasbeeh does: you count up to a round size, the round rolls over, and the
-- rounds accumulate. So `total_count` is the only number actually stored —
-- rounds and the position within the current round are derived from it, which
-- makes them impossible to disagree with each other.
--
-- The daily figure is separate because it answers a different question ("have
-- I done today's dhikr?") and has to reset at local midnight. It is stored
-- with the date it belongs to rather than being cleared by a scheduled job:
-- there is no server-side clock that knows the user's timezone, and a job that
-- ran at the wrong midnight would erase a day's work.

create table public.tasbeeh (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null check (char_length(trim(name)) between 1 and 80),
  -- The dhikr itself, shown large on the counter. Optional: a user may want a
  -- counter for something they know by heart and do not need displayed.
  arabic text,

  -- How many before a round completes. 33 and 100 are the common ones; the
  -- screenshot that prompted this feature used 1000.
  round_size integer not null default 33 check (round_size between 1 and 100000),
  -- Zero means "no daily target", which hides the progress ring rather than
  -- showing one that can never fill.
  daily_target integer not null default 0 check (daily_target >= 0),

  total_count bigint not null default 0 check (total_count >= 0),

  -- Today's tally, and the local date it belongs to. When the stored date is
  -- not the user's today, the count reads as zero without needing a write.
  today_count integer not null default 0 check (today_count >= 0),
  today_date date,

  -- User-controlled ordering in the list.
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasbeeh_user_position_idx on public.tasbeeh (user_id, position, created_at);

create trigger tasbeeh_set_updated_at before update on public.tasbeeh
  for each row execute function public.set_updated_at();

alter table public.tasbeeh enable row level security;

create policy "own rows" on public.tasbeeh for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
