# Setup

The current state of this project's backend, and the exact steps left.

## Status

| Piece                  | State                                                          |
| ---------------------- | -------------------------------------------------------------- |
| Supabase project       | ✅ Created — `sdwfbwwrkphytuyhxvzu`, region `ap-northeast-2`   |
| Database schema        | ✅ 23 tables, RLS enabled on every one                         |
| Seed data              | ✅ Feature flags, notification templates, a sample daily ayah  |
| Habit SQL functions    | ✅ Verified against the TypeScript engine on the live database |
| Supabase anon key      | ⬜ Needed in `.env.local`                                      |
| Supabase access token  | ⬜ Needed to deploy edge functions                             |
| Quran Foundation app   | ⬜ Form pre-filled in the console; needs the ToS accepted      |
| `quran-proxy` deployed | ⬜ Blocked on the two above                                    |

Until the proxy is deployed the app runs, signs in, tracks a streak and stores
bookmarks — but shows a **"Setup incomplete"** state wherever Quran content
would appear. That is deliberate: it is a distinct error kind
(`not_configured`), not a generic failure, so it cannot be mistaken for a bug.

---

## Credential locations

| Credential              | Lives in                       | Committed?                          |
| ----------------------- | ------------------------------ | ----------------------------------- |
| Supabase URL + anon key | `.env.local`                   | No — gitignored                     |
| QF client ID + secret   | `supabase/.env`                | No — gitignored, `chmod 600`        |
| QF secrets (runtime)    | Supabase edge function secrets | N/A                                 |
| EAS project ID          | `app.config.ts`                | **Yes** — it is a public identifier |

The QF client secret is shown exactly once at creation. It is stored locally in
`supabase/.env` purely so a redeploy does not require rotating it; the edge
function reads its own copy from Supabase secrets, never from that file.

---

## Re-creating the Quran Foundation credentials

If the secret is ever lost, rotate it at
[dev-console.quran.foundation](https://dev-console.quran.foundation) rather than
creating a second app. To create one from scratch:

| Field            | Value                  | Why                                                                                                  |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| App name         | `Wasilah`              |                                                                                                      |
| Client platform  | **Server**             | Our proxy uses the client-credentials flow. Choosing iOS/Android issues a client that cannot use it. |
| Usage            | **API access only**    | Wasilah stores bookmarks and notes in its own database, so the QF User APIs are not needed.          |
| Terms of Service | _you must accept this_ | A legal agreement — not something to automate.                                                       |

> **The client secret is shown once.** Copy it before leaving the page.

Then:

```bash
npx supabase secrets set \
  QF_CLIENT_ID=your_client_id \
  QF_CLIENT_SECRET=your_client_secret \
  QF_ENV=prelive

npx supabase functions deploy quran-proxy
npx supabase functions deploy daily-ayah
npx supabase functions deploy delete-account
```

Verify:

```bash
curl "https://sdwfbwwrkphytuyhxvzu.supabase.co/functions/v1/quran-proxy/chapters?language=en" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY"
```

You should get a JSON list of 114 chapters.

> ### Pre-live serves only Surah 1 and Surah 2
>
> Al-Fatihah and Al-Baqarah return full content; every other surah returns
> nothing. That is the pre-live dataset, not a bug. Request production access in
> the console when you are ready, then set `QF_ENV=production` and redeploy.

---

## Development build

Expo Go on Android cannot show notifications at all, so reminders can only be
tested in a development build.

```bash
set -a && . ./.env.eas && set +a      # EAS robot token, gitignored
npx eas build --profile development --platform android
```

Two things that are easy to get wrong and were:

- **`.env.local` never reaches EAS.** It is gitignored, so the build does not
  receive it and the app fails its own environment validation at launch. The
  Supabase URL and anon key are stored as EAS project variables instead, and
  each build profile names the environment to read them from.
- **`expo-dev-client` must be installed.** Without it EAS refuses a development
  build outright. It is not needed for Expo Go, which is why this only appeared
  when building.

Install the resulting APK, then run `npm start` and the dev build will connect
to it the same way Expo Go does.

---

## Run it

```bash
npm start
```

Scan the QR with **Expo Go**. Phone and computer must be on the same Wi-Fi; if
the QR does not connect, use `npm start --tunnel`.

Working in Expo Go: reading, search, bookmarks, notes, streaks, progress, audio,
prayer times, local reminders.

Needs a development build: push notifications, and audio that keeps playing with
the screen locked.

---

## Re-running the database setup

The migrations were pushed with the CLI over the IPv4 session pooler, because
the project's direct database host is IPv6-only:

```bash
npx supabase db push \
  --db-url "postgresql://postgres.sdwfbwwrkphytuyhxvzu:<url-encoded-password>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  --include-all
```

The password contains `@`, which must be percent-encoded as `%40` inside a
connection URL or the host parses wrongly.

---

## Security note

The database password was shared over chat during setup, so it is now in that
transcript. Rotating it is a one-minute job and worth doing before this project
holds anything real:

**Project Settings → Database → Reset database password.**

Nothing in the repository depends on it — migrations are pushed ad hoc, and the
app itself authenticates with the anon key and never sees the database password.
