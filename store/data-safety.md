# Play Console — Data safety answers

Google asks these at submission, and the answers become a public table on your
listing. Everything below was checked against the implementation; where the
honest answer is "it depends on a setting", that is stated rather than rounded
to yes or no.

> A wrong answer here is a policy violation, not a typo. If you change what the
> app collects, change this first.

---

## Does your app collect or share any of the required user data types?

**Yes** — but only once the user creates an account or enables an optional
feature. Used without an account, the app transmits nothing.

## Is all user data encrypted in transit?

**Yes.** Every request uses HTTPS.

## Do you provide a way for users to request that their data be deleted?

**Yes.** Settings → Delete my account. Immediate and permanent, via a dedicated
server endpoint that verifies the requester is the account owner.

---

## Data types

### Personal info

| Type          | Collected | Shared | Purpose                                    | Optional?                          |
| ------------- | --------- | ------ | ------------------------------------------ | ---------------------------------- |
| Name          | Yes       | No     | App functionality — to greet the user      | **Yes** — display name is optional |
| Email address | Yes       | No     | Account management                         | Only with an account               |
| User IDs      | Yes       | No     | Account management, syncing across devices | Only with an account               |

### Location

| Type                 | Collected | Shared                          | Purpose                                                            | Optional?                                 |
| -------------------- | --------- | ------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Approximate location | Yes       | **Yes** — to a weather provider | App functionality: prayer times, and weather wording for reminders | **Yes** — both features off by default    |
| Precise location     | **No**    | No                              | —                                                                  | The permission is blocked in the manifest |

Coordinates are rounded to roughly 11km before storage, and the database column
type cannot hold anything finer.

### App activity

| Type                         | Collected                    | Shared | Purpose                                 | Optional?            |
| ---------------------------- | ---------------------------- | ------ | --------------------------------------- | -------------------- |
| App interactions             | **Only if the user opts in** | No     | Analytics                               | Yes — off by default |
| Other user-generated content | Yes                          | No     | App functionality — bookmarks and notes | Only with an account |

Notes and bookmarks are stored solely for the account that created them and are
never shown to anyone else.

### App info and performance

| Type        | Collected                    | Shared | Purpose     | Optional?            |
| ----------- | ---------------------------- | ------ | ----------- | -------------------- |
| Crash logs  | **Only if the user opts in** | No     | Diagnostics | Yes — off by default |
| Diagnostics | **Only if the user opts in** | No     | Diagnostics | Yes — off by default |

### Device or other IDs

| Type                | Collected          | Shared | Purpose                                                | Optional?                                 |
| ------------------- | ------------------ | ------ | ------------------------------------------------------ | ----------------------------------------- |
| Device or other IDs | Yes — a push token | No     | App functionality: delivering the user's own reminders | **Yes** — only with notifications enabled |

---

## Declared as NOT collected

Financial info · Health and fitness · Messages · Photos and videos · Audio files
· Music · Voice or sound recordings · Files and docs · Calendar · Contacts ·
Web browsing history · Search history · Installed apps · Purchase history

On **voice or sound recordings** specifically: the app plays recitation but
never records. The `RECORD_AUDIO` permission that `expo-audio` adds by default
is explicitly disabled, so the microphone is not requested at all.

On **search history**: the app has a search feature, but the query is never
transmitted to analytics and never stored. Only whether a search returned
results is recorded, and only with analytics enabled.

---

## Content rating questionnaire

| Question                                  | Answer                                                   |
| ----------------------------------------- | -------------------------------------------------------- |
| Violence                                  | None                                                     |
| Sexuality                                 | None                                                     |
| Profanity                                 | None                                                     |
| Controlled substances                     | None                                                     |
| User-generated content shared with others | **No** — notes and bookmarks are private to their author |
| Users can interact or exchange content    | **No**                                                   |
| Shares user location with other users     | **No**                                                   |
| Digital purchases                         | **No**                                                   |

Expected rating: **Everyone**.

The absence of any social feature matters here. Because nothing a user writes is
ever visible to another user, the questionnaire's user-generated-content
obligations — moderation, reporting, blocking — do not apply.

---

## Ads and monetisation

| Question            | Answer |
| ------------------- | ------ |
| Contains ads        | **No** |
| In-app purchases    | **No** |
| Uses advertising ID | **No** |

The app requests no advertising identifier and contains no advertising SDK.

---

## Target audience

- **Primary**: 18 and over
- Not designed for or directed at children, though the content is suitable for
  all ages
- No child-directed design elements, so the Families policy does not apply
