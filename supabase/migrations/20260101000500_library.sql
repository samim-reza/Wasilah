-- ---------------------------------------------------------------------------
-- The user's personal Quran library: bookmarks, collections, notes and the
-- reading position that powers "Continue reading".
--
-- Bookmark, note and collection are modelled as three separate concepts rather
-- than one "saved item" row, because they have genuinely different lifecycles:
-- a note can outlive a bookmark, and a bookmark can move between collections
-- without touching its note.
--
-- Verses are addressed by `verse_key` ('2:255'), the Quran Foundation
-- identifier, so nothing here depends on our own copy of Quran content.
-- ---------------------------------------------------------------------------

create table public.bookmark_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  verse_key text not null check (verse_key ~ '^\d{1,3}:\d{1,3}$'),
  -- Denormalised from verse_key so lists can sort in mushaf order without
  -- parsing text on every row.
  chapter_id smallint not null check (chapter_id between 1 and 114),
  verse_number smallint not null check (verse_number > 0),

  -- Deleting a collection keeps the bookmarks and simply un-files them.
  collection_id uuid references public.bookmark_collections (id) on delete set null,

  created_at timestamptz not null default now(),

  -- One bookmark per ayah per user; re-bookmarking is a no-op, not a duplicate.
  unique (user_id, verse_key)
);

create index bookmarks_user_created_idx on public.bookmarks (user_id, created_at desc);
create index bookmarks_user_position_idx on public.bookmarks (user_id, chapter_id, verse_number);
create index bookmarks_collection_idx on public.bookmarks (collection_id) where collection_id is not null;

-- ---------------------------------------------------------------------------
-- Notes are private reflections. They are never pre-filled, never generated,
-- and never shown to anyone but their author.
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  verse_key text not null check (verse_key ~ '^\d{1,3}:\d{1,3}$'),
  chapter_id smallint not null check (chapter_id between 1 and 114),
  verse_number smallint not null check (verse_number > 0),

  body text not null check (char_length(body) between 1 and 10000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, verse_key)
);

create index notes_user_updated_idx on public.notes (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- A single "where I was" marker per user. Separate from reading_history so the
-- hottest read in the app (the home screen's Continue card) is a primary-key
-- lookup.
-- ---------------------------------------------------------------------------
create table public.reading_positions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chapter_id smallint not null check (chapter_id between 1 and 114),
  verse_number smallint not null check (verse_number > 0),
  verse_key text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Which ayahs were actually viewed, used for "recommended reading" and for the
-- reading calendar. Capped by a retention job rather than kept forever.
-- ---------------------------------------------------------------------------
create table public.reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id smallint not null check (chapter_id between 1 and 114),
  verse_number smallint not null check (verse_number > 0),
  verse_key text not null,
  local_date date not null,
  read_at timestamptz not null default now()
);

create index reading_history_user_read_idx on public.reading_history (user_id, read_at desc);

-- --- updated_at triggers ----------------------------------------------------
create trigger bookmark_collections_set_updated_at before update on public.bookmark_collections
  for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
create trigger reading_positions_set_updated_at before update on public.reading_positions
  for each row execute function public.set_updated_at();

-- --- Row Level Security -----------------------------------------------------
alter table public.bookmark_collections enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notes enable row level security;
alter table public.reading_positions enable row level security;
alter table public.reading_history enable row level security;

create policy "own rows" on public.bookmark_collections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.bookmarks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row" on public.reading_positions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.reading_history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
