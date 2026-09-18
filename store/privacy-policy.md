# Privacy Policy — Wasilah

**Last updated: 19 September 2026**

> **This is a draft prepared from the app's actual implementation, not a
> template.** Every claim below was checked against the code. It has not been
> reviewed by a lawyer, and you are responsible for that review and for hosting
> it at a public URL before submitting to Google Play, which requires one.

Wasilah is a Quran reading app. This policy explains what it stores, why, and
what it deliberately does not.

---

## The short version

- **No ads. No advertising identifiers. Nothing is sold or shared for marketing.**
- You can read the entire Quran, build a streak and keep bookmarks **without an
  account**. Nothing leaves your device until you create one.
- Analytics and crash reporting are **off unless you turn them on**, and neither
  ever records which verses you read, what you search for, or what you write.
- Location is optional, used only for prayer times and weather, and is
  **rounded to roughly 11 kilometres** before it is stored.

---

## What is stored, and when

### If you use Wasilah without an account

Everything stays on your device: your reading progress, streak, bookmarks,
reading position and preferences. None of it is transmitted.

Quran text, translations and recitations are fetched from our server as you
read. Those requests carry no account and no identifier.

### If you create an account

| Data                                                           | Why                                                                             | Kept until                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------- |
| Email address                                                  | To sign you in and let you reset your password                                  | You delete your account          |
| Password                                                       | Stored only as a cryptographic hash, never in readable form                     | You delete your account          |
| Display name (optional)                                        | To greet you by name                                                            | You delete your account          |
| Reading sessions — when you read, which surah, how many verses | To count your streak and show your progress                                     | You delete your account          |
| Daily totals and streak                                        | So your streak follows you between devices                                      | You delete your account          |
| Bookmarks and collections                                      | So your saved verses sync                                                       | You delete them, or your account |
| Notes                                                          | So your private reflections sync                                                | You delete them, or your account |
| Reading position                                               | So "continue reading" works on any device                                       | You delete your account          |
| Timezone                                                       | So a reminder set for 8pm arrives at your 8pm, and so your streak uses your day | You delete your account          |
| Language and reading preferences                               | So the app looks the same on a new device                                       | You delete your account          |

### If you enable reminders

A push token identifying this installation, plus your device platform and app
version. Used only to deliver your own reminders. Removed when you sign out or
disable notifications.

We also record which reminders were sent and whether you opened them. This is
what allows the app to send **fewer** notifications when you are ignoring them.

### If you enable prayer times or weather

Your **approximate** location, rounded to about 11 kilometres before it is
stored — accurate enough to calculate prayer times to within a minute, and not
accurate enough to identify where you live. The database column itself cannot
hold anything more precise.

Prayer times are calculated entirely on your device. Your location is sent to a
weather service **only** if you switch weather reminders on.

### If you opt in to analytics

Anonymous product events: that the app opened, that a reading session finished
and how many verses it contained, that a goal was met, that a notification was
opened.

**No event can carry which verse you read, what you searched for, or what you
wrote.** There are no fields for that information. A saved note reports only
whether it was short, medium or long; a search reports only whether it found
anything.

Off by default. Turn it on or off at any time in Settings.

### If you opt in to crash reporting

Technical details of a crash: the error, where in the code it happened, your
device model and OS version. Reports are scrubbed before sending; note text,
search queries, coordinates and authentication tokens are removed.

Off by default.

---

## What is never collected

- Your precise location
- Microphone or camera access — the app does not request either
- Contacts, photos, files or calendar
- Advertising identifiers
- Which specific verses you read, in any analytics or log
- The content of your notes, anywhere outside your own account

---

## Who else is involved

| Service              | What it receives                                                         | When                           |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| **Supabase**         | Your account and everything listed above                                 | Only with an account           |
| **Quran Foundation** | Requests for Quran content — from **our server**, never from your device | Always, to show the Quran      |
| **Expo**             | Your push token and the reminder text                                    | Only with reminders on         |
| **Open-Meteo**       | Approximate coordinates                                                  | Only with weather reminders on |
| **PostHog**          | Anonymous product events                                                 | Only if you opt in             |
| **Sentry**           | Scrubbed crash reports                                                   | Only if you opt in             |

Quran content is requested through our own server rather than directly from your
device. Quran Foundation therefore never sees your device, your IP address or
your reading — it sees only our server asking for a verse.

---

## Your control

- **Export** — request a copy of your data from Settings
- **Delete** — delete your account from Settings. This removes your profile,
  reading history, streak, bookmarks and notes permanently and immediately. It
  cannot be undone.
- **Withdraw consent** — turn analytics or crash reporting off at any time;
  collection stops immediately, not at the next restart.
- **Use it without an account** — and nothing is transmitted at all.

---

## Security

Everything travels over HTTPS. Your session credentials are held in your
device's secure keystore rather than ordinary app storage, so they are not
readable from a device backup.

Access is enforced at the database level, not only in the app. Every table
holding personal data has a rule permitting access solely to the account that
owns the row — so even a flaw in the app cannot expose one person's notes or
reading to another.

---

## Children

Wasilah is suitable for all ages and collects nothing beyond what is described
here. It is not directed at children under 13, and we do not knowingly collect
data from them.

---

## Changes

Material changes will be announced in the app before taking effect. The date at
the top of this page always reflects the current version.

---

## Contact

Questions about your data, or a request to export or delete it:

**support@wasilah.app**

---

Wasilah is an independent application. It is not affiliated with, endorsed by,
or an official product of Quran.com or the Quran Foundation.
