# Third-party content and licences

Every external resource the app ships or fetches, with its terms.

> **Rule:** if a licence cannot be verified, the resource is not shipped. An
> unverified licence is treated as _not permitted_, never as _probably fine_.

---

## Quran Foundation API

|                    |                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**        | Quran text, translations, tafsir, recitation URLs, search                                                                |
| **Source**         | Official Quran Foundation API (`apis.quran.foundation`)                                                                  |
| **Terms**          | Quran Foundation Developer Terms                                                                                         |
| **Attribution**    | **Required.** Rendered on the About screen and must not be removed                                                       |
| **Caching**        | One week for ordinary Content API responses, unless a Content Sync exception applies. Enforced by `contentCacheMaxAgeMs` |
| **Redistribution** | Raw API content must not be redistributed                                                                                |
| **Commercial use** | **Verify against the current terms before monetising**                                                                   |
| **Status**         | ✅ Production `content` granted (19 Sep 2026). `search` requested the same day, pending review                           |

Notes: no Quran content is stored in our database. The app is an independent
product and does not present itself as an official Quran.com application.

---

## Translations

> **Read this before removing an edition.** An earlier version of this file
> assumed each translation had to be licensed individually from its publisher,
> and marked the shipped editions as unverified blockers. That is stricter than
> the terms Wasilah actually operates under — see below.

### What the QF Developer Terms cover

The terms define **QF Content** as _"Quran text, translations, metadata, audio,
reflections, and any other content returned by the APIs"_ — translations and
recitation audio included — and license its display under the single developer
agreement:

> "Developer may display QF Content to end users within the Application,
> provided that" the text remains unmodified, the content is not sold or
> redistributed, and snippets preserve their original context.

Commercial models (paid apps, subscriptions, ads, donations, freemium) are
allowed without a separate commercial licence, so long as the content stays part
of the end-user experience and is not resold or redistributed on its own.
Selling or sublicensing the content itself is what needs a separate written
licence, and Wasilah does none of that.

### How Wasilah measures up

| Condition                      | Status                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| Display only, within the app   | ✅ Fetched at runtime; nothing bundled, nothing re-hosted       |
| Text unmodified                | ⚠️ See "On sanitisation" below                                  |
| Not sold or redistributed      | ✅ Free app, no resale, no export of raw API content            |
| Snippets preserve context      | ✅ Every ayah and share card carries its `surah:ayah` reference |
| Cached no longer than one week | ✅ `contentCacheMaxAgeMs`, enforced in three places             |
| Attribution                    | ✅ About screen, not removable                                  |

This is a reading of the published terms, not legal advice. The conservative
rule at the top of this file still stands — but the thing to verify is **QF's
terms**, which cover the editions their API serves, not a separate agreement
with each publisher.

### On sanitisation

Translation bodies arrive with inline footnote markup
(`the Book<sup foot_note=12345>1</sup>`). React Native has no HTML renderer, so
`sanitizeTranslationText` strips the tags and renders the marker as a Unicode
superscript digit. The wording of the translation is untouched; only the markup
around it is. Footnote markers are deliberately kept rather than dropped,
because removing them silently would misrepresent the edition.

| Edition                 | Resource ID | Language | Licence verified                 |
| ----------------------- | ----------- | -------- | -------------------------------- |
| Saheeh International    | 20          | English  | ❌ **Verify before production**  |
| Taisirul Quran          | 161         | Bengali  | ❌ **Verify before production**  |
| M. Pickthall (fallback) | 19          | English  | ✅ Published 1930; public domain |

**Action required before release:** confirm the terms for each edition shipped
as a default. Record the outcome in this table. Remove any edition whose terms
cannot be confirmed.

### On the default English edition

The default was Dr. Mustafa Khattab's _The Clear Quran_ (131) until a check
against the live catalogues showed **131 does not exist in any Quran Foundation
environment** — it is a quran.com resource id, and the two catalogues are not
the same. QF production carries 145 editions, pre-live 14. A request for a
missing id is not an error: the API returns the verse with an empty
`translations` array, so the reader shows Arabic alone and says nothing.

Saheeh International (20) replaces it: modern English, and the edition QF's own
platform serves by default. Its licence is still unverified, and API
availability is explicitly not a licence — see the rule at the top of this file.

**If it cannot be confirmed**, the fallback is already in place: change `en` in
`src/config/quran.ts` to `19` (Pickthall, 1930, public domain) and reorder
`preferredTranslationsByLanguage`. One line each, and no other code assumes a
particular edition.

---

## Recitations

| Reciter                 | Resource ID | Basis for shipping                         |
| ----------------------- | ----------- | ------------------------------------------ |
| Mishari Rashid al-Afasy | 7           | QF Developer Terms — audio is "QF Content" |

Confirmed present in the production catalogue (12 recitations) and serving
audio: `recitations/7/by_ayah/18:1` returns `Alafasy/mp3/018001.mp3`, a path
relative to `verses.quran.foundation`. The app streams from the URL the API
supplies and never downloads, re-hosts or redistributes the file.

Audio is streamed from URLs supplied by the API. No recitation audio is
redistributed or re-hosted.

---

## Fonts

### Amiri Quran

|                    |                                                                               |
| ------------------ | ----------------------------------------------------------------------------- |
| **Purpose**        | Arabic Quran text                                                             |
| **Source**         | Google Fonts / [github.com/aliftype/amiri](https://github.com/aliftype/amiri) |
| **Licence**        | SIL Open Font Licence 1.1                                                     |
| **Attribution**    | Credited on the About screen                                                  |
| **Commercial use** | ✅ Permitted                                                                  |
| **Redistribution** | ✅ Permitted, including bundled in an application                             |
| **Status**         | ✅ Verified                                                                   |

Chosen over a general-purpose Arabic face because it carries the full set of
Quranic diacritics and pause marks and positions them correctly. A UI font
renders them clipped or misplaced, which would distort the text.

### Noto Sans Bengali

|                    |                           |
| ------------------ | ------------------------- |
| **Purpose**        | Bengali translations      |
| **Source**         | Google Fonts              |
| **Licence**        | SIL Open Font Licence 1.1 |
| **Commercial use** | ✅ Permitted              |
| **Status**         | ✅ Verified               |

Needed because the Android system font does not reliably render Bengali
conjuncts (যুক্তাক্ষর) on older devices.

### UI typeface

The system font. No Latin face is bundled — it costs nothing to download, looks
native on each platform, and keeps the APK smaller.

---

## Weather

|               |                                                     |
| ------------- | --------------------------------------------------- |
| **Provider**  | [Open-Meteo](https://open-meteo.com)                |
| **Licence**   | CC BY 4.0; free for non-commercial use              |
| **API key**   | None required                                       |
| **Data sent** | Coarse coordinates only (rounded to ~11km)          |
| **Status**    | ⚠️ **Verify the commercial tier before monetising** |

Chosen specifically because it needs no key and no account — no credential in
the bundle, and no third party building a profile from our users' locations.

---

## Prayer times

|             |                                                   |
| ----------- | ------------------------------------------------- |
| **Library** | [`adhan`](https://github.com/batoulapps/adhan-js) |
| **Licence** | MIT                                               |
| **Status**  | ✅ Verified                                       |

Calculated entirely on-device. No location data is transmitted for prayer times.

---

## Mushaf page images

**Not shipped.** Page-image rendering (`mushaf_mode`) is behind a feature flag
and disabled, because the licensing for Mushaf page imagery has not been
verified. Do not enable it until it has.

---

## Software dependencies

Runtime dependencies are MIT, Apache-2.0 or BSD. Generate a current inventory
with:

```bash
npx license-checker --summary --production
```

---

## Pre-release checklist

- [ ] Quran Foundation production access granted
- [ ] Every shipped translation's licence confirmed and recorded above
- [ ] Every shipped reciter's licence confirmed and recorded above
- [ ] Commercial-use terms confirmed for the API, translations, audio and weather
- [ ] Attribution visible and not obscured on the About screen
- [ ] Privacy policy published and linked
- [ ] Caching limits verified against the current developer terms
- [ ] No unverified resource shipped
