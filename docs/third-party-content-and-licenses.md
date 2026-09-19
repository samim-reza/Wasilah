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

Translation editions are fetched by resource id and are **licensed
individually**. The API serving an edition does not by itself grant the right to
ship it commercially.

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

| Reciter                 | Resource ID | Licence verified                |
| ----------------------- | ----------- | ------------------------------- |
| Mishari Rashid al-Afasy | 7           | ❌ **Verify before production** |

Confirmed present in the production catalogue (12 recitations) and serving
audio: `recitations/7/by_ayah/18:1` returns `Alafasy/mp3/018001.mp3`, a path
relative to `verses.quran.foundation`.

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
