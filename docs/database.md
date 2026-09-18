# Database

Postgres via Supabase. Migrations live in `supabase/migrations/` and run in
filename order.

## Principles

**Every day column is a local date.** Columns named `local_date` hold the
user's local calendar date, computed on the device, never derived from a
timestamp at read time. Deriving it server-side would attribute a 00:30 reading
session in Dhaka to the previous UTC day and break streaks for most of the
world. Timestamps are still stored in UTC for ordering.

**RLS is the security boundary, not the client.** Every table holding personal
data has row-level security enabled with a policy of `auth.uid() = user_id`.
There is no table where a user can read another user's rows. Frontend checks are
a convenience; the database is what actually enforces this.

**No Quran content is stored.** Text, translations, tafsir and recitations come
from the Quran Foundation API at request time. Copying them into this database
would breach the developer terms and create a second, unversioned source of
scripture.

## Tables

### Identity and preferences

| Table                      | Holds                                                     |
| -------------------------- | --------------------------------------------------------- |
| `profiles`                 | Display name, **timezone**, locale, onboarding completion |
| `user_preferences`         | Theme, analytics/crash consent, haptics, reduced motion   |
| `user_quran_preferences`   | Translations, reciter, font sizes, reading mode           |
| `reminder_preferences`     | When and whether to remind; quiet hours; caps             |
| `notification_preferences` | Push enabled, per-category opt-outs                       |
| `prayer_settings`          | Calculation method, madhab, **coarse** coordinates        |
| `prayer_reminder_rules`    | Per-prayer offsets, one row per enabled prayer            |

`profiles.timezone` is not decoration. The notification engine runs server-side
with no device present and can only schedule a user's local 8pm if it knows
their zone.

`prayer_settings.latitude/longitude` are `numeric(5,2)` — the column type itself
prevents storing a position more precise than about a kilometre, and the client
rounds to ~11km before writing.

### The habit engine

| Table              | Holds                                                   |
| ------------------ | ------------------------------------------------------- |
| `goals`            | One row per user: the goal and, separately, the minimum |
| `reading_sessions` | Every session, deduplicated by `client_session_id`      |
| `daily_progress`   | One row per user per local day; the denormalised rollup |
| `streaks`          | A cached projection of `daily_progress`                 |
| `achievements`     | Which milestones were reached and when                  |

`goals` stores the goal and the minimum as **separate** unit/amount pairs. That
separation is the product: a user can aim for ten ayahs while the streak only
ever requires one.

`reading_sessions.client_session_id` is generated on the device and is unique
per user. It is what makes the offline queue safe to retry — replaying a session
is a no-op rather than double-counting a day.

`streaks` is never the source of truth. It can always be rebuilt from
`daily_progress` by `recalculate_streak`, which is what makes out-of-order
syncing safe.

### The library

| Table                  | Holds                                               |
| ---------------------- | --------------------------------------------------- |
| `bookmark_collections` | User-defined folders                                |
| `bookmarks`            | One per ayah per user, addressed by `verse_key`     |
| `notes`                | Private reflections, one per ayah per user          |
| `reading_positions`    | A single "where I was" marker, for Continue reading |
| `reading_history`      | Which ayahs were viewed, for recommendations        |

Bookmark, note and collection are three concepts, not one, because they have
different lifecycles: a note can outlive a bookmark, and deleting a collection
un-files its bookmarks rather than destroying them (`ON DELETE SET NULL`).

### Notifications

| Table                    | Holds                                                        |
| ------------------------ | ------------------------------------------------------------ |
| `push_tokens`            | Expo tokens, unique globally so a device follows its account |
| `notification_history`   | What was sent, and whether it was opened                     |
| `notification_templates` | Editable copy, so wording changes without a release          |

`notification_history` is the memory that makes anti-fatigue possible: the
frequency cap, the cooldown and duplicate suppression are all queries over it.
Clients may insert their own rows (local notifications are scheduled on-device)
but the partial unique index on `(user_id, local_date, dedupe_key)` stops the
same reminder being recorded twice.

### Platform

| Table                   | Holds                                         |
| ----------------------- | --------------------------------------------- |
| `feature_flags`         | Remote overrides for the compiled-in defaults |
| `daily_ayah_selections` | The shared Today's Ayah, optionally curated   |
| `app_announcements`     | In-app messages                               |

These are the only publicly readable tables, because the app must work — and
must be able to show Today's Ayah — before anyone signs in.

## Functions

### `record_reading_session(...)` → `jsonb`

The **only** path that writes habit data. Everything else reads.

1. Inserts the session, ignoring a conflict on `(user_id, client_session_id)`.
2. If it was genuinely new, adds its totals to that day's `daily_progress`.
3. Re-evaluates `minimum_met` and `goal_met` against the **current** goal.
4. Calls `recalculate_streak`.
5. Returns the day and the streak, so the client needs one round trip.

Step 3 runs every time, not only on insert, so lowering a goal mid-day
immediately marks a day complete that already had enough reading in it.

### `recalculate_streak(user_id, today)` → `streaks`

Rebuilds the streak from scratch using gaps-and-islands: subtracting a dense row
number from each completed date maps every consecutive run onto a constant, so
runs are found with one `GROUP BY`.

Recomputing rather than incrementing is what makes these correct for free:

- a session that syncs three days late simply re-forms the islands
- a duplicate completion event changes nothing
- a device clock that jumps backwards produces a date, not a corruption
- DST and timezone moves never enter into it, because days are calendar dates

`longest_streak` uses `greatest(existing, computed)` so a user's best is never
lowered by edited or trimmed history.

`today` must be the user's **local** date and is always supplied by the caller.

### `reevaluate_progress(today)` → `streaks`

Re-checks every day against a changed goal, then rebuilds the streak. Called
when a user changes their goal.

### `unlock_achievement(key)` / `record_notification_outcome(id, outcome)`

Small helpers so the client never needs to know those tables' shapes.

## Local development

```bash
supabase start            # needs Docker
supabase db reset         # applies migrations + seed
npm run db:types          # regenerate src/lib/supabase/database.types.ts
```

`src/lib/supabase/database.types.ts` is hand-maintained until you have a local
stack running. **Every type in it must be a `type` alias, never an `interface`** —
postgrest-js constrains rows to `Record<string, unknown>`, TypeScript gives
implicit index signatures to type aliases but not to interfaces, and declaring
one as an interface silently degrades every query result to `never` with no
error pointing at the cause.
