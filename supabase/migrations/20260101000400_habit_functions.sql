-- ---------------------------------------------------------------------------
-- Habit engine functions.
--
-- All habit writes go through `record_reading_session`. Nothing else should
-- write to daily_progress or streaks, because keeping those two consistent is
-- exactly what this function exists to guarantee.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Does a day's accumulated progress satisfy a target expressed in `p_unit`?
--
-- Units are not interchangeable: a user whose goal is "5 minutes" is not
-- credited for reading 5 ayahs quickly, and vice versa. Comparing only the
-- matching measure keeps the promise the goal picker made.
-- ---------------------------------------------------------------------------
create or replace function public.progress_meets_target(
  p_unit public.goal_unit,
  p_amount integer,
  p_verses integer,
  p_seconds integer,
  p_pages numeric,
  p_rukus integer
)
returns boolean
language sql
immutable
as $$
  select case p_unit
    when 'ayahs'   then p_verses  >= p_amount
    when 'minutes' then p_seconds >= p_amount * 60
    when 'pages'   then p_pages   >= p_amount
    when 'rukus'   then p_rukus   >= p_amount
  end;
$$;

-- ---------------------------------------------------------------------------
-- Rebuilds the streak projection from daily_progress.
--
-- Uses the gaps-and-islands technique: subtracting a dense row number from each
-- completed date maps every consecutive run onto a constant, so runs can be
-- found with a single GROUP BY. Recomputing from scratch (rather than
-- incrementing a counter) is what makes out-of-order offline syncing correct —
-- a session that arrives three days late simply changes the islands.
--
-- `p_today` is the user's LOCAL date and must be supplied by the caller. The
-- current streak is the run ending today or yesterday; ending yesterday still
-- counts as current because the user has until local midnight to read.
-- ---------------------------------------------------------------------------
create or replace function public.recalculate_streak(p_user_id uuid, p_today date)
returns public.streaks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result public.streaks;
begin
  with completed as (
    select local_date
    from public.daily_progress
    where user_id = p_user_id and minimum_met
  ),
  islands as (
    select
      local_date,
      local_date - (row_number() over (order by local_date))::integer as island_key
    from completed
  ),
  runs as (
    select
      island_key,
      count(*)::integer      as run_length,
      min(local_date)        as run_start,
      max(local_date)        as run_end
    from islands
    group by island_key
  ),
  totals as (
    select
      coalesce(count(*) filter (where minimum_met), 0)::integer as active_days,
      coalesce(sum(verses_read), 0)::integer                    as verses,
      coalesce(sum(seconds_read), 0)::integer                   as seconds,
      max(local_date) filter (where minimum_met)                as last_completed
    from public.daily_progress
    where user_id = p_user_id
  ),
  current_run as (
    -- At most one run can end today or yesterday, so LIMIT 1 is safe.
    select run_length, run_start
    from runs
    where run_end in (p_today, p_today - 1)
    order by run_end desc
    limit 1
  )
  insert into public.streaks as s (
    user_id, current_streak, longest_streak, last_completed_date,
    total_active_days, total_verses_read, total_seconds_read, streak_started_on
  )
  select
    p_user_id,
    coalesce((select run_length from current_run), 0),
    coalesce((select max(run_length) from runs), 0),
    totals.last_completed,
    totals.active_days,
    totals.verses,
    totals.seconds,
    (select run_start from current_run)
  from totals
  on conflict (user_id) do update set
    current_streak      = excluded.current_streak,
    -- Never let the recorded best regress, even if history is edited or a row
    -- is deleted; the longest streak is a fact about the user's past.
    longest_streak      = greatest(s.longest_streak, excluded.longest_streak),
    last_completed_date = excluded.last_completed_date,
    total_active_days   = excluded.total_active_days,
    total_verses_read   = excluded.total_verses_read,
    total_seconds_read  = excluded.total_seconds_read,
    streak_started_on   = excluded.streak_started_on
  returning * into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Records one reading session and brings the day and streak up to date.
--
-- Idempotent on (user_id, client_session_id): replaying a queued offline
-- session is a no-op, so the sync queue can retry freely without inflating a
-- user's progress.
--
-- Returns the resulting day and streak so the client needs exactly one round
-- trip to refresh the home screen.
-- ---------------------------------------------------------------------------
create or replace function public.record_reading_session(
  p_client_session_id text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_local_date date,
  p_timezone text,
  p_verses_read integer default 0,
  p_pages_read numeric default 0,
  p_rukus_read integer default 0,
  p_chapter_id smallint default null,
  p_start_verse smallint default null,
  p_end_verse smallint default null,
  p_source public.session_source default 'reader'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_duration integer;
  v_inserted boolean := false;
  v_goal public.goals;
  v_day public.daily_progress;
  v_streak public.streaks;
begin
  if v_user_id is null then
    raise exception 'record_reading_session requires an authenticated user'
      using errcode = '42501';
  end if;

  -- Clamp rather than reject: a device whose clock jumped mid-session should
  -- still have its reading counted, just not with an absurd duration.
  v_duration := greatest(0, least(86400, extract(epoch from (p_ended_at - p_started_at))::integer));

  insert into public.reading_sessions (
    user_id, client_session_id, started_at, ended_at, duration_seconds,
    chapter_id, start_verse, end_verse, verses_read, pages_read,
    source, local_date, timezone
  )
  values (
    v_user_id, p_client_session_id, p_started_at, p_ended_at, v_duration,
    p_chapter_id, p_start_verse, p_end_verse, greatest(0, p_verses_read),
    greatest(0, p_pages_read), p_source, p_local_date, p_timezone
  )
  on conflict (user_id, client_session_id) do nothing;

  get diagnostics v_inserted = row_count;

  select * into v_goal from public.goals where user_id = v_user_id;

  -- A user created before goals existed, or an anonymous-to-linked migration,
  -- may have no goal row. Fall back to the shipped defaults.
  if v_goal is null then
    insert into public.goals (user_id) values (v_user_id)
    on conflict (user_id) do nothing;
    select * into v_goal from public.goals where user_id = v_user_id;
  end if;

  if v_inserted then
    insert into public.daily_progress as dp (
      user_id, local_date, verses_read, seconds_read, pages_read, rukus_read,
      first_activity_at, last_activity_at
    )
    values (
      v_user_id, p_local_date, greatest(0, p_verses_read), v_duration,
      greatest(0, p_pages_read), greatest(0, p_rukus_read),
      p_started_at, p_ended_at
    )
    on conflict (user_id, local_date) do update set
      verses_read       = dp.verses_read  + excluded.verses_read,
      seconds_read      = dp.seconds_read + excluded.seconds_read,
      pages_read        = dp.pages_read   + excluded.pages_read,
      rukus_read        = dp.rukus_read   + excluded.rukus_read,
      first_activity_at = least(dp.first_activity_at, excluded.first_activity_at),
      last_activity_at  = greatest(dp.last_activity_at, excluded.last_activity_at);
  end if;

  -- Re-evaluate completion against the CURRENT goal every time. If a user
  -- lowers their goal mid-day, the day they already did enough for should
  -- immediately read as complete.
  update public.daily_progress dp
  set
    minimum_met = public.progress_meets_target(
      v_goal.minimum_unit, v_goal.minimum_amount,
      dp.verses_read, dp.seconds_read, dp.pages_read, dp.rukus_read
    ),
    goal_met = public.progress_meets_target(
      v_goal.goal_unit, v_goal.goal_amount,
      dp.verses_read, dp.seconds_read, dp.pages_read, dp.rukus_read
    )
  where dp.user_id = v_user_id and dp.local_date = p_local_date
  returning * into v_day;

  v_streak := public.recalculate_streak(v_user_id, p_local_date);

  return jsonb_build_object(
    'recorded', v_inserted,
    'day', to_jsonb(v_day),
    'streak', to_jsonb(v_streak)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Re-evaluates completion for every day after a goal change, then rebuilds the
-- streak. Lowering a goal can retroactively complete past days, which is the
-- behaviour users expect and which a naive implementation silently gets wrong.
-- ---------------------------------------------------------------------------
create or replace function public.reevaluate_progress(p_today date)
returns public.streaks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.goals;
begin
  if v_user_id is null then
    raise exception 'reevaluate_progress requires an authenticated user'
      using errcode = '42501';
  end if;

  select * into v_goal from public.goals where user_id = v_user_id;
  if v_goal is null then
    return public.recalculate_streak(v_user_id, p_today);
  end if;

  update public.daily_progress dp
  set
    minimum_met = public.progress_meets_target(
      v_goal.minimum_unit, v_goal.minimum_amount,
      dp.verses_read, dp.seconds_read, dp.pages_read, dp.rukus_read
    ),
    goal_met = public.progress_meets_target(
      v_goal.goal_unit, v_goal.goal_amount,
      dp.verses_read, dp.seconds_read, dp.pages_read, dp.rukus_read
    )
  where dp.user_id = v_user_id;

  return public.recalculate_streak(v_user_id, p_today);
end;
$$;

-- ---------------------------------------------------------------------------
-- Records a milestone. Thresholds live in the application so the copy and the
-- rule stay together; this only stores the fact and the moment.
-- ---------------------------------------------------------------------------
create or replace function public.unlock_achievement(p_achievement_key text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception 'unlock_achievement requires an authenticated user'
      using errcode = '42501';
  end if;

  insert into public.achievements (user_id, achievement_key)
  values (v_user_id, p_achievement_key)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;
