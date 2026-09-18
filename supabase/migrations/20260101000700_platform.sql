-- ---------------------------------------------------------------------------
-- Platform tables: feature flags, the shared daily ayah, and announcements.
--
-- These are the only tables readable without authentication, because the app
-- must work — and must be able to show Today's Ayah — before a user signs in.
-- ---------------------------------------------------------------------------

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  -- 0–100. The client hashes (flag key + install id) to decide membership, so
  -- a user's bucket is stable across launches.
  rollout_percentage smallint not null default 100
    check (rollout_percentage between 0 and 100),
  description text,
  updated_at timestamptz not null default now()
);

create trigger feature_flags_set_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The shared Today's Ayah.
--
-- A server-chosen row is preferred over a client-side random pick for two
-- reasons: everyone sees the same ayah on a given day (which makes sharing
-- meaningful), and the selection can be curated. The client still has a
-- deterministic local fallback so the card renders offline.
-- ---------------------------------------------------------------------------
create table public.daily_ayah_selections (
  selection_date date primary key,
  verse_key text not null check (verse_key ~ '^\d{1,3}:\d{1,3}$'),
  chapter_id smallint not null check (chapter_id between 1 and 114),
  verse_number smallint not null check (verse_number > 0),
  -- Optional editorial note about why this ayah was chosen. Never scripture.
  curator_note text,
  created_at timestamptz not null default now()
);

create table public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  locale text not null default 'en',
  -- Only shown to installs at or above this version.
  min_app_version text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- --- Row Level Security -----------------------------------------------------
alter table public.feature_flags enable row level security;
alter table public.daily_ayah_selections enable row level security;
alter table public.app_announcements enable row level security;

-- Public read; writes are service-role only (no policy grants write).
create policy "flags are publicly readable" on public.feature_flags for select using (true);
create policy "daily ayah is publicly readable" on public.daily_ayah_selections for select using (true);
create policy "active announcements are publicly readable" on public.app_announcements for select
  using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));
