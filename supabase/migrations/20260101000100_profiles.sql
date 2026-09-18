-- ---------------------------------------------------------------------------
-- Profiles: the application-visible mirror of auth.users.
--
-- `timezone` is stored server-side because the notification engine runs without
-- the device present and must know which local midnight a user's day ends at.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  avatar_url text,
  -- IANA identifier (e.g. 'Asia/Dhaka'). Validated on write by the app; stored
  -- as text because Postgres has no timezone-name domain.
  timezone text not null default 'UTC',
  locale text not null default 'en',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles are readable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are updatable by their owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles are insertable by their owner"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Provision a profile and the default preference rows the moment a user is
-- created, so no client code has to handle "row does not exist yet" states.
--
-- SECURITY DEFINER because it runs from an auth.users trigger where auth.uid()
-- is not yet meaningful. `search_path` is pinned to prevent hijacking.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.user_quran_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.reminder_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.streaks (user_id) values (new.id) on conflict do nothing;
  insert into public.goals (user_id) values (new.id) on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
