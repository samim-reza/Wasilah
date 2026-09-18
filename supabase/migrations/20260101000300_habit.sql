-- ---------------------------------------------------------------------------
-- The habit engine's storage: goals, reading sessions, daily progress, streaks.
--
-- Design note on dates: every "day" column is a `date` in the USER'S local
-- timezone, computed on the device, never derived from a timestamp at read
-- time. Deriving it server-side would silently attribute a 00:30 reading
-- session in Dhaka to the previous UTC day and break streaks for most of the
-- world. Timestamps are still stored in UTC for ordering and analytics.
-- ---------------------------------------------------------------------------

create table public.goals (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- The aspirational target.
  goal_unit public.goal_unit not null default 'ayahs',
  goal_amount integer not null default 5 check (goal_amount > 0 and goal_amount <= 6236),

  -- The floor that counts as "did not break the chain". Kept deliberately
  -- separate and defaulted to the smallest possible commitment.
  minimum_unit public.goal_unit not null default 'ayahs',
  minimum_amount integer not null default 1 check (minimum_amount > 0 and minimum_amount <= 6236),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The minimum must never be harder than the goal when measured the same way.
  constraint minimum_not_above_goal
    check (minimum_unit <> goal_unit or minimum_amount <= goal_amount)
);

create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reading sessions.
--
-- `client_session_id` is generated on the device and is UNIQUE per user. It is
-- what makes the offline sync queue safe to retry: replaying the same session
-- is a no-op rather than double-counting a day's reading.
-- ---------------------------------------------------------------------------
create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_session_id text not null,

  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0 and duration_seconds <= 86400),

  chapter_id smallint check (chapter_id between 1 and 114),
  start_verse smallint check (start_verse > 0),
  end_verse smallint check (end_verse > 0),
  verses_read integer not null default 0 check (verses_read >= 0),
  pages_read numeric(6, 2) not null default 0 check (pages_read >= 0),

  source public.session_source not null default 'reader',

  -- The user's local calendar date for this session. See the note above.
  local_date date not null,
  timezone text not null default 'UTC',

  created_at timestamptz not null default now(),

  unique (user_id, client_session_id),
  constraint verse_range_ordered check (
    start_verse is null or end_verse is null or end_verse >= start_verse
  ),
  constraint session_ordered check (ended_at >= started_at)
);

-- Covers the two hot queries: a user's recent history, and rolling up one day.
create index reading_sessions_user_date_idx
  on public.reading_sessions (user_id, local_date desc);
create index reading_sessions_user_started_idx
  on public.reading_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Daily progress: one row per user per local day, maintained by
-- `record_reading_session`. Denormalised on purpose — the home screen reads it
-- on every launch and must not aggregate sessions at request time.
-- ---------------------------------------------------------------------------
create table public.daily_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,

  verses_read integer not null default 0 check (verses_read >= 0),
  seconds_read integer not null default 0 check (seconds_read >= 0),
  pages_read numeric(6, 2) not null default 0 check (pages_read >= 0),
  rukus_read integer not null default 0 check (rukus_read >= 0),

  minimum_met boolean not null default false,
  goal_met boolean not null default false,

  first_activity_at timestamptz,
  last_activity_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, local_date)
);

create trigger daily_progress_set_updated_at before update on public.daily_progress
  for each row execute function public.set_updated_at();

-- Partial index: the streak recomputation only ever scans completed days.
create index daily_progress_completed_idx
  on public.daily_progress (user_id, local_date desc)
  where minimum_met;

-- ---------------------------------------------------------------------------
-- Streaks: a cached projection of `daily_progress`, never the source of truth.
-- It can always be rebuilt by `recalculate_streak`, which is what makes
-- out-of-order offline syncing safe.
-- ---------------------------------------------------------------------------
create table public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_completed_date date,
  total_active_days integer not null default 0 check (total_active_days >= 0),
  total_verses_read integer not null default 0 check (total_verses_read >= 0),
  total_seconds_read integer not null default 0 check (total_seconds_read >= 0),
  streak_started_on date,
  updated_at timestamptz not null default now()
);

create trigger streaks_set_updated_at before update on public.streaks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Achievements: reading milestones. Deliberately a log of what was reached and
-- when, with no score or ranking attached.
-- ---------------------------------------------------------------------------
create table public.achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Stable key such as 'ayahs_100' or 'streak_30', defined in the app.
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.goals enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.daily_progress enable row level security;
alter table public.streaks enable row level security;
alter table public.achievements enable row level security;

create policy "own row" on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.reading_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.daily_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row" on public.streaks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.achievements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
