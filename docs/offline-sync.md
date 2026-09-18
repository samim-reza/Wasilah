# Offline behaviour and sync

The app must remain useful with no connection, and **offline reading must never
cost someone their streak**. That single requirement drives everything here.

## Reads and writes are handled differently

**Reads** come from the TanStack Query cache, which is persisted to disk. A cold
launch with no network still paints the surah list, recently read ayahs and the
last reading position.

Only Quran content, audio metadata and platform data are persisted to disk.
Bookmarks, notes, streaks and preferences are re-fetched from Supabase, because
mirroring personal data into unencrypted app storage is a worse trade than a
brief loading state.

**Writes** go into a durable queue first, then flush. Always — online and offline
take the same path. That ordering is what guarantees a write is never lost to a
connection that dropped mid-request, and it means the UI can update
optimistically with no special offline branch.

## The queue

SQLite (`wasilah-offline.db`), not AsyncStorage. The queue needs ordered reads,
per-row deletion and an attempt counter, all of which become read-modify-write
races on a single JSON blob — and a lost write here is a lost reading session.

Guarantees:

- **Order is preserved** (ascending id), so writes replay as the user made them.
- **An entry is removed only after the server confirms it.**
- **An entry that keeps failing is abandoned** after 5 attempts, so one bad
  payload cannot permanently block every later write.

## Why every operation is idempotent

| Operation         | Why a retry is safe                                   |
| ----------------- | ----------------------------------------------------- |
| `reading_session` | Deduplicated on `client_session_id` by the RPC        |
| `bookmark_add`    | `UNIQUE (user_id, verse_key)` with `ignoreDuplicates` |
| `bookmark_remove` | Deleting an absent row succeeds                       |
| `note_save`       | Upsert on `(user_id, verse_key)`                      |
| `note_delete`     | Same as bookmark removal                              |
| `position_save`   | Last write wins, guarded by timestamp                 |

## Conflict policy

Chosen per operation rather than globally. Nothing blindly overwrites server
state with a local snapshot.

**Reading sessions — server merges.** The RPC _adds_ to the day's totals and is
idempotent on the client session id. A replay cannot double-count, and two
devices reading on the same day both contribute.

**Bookmarks and notes — last write wins.** Small, personal, rarely edited from
two devices at once. Anything more elaborate would cost more than it saves.

**Reading position — newest timestamp wins.** The processor reads the server's
`updated_at` before writing and skips a stale local value. Skipping is a
_success_: the queue entry is resolved, not retried forever.

## When flushing happens

Three triggers, because any one alone leaves a gap:

1. the app comes to the foreground (the common case),
2. connectivity returns while the app is open,
3. a user signs in.

A flush pauses at the first offline error rather than burning every entry's
retry budget while there is no connection — those failures say nothing about the
entries themselves.

## Guest mode and sign-in

Writes made before signing in are queued under a placeholder user id. On
sign-in they are **adopted** by the new account and flushed, so nothing read as a
guest is thrown away. Any other user's leftovers are cleared at the same time, so
a shared device never replays one person's reading into another's account.

The guest's streak is computed locally by `localHabitStore` using the _same_
pure functions (`calculateStreak`) that the server mirrors in SQL — so the number
a guest sees is the number they keep after signing in, not a different one.

## Streaks survive being offline

Reading offline is recorded with the device's local date at the moment it
happened. When the session finally syncs, `recalculate_streak` rebuilds the
streak from the full set of completed days, so a session that arrives three days
late simply re-forms the islands and the streak is correct.

This is why the streak is recomputed rather than incremented. An incrementing
counter cannot be repaired by a late arrival; a recomputation does not need to be.

## Storage limits

The local habit store keeps **400 days** of daily totals — long enough for the
longest streak and the reading calendar to be meaningful, short enough that the
blob stays cheap to parse on every launch. Trimming preserves the best-ever
streak so a user's record is never lowered by retention.

The query cache is bounded by the one-week Quran Foundation caching limit (see
[`quran-api.md`](./quran-api.md)).

## What the user sees

`OfflineBanner` shows a thin bar while offline or while writes are pending, and
disappears once everything is synced. It is deliberately quiet: the app works
offline, so this is information, not an error.
