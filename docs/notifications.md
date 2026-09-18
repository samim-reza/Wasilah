# Reminders and notifications

Two modules, one boundary:

> **`features/reminders` decides WHETHER a person should be reminded.
> `features/notifications` decides HOW that reminder is delivered.**

The reminder module calls the notification module. It never schedules anything
itself, and the notification module never contains a rule about quiet hours or
streaks. Keeping these apart is what stops scheduling policy from leaking into
UI code and delivery details from leaking into business logic.

## The governing principle

A reminder must earn its place. Almost every rule in `reminderRules.ts` exists
to _remove_ a notification, not to add one. The most important of them:

> **If the user has already read today, send nothing.**

Telling someone to read when they already have is the clearest possible signal
that an app is not paying attention.

## Suppression rules

Evaluated in order, from most to least decisive:

| Reason              | Meaning                                                   |
| ------------------- | --------------------------------------------------------- |
| `permission_denied` | The OS will not deliver anything                          |
| `category_disabled` | The user turned this category off                         |
| `quiet_hours`       | Inside the user's quiet window (default 22:30–07:00)      |
| `daily_cap_reached` | Already at the per-day maximum (default 2)                |
| `cooldown_active`   | Less than the minimum gap since the last one (default 3h) |
| `duplicate_today`   | This category already fired today                         |
| `adaptive_backoff`  | Four of the last five were ignored                        |
| `already_completed` | The day's minimum is done                                 |
| `nothing_to_say`    | The template has no meaningful content for this state     |

Quiet hours wrap past midnight, which is why the check is not a simple
`start <= t && t < end`. A window whose endpoints are equal covers _nothing_,
not everything — treating it as all-day would silently mute every notification.

## Categories

| Category           | Fires when                                                            |
| ------------------ | --------------------------------------------------------------------- |
| `daily_reminder`   | At the user's chosen time, if the day is incomplete                   |
| `streak_reminder`  | Within 3h of local midnight, with a live streak and an incomplete day |
| `goal_reminder`    | The user has started but not finished — never to prompt a start       |
| `todays_ayah`      | The day's ayah is ready                                               |
| `prayer_reminder`  | At an offset from a calculated prayer time                            |
| `weather_reminder` | Rarely; only changes the wording of an invitation                     |

## Local first

Reminders are scheduled **locally** on the device. Local notifications need no
network, cannot be delayed by a push service, and never tell a server when a
person reads. The app re-plans them every time it opens.

The horizon is deliberately short — **two days**. A reminder scheduled further
out cannot know whether the user read in the meantime, so it would fire at
someone who is already up to date.

A `DATE` trigger is used rather than a repeating daily trigger, because whether
to send at all depends on the streak, the day's progress and recent notification
history — none of which a fixed recurring trigger can take into account.

Rescheduling cancels everything and re-plans. Reconciling individual triggers
against changed preferences is far more error-prone than rebuilding a list that
is never more than a handful of entries long.

## When push is used

The `notification-engine` edge function covers the one case local scheduling
cannot: a device that has not opened the app for **48 hours**, by which point its
locally scheduled reminders have all fired. For those users, and only those, it
sends one push.

Because of that narrow scope it does **not** reimplement the full engine. It
applies only the rules evaluable from stored state — day incomplete, outside
quiet hours, under the cap, not already sent. The richer personalisation
(learned reading time, adaptive back-off) stays on the device, where the data is.

## Content templates

Copy never appears inline in delivery code. `features/notifications/templates/`
holds one template per notification kind, each owning both its wording and its
deep link, so "what it says" and "where it goes" stay together.

Templates may return `null`, which means _this template does not apply to these
variables_ — a streak template with no streak, a goal template with nothing
remaining. The engine treats that as a reason not to send, not as an error.

Variables are deliberately narrow: streak length, remaining ayahs, an ayah
reference, time of day, weather condition, prayer name. There is no slot for
note text or a search query, so private content cannot reach a lock screen by
accident.

## Deep links

Every notification carries a route. Payloads are **untrusted input** — they may
come from the server or from an older app version — so `sanitizeRoute` rejects
anything that is not a known in-app path before navigation. A malformed payload
opens the home screen rather than doing nothing.

Two delivery paths must both be handled, and they are easy to confuse:

- the app is already running → `addNotificationResponseReceivedListener`
- the app was **launched by** the tap → `getLastNotificationResponseAsync`, the
  only way to see a response that arrived before any listener existed

A notification that sat in the tray overnight (more than 12 hours) opens the app
at home rather than at a destination chosen for yesterday.

## Android channels

Three channels — daily reminders, streak reminders, prayer reminders. Separate
channels are not cosmetic: they are the only way an Android user can mute streak
nudges while keeping their daily reminder. A single channel would force an
all-or-nothing choice.

## Foreground behaviour

Banners are suppressed while the app is open. The user is already reading, and a
"time to read" banner over the reader is exactly the noise this app exists to
avoid. The notification still lands in the tray.

## Setup

```bash
# Server-side secrets for the push worker
supabase secrets set EXPO_ACCESS_TOKEN=...

# Schedule the fallback engine (e.g. pg_cron, every 30 minutes)
select cron.schedule(
  'wasilah-notification-engine',
  '*/30 * * * *',
  $$ select net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/notification-engine',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
     ) $$
);
```

Push requires a development or production build — Expo Go cannot receive push
messages, and a simulator never can. Local notifications work everywhere.

## Testing

Rules are pure functions, so they are tested directly:

```bash
npx jest tests/unit/reminderRules.test.ts
```

Almost every assertion there checks that a notification is **not** sent. That is
the point: the engine's value is in what it suppresses.
