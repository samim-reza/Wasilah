-- ---------------------------------------------------------------------------
-- Notification delivery state.
--
-- This schema is about DELIVERY, not intent. What the user wants to be
-- reminded about lives in `reminder_preferences`; which channels are allowed
-- lives in `notification_preferences`; what was actually sent lives here.
--
-- `notification_history` is the memory that makes anti-fatigue rules possible:
-- frequency caps, cooldowns and duplicate suppression are all queries over it.
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Expo push token. Unique globally: a device that switches accounts must move
  -- to the new user, never receive both users' notifications.
  token text not null unique,
  platform public.device_platform not null,

  -- Stable per install, used to reconcile a reinstalled app with its old token.
  device_id text,
  app_version text,
  -- Cached from profiles so the delivery worker does not need a join per row.
  timezone text not null default 'UTC',

  -- Cleared when Expo reports the token as unregistered, so dead tokens stop
  -- being retried.
  invalidated_at timestamptz,

  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id) where invalidated_at is null;

-- ---------------------------------------------------------------------------
-- Every notification the engine decided to send, and what became of it.
-- ---------------------------------------------------------------------------
create table public.notification_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  category public.notification_category not null,
  -- Which content template produced the copy, e.g. 'streakReminder'.
  template_key text not null,
  outcome public.notification_outcome not null default 'sent',

  -- Local date of sending, so per-day caps are evaluated in the user's day.
  local_date date not null,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  dismissed_at timestamptz,

  -- Deep link target, kept so an opened notification can be attributed.
  route text,
  -- Template variables only (streak length, ayah reference). Never note or
  -- search content.
  variables jsonb not null default '{}'::jsonb,

  -- Lets the engine refuse to send the same thing twice in a day.
  dedupe_key text,

  created_at timestamptz not null default now()
);

-- The anti-fatigue queries: "how many today" and "when was the last one".
create index notification_history_user_date_idx
  on public.notification_history (user_id, local_date desc);
create index notification_history_user_sent_idx
  on public.notification_history (user_id, sent_at desc);
create unique index notification_history_dedupe_idx
  on public.notification_history (user_id, local_date, dedupe_key)
  where dedupe_key is not null;

-- ---------------------------------------------------------------------------
-- Editable notification copy, so wording can be tuned without an app release.
-- The app always ships a local fallback for every template key.
-- ---------------------------------------------------------------------------
create table public.notification_templates (
  key text not null,
  locale text not null default 'en',
  category public.notification_category not null,
  title text not null,
  body text not null,
  route text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);

create trigger notification_templates_set_updated_at before update on public.notification_templates
  for each row execute function public.set_updated_at();

-- --- Row Level Security -----------------------------------------------------
alter table public.push_tokens enable row level security;
alter table public.notification_history enable row level security;
alter table public.notification_templates enable row level security;

create policy "own rows" on public.push_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- History is readable and updatable (to mark opened/dismissed) by its owner,
-- but only the service role may insert: the engine decides what gets sent, and
-- a client must not be able to fabricate its own delivery history and thereby
-- manipulate frequency caps.
create policy "own rows readable" on public.notification_history for select
  using (auth.uid() = user_id);
create policy "own rows updatable" on public.notification_history for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows insertable" on public.notification_history for insert
  with check (auth.uid() = user_id);

-- Templates are public read-only content.
create policy "templates are readable by everyone" on public.notification_templates for select
  using (is_active);

-- ---------------------------------------------------------------------------
-- Marks a notification as opened or dismissed. Exposed as an RPC so the app's
-- notification handler does not need to know the table's shape.
-- ---------------------------------------------------------------------------
create or replace function public.record_notification_outcome(
  p_notification_id uuid,
  p_outcome public.notification_outcome
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.notification_history
  set
    outcome      = p_outcome,
    opened_at    = case when p_outcome = 'opened'    then coalesce(opened_at, now())    else opened_at end,
    dismissed_at = case when p_outcome = 'dismissed' then coalesce(dismissed_at, now()) else dismissed_at end
  where id = p_notification_id and user_id = auth.uid();
end;
$$;
