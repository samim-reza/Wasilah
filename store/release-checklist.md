# Play Store release checklist

Ordered by what blocks what. Everything above the line must be done before a
production build is worth making.

---

## Blocking — cannot publish without these

- [x] **Quran Foundation production access** — **done, 19 Sep 2026.** The
      `content` permission was already granted in production; only the
      credentials were missing. The proxy now runs on production and serves all
      114 surahs and 145 translations. Pre-live (surahs 1–2, 14 translations)
      is kept in `supabase/.env` so switching back is one line.
- [x] **Translation and reciter licences** — **resolved, 19 Sep 2026.** This
      was written on the assumption that each edition needed its own licence
      from its publisher. Reading the QF Developer Terms shows otherwise: they
      define "QF Content" as "Quran text, translations, metadata, audio,
      reflections, and any other content returned by the APIs" and license its
      display in an application under the one agreement, including for
      commercial models. What needs a separate licence is _selling or
      redistributing the content itself_, which Wasilah does not do — nothing is
      bundled, nothing is re-hosted, and the cache is capped at one week.
      Reasoning and clause citations in
      [`third-party-content-and-licenses.md`](../docs/third-party-content-and-licenses.md).
- [x] **Privacy policy and terms written and wired up.** Both pages live in
      [`site/`](../site/) and deploy to GitHub Pages via
      [`.github/workflows/pages.yml`](../.github/workflows/pages.yml).
      `branding.ts` points at them, and `supportEmail` is a real inbox.
      **Not reviewed by a lawyer** — the text was written from what the code
      actually does, which is the right starting point but not a substitute.
- [x] **Push the repo, make it public, and turn Pages on.** — **done, 20 Sep 2026.**
      Verified: the repo is public, and privacy.html, terms.html and the index
      all return 200 from GitHub Pages. The three steps
      that only the account owner can do: 1. `git push -u origin main` 2. Settings → General → Change visibility → **Public**
      (no secrets are committed; `.env*` files are all gitignored) 3. Settings → Pages → Source → **GitHub Actions**

      Then confirm <https://samim-reza.github.io/Wasilah/privacy.html> loads,
      because Google checks it during review.

- [ ] **Screenshots captured** on a device with a real streak and real
      bookmarks. **No longer blocked** — production serves the whole Quran, so
      a real reading history can be built up on a device.

## Also required

- [ ] Google Play Developer account (one-off $25)
- [ ] Data safety form completed from [`data-safety.md`](./data-safety.md)
- [ ] Content rating questionnaire completed
- [ ] `store/assets/play-store-icon.png` (512×512) uploaded — **done**
- [ ] `store/assets/feature-graphic.png` (1024×500) uploaded — **done**
- [ ] Listing copy from [`listing.md`](./listing.md)

## Technical — all done

- [x] Production profile builds an **AAB**, which Play requires (not an APK)
- [x] `autoIncrement` on, so versionCode rises without being remembered
- [x] Signing key held by EAS
- [x] `RECORD_AUDIO` removed — the app never records
- [x] `ACCESS_FINE_LOCATION` blocked — only coarse is ever used
- [x] Row Level Security verified against the live database
- [x] No secret in the bundle — verified by unpacking the shipped APK, not the
      export: no QF client secret, database password or service-role key. The
      Supabase project ref is present and is meant to be.
- [x] Account deletion endpoint deployed and reachable from Settings
- [x] `expo-updates` installed, so JS fixes ship without a review cycle

## Waiting on someone else

- [ ] **Production `search` permission.** Requested 19 Sep 2026, pending QF
      review; pre-live took about ten hours. Nothing needs deploying when it
      lands — `qfToken` asks for `search` on every cold start and drops it if
      refused, so the feature starts working on its own within the hour.
      Until then `/search` answers `search_unavailable` (503) and the app shows
      the "search is unavailable, everything else still works" message.

## Worth doing first

- [ ] **Test on iOS.** Nothing has ever run on it. Publishing Android first is
      fine, but the iOS build is unverified, not merely unreleased.
- [ ] **Internal testing track** before production. Ships to a handful of
      testers with no review delay, and catches the class of bug that only
      appears in a release build — as the Sentry Gradle failure did.
- [ ] Rotate the database password if it has been shared anywhere.

---

## Building for release

```bash
set -a && . ./.env.eas && set +a
npx eas build --profile production --platform android
```

Produces an AAB. Then either upload it manually in the Play Console, or:

```bash
npx eas submit --platform android --latest
```

`eas.json` sets the track to `internal` with `releaseStatus: draft`, so a
submission cannot go straight to production by accident. Promote it deliberately
in the Console.

---

## What the first release will and will not do

**Will**: full Quran with English and Bengali translation, recitation with
background playback, tafsir, bookmarks, private notes, streaks and goals,
reading calendar, local reminders with quiet hours, prayer times, offline
reading with later sync, guest mode, light and dark themes.

**Will not, at first**: search, until Quran Foundation approves the permission
in production. The app says so plainly rather than showing a retry button that
cannot work.

**Needs a connection** for content it has not cached. Quran text is fetched, not
bundled — the developer terms cap caching at one week and do not permit shipping
an offline copy.
