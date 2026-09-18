# End-to-end tests

These flows run against a real build with [Maestro](https://maestro.dev).

```bash
# Install Maestro once
curl -Ls "https://get.maestro.mobile.dev" | bash

# Build and install a development client, then:
npm run e2e:android
```

## Why Maestro rather than Detox

Detox needs a native build step wired into the test runner and a grey-box
integration with the app's JS bridge. Maestro drives the app the way a person
does — black box, no instrumentation, no app-side test code — which means the
flows keep working across an Expo SDK upgrade instead of needing to be re-plumbed.

## What these cover

| Flow                        | Covers                                                          |
| --------------------------- | --------------------------------------------------------------- |
| `onboarding-to-streak.yaml` | The core loop: onboarding, goal, reminder, Today's Ayah, streak |
| `read-surah.yaml`           | Reader pagination, bookmark write path, bookmarks list          |

## Requirements

- A device or emulator with the app installed.
- Quran Foundation credentials configured on the edge proxy. Against the
  **pre-live** environment only Surah 1 and Surah 2 return content, which is why
  `read-surah.yaml` uses Al-Fatihah.
