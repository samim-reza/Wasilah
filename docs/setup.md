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

## 1. Supabase anon key

Dashboard → **Project Settings → API Keys** → copy the `anon` / `public` key.

```bash
# In .env.local
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

This key is designed to be public — it ends up in the app bundle, and Row Level
Security is what actually protects data. It is **not** the `service_role` key,
which must never leave a server.

---

## 2. Supabase access token

Needed only to deploy edge functions. Create one at
[supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
npx supabase link --project-ref sdwfbwwrkphytuyhxvzu
```

---

## 3. Quran Foundation credentials

At [dev-console.quran.foundation](https://dev-console.quran.foundation/projects/new):

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

## 4. Run it

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
