<div align="center">

# وسيلة · Wasilah

**One ayah. Every day.**

A Quran app built around a single promise: that reading one ayah a day should be
so easy there is never a reason not to.

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)

</div>

---

## What this is

Most Quran apps are readers. Wasilah is a **habit layer** built on top of one.

The Quran itself — text, translations, tafsir, recitations, search — comes from
the official [Quran Foundation APIs](https://api-docs.quran.foundation) and is
never duplicated locally. What this codebase owns is everything around it:

- a **daily minimum** of one ayah that keeps a streak alive on the worst day
- a separate, larger **goal** for the good days
- a **streak engine** that survives timezone changes, DST, offline reading,
  duplicate events and a device clock that jumps
- a **reminder engine** whose rules almost all exist to _suppress_ notifications
- **guest mode**: read everything, build a streak, create an account later

> Wasilah is an independent application. It is not affiliated with, endorsed by,
> or an official product of Quran.com or the Quran Foundation.

---

## Table of contents

- [Quick start](#quick-start)
- [The stack](#the-stack)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Quran Foundation setup](#quran-foundation-setup)
- [Running the app](#running-the-app)
- [Notifications](#notifications)
- [Testing](#testing)
- [Building](#building)
- [Deployment](#deployment)
- [Design decisions worth knowing](#design-decisions-worth-knowing)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

---

## Quick start

Requires **Node 22+**, the **Supabase CLI**, and **Docker** for the local
database.

```bash
git clone <this-repo> wasilah && cd wasilah
npm install

cp .env.example .env.local     # then fill in the values below

supabase start                 # local Postgres + Auth + Edge Functions
supabase db reset              # apply migrations and seed

npm run theme:build            # generate global.css from the design tokens
npm start                      # Expo dev server
```

Press `a` for Android or `i` for iOS. The app runs in **Expo Go** for everything
except push notifications and background audio, which need a development build.

> The very first thing to verify is that `EXPO_PUBLIC_SUPABASE_URL` and
> `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set. The app validates its environment at
> startup and fails with an explicit message rather than a confusing network
> error.

---

## The stack

| Layer         | Choice                                            | Why this one                                                  |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Runtime       | Expo SDK 57, React Native 0.86, React 19          | Managed workflow; OTA updates; one codebase for both stores   |
| Language      | TypeScript, `strict` + `noUncheckedIndexedAccess` | Business logic this fiddly needs the compiler's help          |
| Routing       | Expo Router (file-based, typed)                   | Deep links from notifications come free                       |
| Styling       | NativeWind 4 + Tailwind 3                         | Utility classes with a single tokenised source of truth       |
| Server state  | TanStack Query (+ disk persistence)               | Pagination, retries and a cache that survives a cold start    |
| Local state   | React context + `useState`                        | No global store; server state belongs to the query cache      |
| Backend       | Supabase (Postgres, Auth, Edge Functions)         | RLS as the real security boundary; Deno functions for secrets |
| Quran content | Quran Foundation Content API via an edge proxy    | Official source; the client secret never ships                |
| Dates         | Luxon                                             | Timezone and DST correctness is the whole ballgame here       |
| Lists         | FlashList 2                                       | A surah is up to 286 tall, variable-height items              |
| Audio         | `expo-audio`                                      | Background playback; `expo-av` is removed in SDK 57           |
| Prayer times  | `adhan` (MIT)                                     | Calculated on-device; no location leaves the phone            |
| Notifications | `expo-notifications` + Expo Push                  | Local-first, push only as a fallback                          |
| Monitoring    | Sentry, PostHog                                   | Both opt-in, both no-ops without a key                        |
| Testing       | Jest + RNTL, Maestro                              | 205 unit/integration tests; black-box E2E                     |

**Deliberately not used:** Redux, a global state library, an ORM, a custom
backend, Redis, a message queue. None of them earn their cost at this scale.

---

## Project structure

Organised by **feature**, not by file type. Every feature is self-contained, so
a change to bookmarks touches one folder.

```
app/                              Routes. Thin — they compose feature hooks.
├── _layout.tsx                   Providers, splash, notification routing
├── index.tsx                     First-run redirect
├── (auth)/                       login · signup · forgot-password
├── (onboarding)/                 welcome · goals · reminders · preferences
├── (tabs)/                       home · quran · progress · profile
├── quran/[surahId].tsx           Reader (also /juz/[id] and /page/[id])
├── search.tsx  bookmarks.tsx  notes.tsx
├── reader-translations.tsx  reader-reciters.tsx
└── settings.tsx  notification-settings.tsx  about.tsx

src/features/                     One folder per domain
├── auth/          onboarding/    home/        quran/       reader/
├── audio/         bookmarks/     notes/       search/      streak/
├── goals/         reminders/     notifications/
├── prayer/        weather/       settings/
│                                 each with:
│                                   components/ hooks/ services/ utils/ types/

src/components/                   Cross-feature UI only
├── ui/                           Button, Card, Text, BottomSheet, Icon…
├── layout/                       Screen, ScreenHeader
└── feedback/                     Skeleton, ErrorState, Toast, OfflineBanner

src/lib/                          Infrastructure, no domain knowledge
├── api/                          HTTP client, error taxonomy, query keys
├── quran/                        Quran Foundation client and response types
├── supabase/                     client, database types, error mapping
├── datetime/                     timezone-correct local-date arithmetic
├── offline/                      durable write queue and its processor
├── storage/  i18n/  analytics/  monitoring/  accessibility/

src/theme/                        Design tokens — the source of colour truth
src/config/                       branding · env · feature flags · quran

supabase/
├── migrations/                   schema, RLS, habit functions
├── functions/                    quran-proxy · notification-engine ·
│                                 daily-ayah · delete-account
└── seed/                         local data — contains no Quran content

tests/unit/  tests/integration/  tests/e2e/
docs/
```

### The layering rule

```
Screen  →  Hook  →  Service  →  API client / Supabase
```

A component never calls `fetch`. A service never imports React. This is why the
streak engine has 40 tests and no test renderer.

---

## Environment variables

Copy `.env.example` to `.env.local`.

### Client-safe (embedded in the bundle — treat as public)

| Variable                        | Required | Notes                                            |
| ------------------------------- | -------- | ------------------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`      | ✅       | From your Supabase project settings              |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Designed to be public; RLS is what protects data |
| `EXPO_PUBLIC_APP_ENV`           | ✅       | `development` · `preview` · `production`         |
| `EXPO_PUBLIC_SENTRY_DSN`        | —        | Blank disables crash reporting entirely          |
| `EXPO_PUBLIC_POSTHOG_KEY`       | —        | Blank disables analytics entirely                |

### Server-only — **never** prefix these with `EXPO_PUBLIC_`

| Variable                                            | Where it lives                        |
| --------------------------------------------------- | ------------------------------------- |
| `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, `QF_ENV`        | Supabase edge function secrets        |
| `SUPABASE_SERVICE_ROLE_KEY`                         | Edge function runtime                 |
| `EXPO_ACCESS_TOKEN`                                 | Edge function secrets (push delivery) |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | CI only                               |

> `EXPO_PUBLIC_*` values are **inlined into the bundle at build time**. Anything
> in one is readable by anyone who downloads the app. Reference them as full
> static property accesses (`process.env.EXPO_PUBLIC_X`) — destructuring or a
> dynamic key silently yields `undefined` in a release build.

---

## Supabase setup

### Local

```bash
supabase start          # Postgres :54322 · API :54321 · Studio :54323
supabase db reset       # migrations + seed
npm run db:types        # regenerate src/lib/supabase/database.types.ts
```

### Hosted

```bash
supabase link --project-ref <your-ref>
supabase db push
supabase functions deploy quran-proxy
supabase functions deploy daily-ayah
supabase functions deploy notification-engine
supabase functions deploy delete-account
```

### What the schema gives you

- **Row Level Security on every personal table.** The policy is uniformly
  `auth.uid() = user_id`. There is no table where one user can read another's
  rows, and the client is not trusted to enforce it.
- **`record_reading_session`** — the single write path for habit data.
  Idempotent on a client-generated session id, so the offline queue can retry
  freely.
- **`recalculate_streak`** — rebuilds a streak from the full set of completed
  days using gaps-and-islands. Recomputing rather than incrementing is what makes
  late-syncing offline sessions correct without special-casing.

Details in [`docs/database.md`](docs/database.md).

---

## Quran Foundation setup

The Content API needs an OAuth2 **client secret**, and a secret inside a mobile
bundle is a published secret. All Quran traffic therefore goes through an edge
proxy:

```
Expo app  →  Supabase Edge Function (quran-proxy)  →  Quran Foundation API
```

1. Register at [api-docs.quran.foundation](https://api-docs.quran.foundation).
2. Create an application and obtain **pre-live** credentials.
3. Set them as edge function secrets:

```bash
supabase secrets set \
  QF_CLIENT_ID=your_client_id \
  QF_CLIENT_SECRET=your_client_secret \
  QF_ENV=prelive
```

4. Verify:

```bash
curl "$SUPABASE_URL/functions/v1/quran-proxy/chapters?language=en" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

> ### ⚠️ Pre-live contains only Surah 1 and Surah 2
>
> Requests for any other chapter legitimately return nothing until production
> access is granted. This is the single most common source of confusion when
> setting the project up. The proxy adds an explicit hint to 404s in pre-live so
> it is not mistaken for a bug.

Production access is requested separately. Full checklist in
[`docs/quran-api.md`](docs/quran-api.md).

---

## Running the app

```bash
npm start              # dev server
npm run android        # open on Android
npm run ios            # open on iOS (macOS only)

npm run theme:build    # regenerate global.css after editing design tokens
npm run typecheck      # tsc --noEmit
npm run lint           # eslint, zero warnings tolerated
npm run format         # prettier
npm run verify         # theme + typecheck + lint + tests — run before pushing
```

### Expo Go vs a development build

| Feature                             | Expo Go    | Dev build |
| ----------------------------------- | ---------- | --------- |
| Reading, search, bookmarks, streaks | ✅         | ✅        |
| Local notifications                 | ✅         | ✅        |
| Push notifications                  | ❌         | ✅        |
| Background audio                    | ⚠️ limited | ✅        |

```bash
eas build --profile development --platform android
```

---

## Notifications

Reminders are scheduled **locally**. No network, no push service delay, and no
server ever learns when a person reads. The app re-plans them every launch, two
days ahead — far enough to survive an offline night, close enough that every
decision stays fresh.

Two modules with one boundary:

> **`features/reminders` decides WHETHER. `features/notifications` decides HOW.**

The suppression rules are the interesting part, and almost all of them exist to
_remove_ a notification:

- already read today → **send nothing** (the most important rule in the system)
- inside quiet hours (default 22:30–07:00, wrapping past midnight)
- at the per-day cap (default 2) or inside the cooldown (default 3h)
- this category already fired today
- four of the last five were ignored → back off

Push is a narrow fallback, handled by the `notification-engine` edge function:
it covers devices that have not opened the app for 48 hours, by which point
their locally scheduled reminders have all fired.

Full design in [`docs/notifications.md`](docs/notifications.md).

---

## Testing

```bash
npm test               # 205 unit + integration tests
npm run test:coverage  # with thresholds
npm run e2e:android    # Maestro flows against a real build
```

Coverage thresholds are highest where a bug costs the most:

| Area                     | Lines |
| ------------------------ | ----- |
| `features/streak/utils/` | 95%   |
| `lib/datetime/`          | 90%   |
| Everything else          | 55%   |

What is actually covered:

- **Streak engine** — duplicates, late offline syncs, clock skew, timezone
  moves, DST, month and year boundaries, leap days
- **Date handling** — the UTC boundary, 23- and 25-hour days, midnight crossing
- **Reminder rules** — every suppression path; most assertions check that a
  notification is _not_ sent
- **Offline sync** — replay order, retry budget, abandonment, position conflicts
- **Goals, achievements, audio queue, verse keys, translation sanitisation**
- **Translation fallback** — the pre-live catalogue lacks the shipped English
  default, and the API returns empty translations rather than erroring
- **Storage key collisions and value shapes** — two regressions that no
  typecheck or lint rule can catch, only a device can
- **Notification import discipline** — a static `expo-notifications` import
  crashes Expo Go on Android at launch

E2E covers the journey the product exists for: onboarding → goal → reminder →
read Today's Ayah → streak starts.

---

## Building

```bash
npm run build:android:preview   # internal APK
npm run build:android:prod      # AAB for Play Store
npm run build:ios:prod          # IPA for App Store
```

Profiles are in `eas.json`. Set your EAS project id first:

```bash
eas init
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
```

### Android

- Package: `com.wasilah.app`
- Play Store target: **AAB** (`buildType: app-bundle`)
- Permissions requested: notifications, exact alarms, vibrate, boot-completed
- Location is **declared but never requested at launch** — only when the user
  turns on prayer times or weather

### iOS

- Bundle: `com.wasilah.app`
- `UIBackgroundModes: ['audio']` so recitation survives the screen locking
- Push requires an APNs key configured in EAS

---

## Deployment

```
main ──► preview build ──► internal testing ──► production build ──► store
                │
                └─► OTA update (JS-only changes)
```

```bash
eas update --branch production --message "Fix streak boundary at DST"
```

OTA updates only work for JavaScript changes. Adding a native module, changing
permissions or bumping `runtimeVersion` needs a new binary.

They also need `expo-updates` present in the binary receiving them — a build
made before it was installed will ignore updates entirely, without erroring.

### Before the first production release

- [ ] Quran Foundation **production** access granted and `QF_ENV=production`
- [ ] Every shipped translation's and reciter's licence verified and recorded in
      [`docs/third-party-content-and-licenses.md`](docs/third-party-content-and-licenses.md)
- [ ] Attribution visible on the About screen and not obscured
- [ ] Privacy policy published and linked
- [ ] Sentry and PostHog projects created (or the keys left blank)
- [ ] `npm run verify` green
- [ ] RLS verified by attempting a cross-user read with a real token
- [ ] No secret in the bundle: `npx expo export --platform android` then grep the
      output for `QF_CLIENT_SECRET` and `service_role`

---

## Design decisions worth knowing

Things that look odd until you know why.

**The minimum and the goal are separate columns.**
That separation _is_ the product. Someone can aim for ten ayahs while the streak
only ever requires one, so a bad day costs nothing.

**Streaks are recomputed, never incremented.**
An incrementing counter cannot be repaired by a session that syncs three days
late. A recomputation from the full set of completed days does not need to be —
duplicates, clock skew and out-of-order arrivals are all correct by construction.

**Every "day" is a local calendar date computed on the device.**
`new Date().toISOString().slice(0, 10)` is how this gets broken: at 00:30 in
Dhaka it returns _yesterday_, silently moving a reading session to the wrong day.

**Writes always go through the queue, even when online.**
One code path, no offline branch, and a write cannot be lost to a connection
that dropped mid-request.

**Guest mode uses the same streak functions as the server.**
So the number a guest sees is the number they keep after signing in.

**Arabic text has `allowFontScaling={false}`.**
It is the only text in the app that does. The user sets Arabic size directly in
reader preferences; compounding that with the OS multiplier produces text far
larger than either setting implies. Its line height is a _multiple_ of the font
size, because Quranic diacritics collide at normal leading.

**Coordinates are rounded to ~11km before they are stored.**
Accurate enough for prayer times to within a minute; not accurate enough to
identify a home. The column type (`numeric(5,2)`) enforces it too.

**Analytics never records what someone reads.**
Search queries, note text and ayah references are absent from the event types by
construction — there is no field to put them in.

**Milestones are activity markers, not merit.**
No score, no leaderboard, and an explicit disclaimer on the progress screen.
Assigning points to worship is not something software should do.

---

## Troubleshooting

<details>
<summary><b>"Wasilah is misconfigured" on launch</b></summary>

`.env.local` is missing or incomplete. Copy `.env.example` and fill in the
Supabase URL and anon key. Restart the dev server with `npm start -c` — Expo
caches environment variables aggressively.
</details>

<details>
<summary><b>Quran content returns nothing for most surahs</b></summary>

You are on the **pre-live** Quran Foundation environment, which only contains
Surah 1 and Surah 2. This is expected. Request production access, then set
`QF_ENV=production` and redeploy the proxy.
</details>

<details>
<summary><b>The proxy returns 502 <code>upstream_unavailable</code></b></summary>

Usually a missing secret. Check:

```bash
supabase secrets list
supabase functions logs quran-proxy
```

Confirm `QF_CLIENT_ID` and `QF_CLIENT_SECRET` are set and that `QF_ENV` matches
the environment the credentials were issued for. A pre-live token is rejected by
the production API and vice versa.
</details>

<details>
<summary><b>Every Supabase query returns <code>never</code> in TypeScript</b></summary>

A type in `src/lib/supabase/database.types.ts` was declared as an `interface`
instead of a `type`. postgrest-js constrains rows to `Record<string, unknown>`;
TypeScript gives implicit index signatures to type aliases but not to interfaces,
so the schema silently fails the constraint and every result degrades to `never`
with no error pointing at the cause.

**Every type in that file must be a `type` alias.**
</details>

<details>
<summary><b>Tailwind classes have no effect</b></summary>

Run `npm run theme:build` — `global.css` is generated from
`src/theme/tokens.ts` and is not committed as hand-written CSS. Then clear the
Metro cache: `npm start -c`.
</details>

<details>
<summary><b>Notifications do not arrive</b></summary>

1. Check permission state in Settings → Reminders; if it says "blocked", the OS
   will ignore further prompts and the user must change it in system settings.
2. Local reminders are suppressed while the app is in the foreground **by
   design** — background the app to see them.
3. If the day's minimum is already complete, nothing is sent. That is the
   intended behaviour, not a bug.
4. Push needs a development build; Expo Go and simulators cannot receive it.

</details>

<details>
<summary><b>Streak looks wrong after travelling</b></summary>

Streaks use the device's local date. Flying east can make "today" advance twice;
flying west can make it repeat. `resolveCurrentStreak` deliberately does not
punish either case. If the number still looks wrong, sign out and back in to
force `recalculate_streak` to rebuild from `daily_progress`.
</details>

<details>
<summary><b>Build fails on <code>react-native-worklets</code></b></summary>

`react-native-worklets/plugin` must be **last** in `babel.config.js`, after
every other plugin, so it sees the final shape of each function it workletizes.
</details>

---

## Documentation

| Document                                                                          | Covers                                          |
| --------------------------------------------------------------------------------- | ----------------------------------------------- |
| [`architecture.md`](docs/architecture.md)                                         | Layering, module boundaries, state, performance |
| [`database.md`](docs/database.md)                                                 | Schema, RLS, the habit functions                |
| [`notifications.md`](docs/notifications.md)                                       | Reminder rules, templates, deep links           |
| [`quran-api.md`](docs/quran-api.md)                                               | Quran Foundation integration and the proxy      |
| [`offline-sync.md`](docs/offline-sync.md)                                         | The write queue and conflict policy             |
| [`third-party-content-and-licenses.md`](docs/third-party-content-and-licenses.md) | Every external resource and its terms           |

---

## Contributing

1. `npm run verify` must pass before you push.
2. Keep features in their own folder; do not add to a `utils.ts` grab bag.
3. Business logic goes in a pure function with a test, not in a component.
4. Comments explain **why**, not what.
5. Never add Quran content to the repository or the database.

---

## Attribution

Quran data provided by **Quran Foundation**.
Arabic typeface: **Amiri Quran** (SIL OFL 1.1).
Bengali typeface: **Noto Sans Bengali** (SIL OFL 1.1).
Prayer times: **adhan** (MIT). Weather: **Open-Meteo** (CC BY 4.0).

Wasilah is an independent application. It is not affiliated with, endorsed by,
or an official product of Quran.com or the Quran Foundation.
