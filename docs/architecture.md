# Architecture

Written for engineers joining the project.

## The one-paragraph version

Wasilah is an Expo/React Native app that adds a **daily habit layer** on top of
the Quran Foundation's Quran APIs. The Quran itself — text, translations,
tafsir, recitations, search — comes from Quran Foundation and is never
duplicated locally. What Wasilah owns is everything around it: goals, streaks,
reading sessions, reminders and the notification engine that decides when a
person should be nudged.

```
                     ┌─────────────────────────┐
                     │   React Native / Expo   │
                     └────────────┬────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
  Quran feature             Habit engine             Reminder engine
  (reader, search,          (goals, sessions,        (decides WHETHER)
   audio, bookmarks)         streaks, progress)              │
        │                         │                          ▼
        ▼                         ▼                  Notification service
  Quran API client          Supabase (Postgres)      (decides HOW)
        │                         │                          │
        ▼                         ▼                          ▼
  Supabase Edge proxy       Row Level Security        Expo Push / FCM / APNs
        │
        ▼
  Quran Foundation API
```

## Layering

Every feature follows the same path, and nothing skips a layer:

```
Screen / component
       ↓   (no fetching, no business rules)
Hook
       ↓   (React state, caching, optimistic updates)
Service
       ↓   (pure business logic, no React)
API client / Supabase
```

A component never calls `fetch`. A service never imports React. Business rules
live in pure functions that can be tested without rendering anything — which is
why the streak engine has 40 tests and no test renderer.

## Where things live

```
app/                       Routes only. Each file is thin and delegates
                           to a feature screen or composes feature hooks.

src/features/<name>/       One folder per domain. Self-contained:
  components/                UI for this feature
  hooks/                     React state and data access
  services/                  business logic and persistence
  utils/                     pure helpers
  types/                     TypeScript contracts
  screens/                   full screens, when shared across routes

src/components/            Cross-feature UI only
  ui/                        the design system (Button, Card, Text…)
  layout/                    Screen, ScreenHeader
  feedback/                  Skeleton, ErrorState, Toast, OfflineBanner

src/lib/                   Infrastructure with no domain knowledge
  api/                       HTTP client, errors, query keys, query client
  quran/                     Quran Foundation client and response types
  supabase/                  client, generated types, error mapping
  datetime/                  timezone-correct local-date arithmetic
  offline/                   the durable write queue and its processor
  storage/                   key-value and secure storage
  i18n/                      translations and the locale provider
  analytics/  monitoring/    PostHog and Sentry, both opt-in

src/theme/                 Design tokens; the single source of colour truth
src/config/                Branding, env validation, feature flags, Quran config

supabase/
  migrations/                schema, RLS and the habit functions
  functions/                 edge functions (Deno)
  seed/                      local development data — no Quran content
```

## Module boundaries that matter

These four separations are load-bearing. Collapsing any of them is how this
codebase would rot:

**Reminders decide _whether_; notifications decide _how_.**
`features/reminders` owns quiet hours, frequency caps, streak-risk windows and
adaptive back-off. `features/notifications` owns permissions, channels, push
tokens, scheduling and deep links. The reminder module calls the notification
module; it never schedules anything itself.

**Prayer and weather are independent.**
They share one input — a coarse location — and nothing else. Prayer times are
calculated on-device and are useful with no reminders enabled. Weather only ever
changes the _wording_ of a reminder.

**Audio knows nothing about the Quran API.**
`features/audio` is handed tracks with URLs. `useAyahAudio` is the single seam
that turns an ayah into a track.

**The streak engine is pure.**
`features/streak/utils/streakRules.ts` is plain functions over plain data, and
`public.recalculate_streak` in SQL implements the same algorithm. Both derive
the streak from the full set of completed days rather than incrementing a
counter, which is what makes late-arriving offline sessions, duplicate events
and clock skew correct by construction rather than by special-casing.

## State management

| Kind of state                 | Where it lives          | Why                                            |
| ----------------------------- | ----------------------- | ---------------------------------------------- |
| Server data                   | TanStack Query          | Caching, pagination, retries, disk persistence |
| Theme, locale, session, audio | React context           | Small, app-wide, rarely changing               |
| Screen state                  | `useState`              | Local by default                               |
| Pending writes                | SQLite queue            | Must survive an app restart                    |
| Preferences                   | AsyncStorage → Supabase | Instant locally, synced when signed in         |

There is no Redux and no global store. Server state belongs to the query cache;
everything else is either local or a small context.

## Guest mode

The app is fully usable with no account. `useHabitState` presents one interface
over two backings — Supabase when signed in, `localHabitStore` when not — so no
screen branches on whether an account exists. A guest's queued reading is stored
under a placeholder user id and adopted by the first user to sign in, so nothing
read before creating an account is lost.

## Performance decisions

- **React Compiler** is enabled (`experiments.reactCompiler`), so memoisation is
  automatic and `React.memo` is used only where a custom comparison earns it.
- **FlashList** for the reader and every long list.
- **Explicit API field lists** — the reader requests only the verse fields it
  renders, roughly halving the payload of a surah page.
- **Persisted query cache**, so a cold launch paints real content rather than a
  spinner.
- **Audio prefetch** of the next ayah while the current one plays.
- **System fonts for the UI**; only the Arabic and Bengali faces are bundled.
- **Throttled position saves** (10s) and **debounced search** (350ms).

## Further reading

- [`database.md`](./database.md) — schema, RLS and the habit functions
- [`notifications.md`](./notifications.md) — the reminder and notification engines
- [`quran-api.md`](./quran-api.md) — Quran Foundation integration and the proxy
- [`offline-sync.md`](./offline-sync.md) — the write queue and conflict policy
- [`third-party-content-and-licenses.md`](./third-party-content-and-licenses.md)
