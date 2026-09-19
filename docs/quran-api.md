# Quran Foundation integration

Wasilah uses the official **Quran Foundation** APIs for all Quran content. It
does not scrape Quran.com, does not maintain its own Quran dataset, and never
generates Quran text.

> Wasilah is an independent application. It is not affiliated with, endorsed by,
> or an official product of Quran.com or the Quran Foundation.

## Credentials never reach the app

The Content API authenticates with an OAuth2 **client secret**, and a secret
shipped inside a mobile bundle is a published secret. Every Quran request
therefore goes through a proxy:

```
Expo app  →  Supabase Edge Function (quran-proxy)  →  Quran Foundation API
```

`QF_CLIENT_ID` and `QF_CLIENT_SECRET` exist only as edge function secrets. They
are never prefixed with `EXPO_PUBLIC_` and never appear in `app.config.ts`.

## Environments

|                | Pre-live                                       | Production                             |
| -------------- | ---------------------------------------------- | -------------------------------------- |
| Token endpoint | `prelive-oauth2.quran.foundation/oauth2/token` | `oauth2.quran.foundation/oauth2/token` |
| API base       | `apis-prelive.quran.foundation`                | `apis.quran.foundation`                |
| Surahs         | 1–2 only                                       | all 114                                |
| Translations   | 14                                             | 145                                    |
| Recitations    | —                                              | 12                                     |

A token issued by one is rejected by the other, which is why
`supabase/functions/_shared/qfConfig.ts` pairs each environment's auth and API
base URLs in a single record — mixing them is not expressible.

**Wasilah runs on production** (since 19 Sep 2026). Pre-live credentials are
kept in `supabase/.env` under `QF_PRELIVE_*` so switching back is one line.

> **The pre-live dataset contains only Surah 1 (Al-Fatihah) and Surah 2
> (Al-Baqarah).** Requests for any other chapter legitimately return no data.
> This is the single most common source of confusion when setting the project
> up, so the proxy adds an explicit hint to 404s in pre-live.

> **Resource ids are per-environment, and none of them are quran.com's.** The
> catalogues genuinely differ — production carries 145 translations, pre-live
> 14, and neither carries 131 (_The Clear Quran_), which quran.com does. A
> request for an id that does not exist is **not an error**: the API returns the
> verse with an empty `translations` array. The reader then shows Arabic alone
> and nothing anywhere explains why. `resolveTranslationIds` exists for exactly
> this, but check a new id against `/resources/translations` before shipping it.

## Authentication

OAuth2 client credentials, tokens valid for one hour.

### Scopes are all-or-nothing

The scopes requested are listed in `REQUESTED_SCOPES` (`qfConfig.ts`), currently
`content` and `search`. That list is a wish, not a guarantee: **Ory, the OAuth
server QF runs, rejects the whole token request if any requested scope is
ungranted.**

```json
{ "error": "invalid_scope", "error_description": "... not allowed to request scope 'search'." }
```

So asking for a scope that is still under review does not disable one feature —
it takes down every Quran request in the app. `qfToken` therefore parses that
rejection, drops the named scope, retries, and remembers the refusal for the
life of the function instance. Consequences worth knowing:

- A pending permission costs one extra token request per cold start, no more.
- When QF approves it, a new instance requests it successfully and the feature
  starts working **without a deploy**, within about an hour.
- The first scope in the list is never dropped, so a genuine credentials
  failure still surfaces as an error instead of degrading silently.

The proxy caches the token in module scope, so a warm function instance serves
many requests per token. The in-flight promise is cached too, so a burst of
concurrent requests on a cold instance triggers exactly one token request rather
than dozens. A 401 on a token believed valid drops the cache and retries once.

## Search is a different API

Not `/content/api/v4/search`. That path exists and answers **500**, which looks
like an outage rather than a wrong address. Search lives at
`/search/api/v1/search`, takes `query` and `mode=advanced` (not `q`), and needs
the separate `search` scope.

It returns **verse keys only** — no Arabic, no translation, no highlights, under
any combination of parameters. The app resolves those keys against the content
endpoints and caches the results, which is why a search hit already seen in the
reader renders instantly.

Two failure modes are worth naming, because both present as "no matches":

| Cause                    | What the upstream does           | What the proxy does      |
| ------------------------ | -------------------------------- | ------------------------ |
| Token lacks `search`     | 200 with an empty result set     | 503 `search_unavailable` |
| Permission never granted | 500 on the content-prefixed path | 503 `search_unavailable` |

## The route allowlist

`supabase/functions/_shared/qfRoutes.ts` lists every forwardable path. An
allowlist rather than a pass-through, because without one anyone holding the
public anon key could use our credentials to call arbitrary endpoints — burning
our rate limit and putting us in breach of the developer terms.

Each entry also declares which query parameters may be forwarded (everything
else is dropped) and how long the response may be cached.

## Caching

> The Quran Foundation developer terms cap ordinary Content API caching at
> **one week** unless a Content Sync exception applies.

That limit is expressed once, as `contentCacheMaxAgeMs` in `src/config/quran.ts`,
and is enforced in three places:

1. the proxy's `Cache-Control` headers, per route;
2. the TanStack Query `gcTime`;
3. the disk persister's `maxAge`, which refuses to restore anything older.

A device that has been offline for a fortnight will not serve stale scripture
from disk. **Do not raise this value without re-reading the current terms.**

The app deliberately does **not** ship a full offline Quran. Doing so would
require a Content Sync agreement that this project does not have.

## Setup

1. Register at [api-docs.quran.foundation](https://api-docs.quran.foundation) and
   create an application in the Developer Console.
2. Obtain credentials for the environment you want. Each environment has its
   own client id, and **the secret is shown exactly once** — if it was not
   saved, the only way to get one is to rotate it.
3. Set them as edge function secrets:

```bash
supabase secrets set \
  QF_CLIENT_ID=your_client_id \
  QF_CLIENT_SECRET=your_client_secret \
  QF_ENV=production   # or prelive

supabase functions deploy quran-proxy
```

4. Verify:

```bash
curl "$SUPABASE_URL/functions/v1/quran-proxy/chapters?language=en" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

## Before production release

- [x] Request production API access through the Developer Console
- [x] Confirm the scopes the app actually uses — `content` granted, `search`
      requested 19 Sep 2026
- [x] Set `QF_ENV=production` and re-deploy the proxy
- [x] Test against production credentials — all 114 surahs, translations and
      recitation audio verified through the proxy
- [ ] Verify attribution requirements are met (see the About screen)
- [ ] Verify per-translation and per-tafsir licensing for every shipped edition
- [ ] Verify recitation licensing for every shipped reciter
- [ ] Re-read the caching and storage rules
- [ ] Confirm the privacy requirements
- [ ] Record the configuration in `third-party-content-and-licenses.md`

Development access does **not** imply production access.

## Content integrity

These are absolute:

- Quran text is never modified, normalised, re-spaced or "corrected".
- Quran text is never generated by a model.
- Translations are always attributed to their edition.
- Tafsir is a distinct content type and is never mixed with Quran text.
- No unofficial dataset is silently substituted.

The only processing applied to any API content is `sanitizeTranslationText`,
which strips inline HTML from **translation** bodies (preserving footnote markers
as superscripts). It never touches Arabic text.

## The official SDK

`@quranjs/api` is the official TypeScript SDK and is a good choice for a
server-side integration. This project uses a thin hand-written client instead,
for one reason: the app talks to _our proxy_, not to Quran Foundation directly,
so the SDK's main value — token management — sits on the wrong side of the
boundary. The proxy does that job in about 60 lines. If the proxy ever grows,
the SDK is the right thing to adopt there.

## Reference

- [Quran.com developers](https://quran.com/developers)
- [Quran Foundation API documentation](https://api-docs.quran.foundation)
- [Official JS SDK](https://github.com/quran/api-js)
