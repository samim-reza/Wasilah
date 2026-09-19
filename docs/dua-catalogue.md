# Dua catalogue — content to fill in

Every occasion below already works in the app: the trigger fires, the
notification is built, the detail screen renders, and the tests cover it. What
is missing is only the words. Each entry currently shows the placeholder
`Allah`.

## How to fill one in

Edit [`src/features/duas/data/duaCatalogue.ts`](../src/features/duas/data/duaCatalogue.ts)
and replace the `text: stub()` call for that occasion:

```ts
text: {
  arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا',
  transliteration: "Allahumma sayyiban nafi'an",
  translation: 'O Allah, a beneficial rain.',
  benefit: 'Said when rain falls.',
  source: 'Sahih al-Bukhari 1032',
},
```

`source` is required and is checked by
[`tests/unit/duaCatalogue.test.ts`](../tests/unit/duaCatalogue.test.ts): the
moment an entry has real Arabic text but still carries the placeholder source,
the test suite fails. That is deliberate — spec §23 forbids attaching religious
meaning to a condition like rain or a new moon without an authoritative source,
and this makes the rule impossible to forget rather than merely documented.

> **Verify every reference yourself.** The "commonly cited as" column below is a
> starting point from general knowledge, not a checked citation. Confirm each
> one against a primary collection before it ships. Where the column says
> _needs research_, I could not name a reference I trust.

## Daily rhythm

| id | Occasion | Fires when | Commonly cited as |
|---|---|---|---|
| `morning-adhkar` | Morning remembrance | Morning (05:00–12:00) | Sahih Muslim 2723 |
| `evening-adhkar` | Evening remembrance | Evening (17:00–21:00) | Sahih Muslim 2723 |
| `before-sleep` | Before sleeping | Sleep reminder enabled | Sahih al-Bukhari 6324 |
| `waking-up` | On waking | Morning | Sahih al-Bukhari 6312 |

## Sky and weather

Weather comes from the existing optional, coarse-location weather service. When
the user has not granted location, none of these fire — the selector treats
"unknown weather" as "no match", never as a match.

| id | Occasion | Fires when | Commonly cited as |
|---|---|---|---|
| `rain-falling` | When it rains | Condition is rain | Sahih al-Bukhari 1032 |
| `rain-heavy` | When rain is too heavy | Condition is storm | Sahih al-Bukhari 1014 |
| `thunder` | On hearing thunder | Condition is storm | Muwatta Malik 3641 |
| `strong-wind` | When the wind is strong | Condition is storm | Sahih Muslim 899 |
| `intense-heat` | In intense heat | ≥ 35°C | _needs research_ |
| `intense-cold` | In bitter cold | ≤ 2°C | _needs research_ |
| `new-crescent` | Sighting the new crescent | Moon age 0.9–3.5 days, evening or night | Jami at-Tirmidhi 3451 |
| `clear-night-sky` | Under a clear night sky | Clear, at night | _needs research_ |

## Calendar

| id | Occasion | Fires when | Commonly cited as |
|---|---|---|---|
| `friday` | Friday | Friday | Sunan Abi Dawud 1047 |
| `friday-last-hour` | The last hour of Friday | Friday evening | Sahih al-Bukhari 935 |
| `ramadan-iftar` | Breaking the fast | Evening | Sunan Abi Dawud 2357 |
| `laylat-al-qadr` | Laylat al-Qadr | Night | Jami at-Tirmidhi 3513 |
| `new-hijri-month` | A new Hijri month | New crescent | Jami at-Tirmidhi 3451 |

**Not yet driven by a real calendar.** `ramadan-iftar`, `laylat-al-qadr` and
`new-hijri-month` currently fire on a time-of-day or lunar approximation, not on
an actual Hijri date. Wiring a Hijri calendar is a separate piece of work; until
then these will fire outside Ramadan. Say the word and I will gate them properly.

## Everyday actions

These have no world-condition — they are the "do you know the dua for…?" set,
chosen at random when nothing more specific applies.

| id | Occasion | Commonly cited as |
|---|---|---|
| `leaving-home` | Leaving the house | Sunan Abi Dawud 5095 |
| `entering-home` | Entering the house | Sunan Abi Dawud 5096 |
| `entering-washroom` | Entering the washroom | Sahih al-Bukhari 142 |
| `leaving-washroom` | Leaving the washroom | Sunan Abi Dawud 30 |
| `before-wudu` | Before wudu | Sunan Abi Dawud 101 |
| `after-wudu` | After wudu | Sahih Muslim 234 |
| `before-eating` | Before eating | Sahih al-Bukhari 5376 |
| `after-eating` | After eating | Sunan Abi Dawud 4023 |
| `drinking-water` | Drinking water | _needs research_ |
| `wearing-new-clothes` | Wearing new clothes | Sunan Abi Dawud 4020 |
| `entering-masjid` | Entering the masjid | Sahih Muslim 713 |
| `leaving-masjid` | Leaving the masjid | Sahih Muslim 713 |
| `starting-a-journey` | Setting out on a journey | Sahih Muslim 1342 |
| `riding-a-vehicle` | Riding a vehicle | Quran 43:13–14 |
| `returning-from-travel` | Returning from travel | Sahih al-Bukhari 1797 |
| `entering-market` | Entering the market | Jami at-Tirmidhi 3428 |
| `hearing-adhan` | Hearing the adhan | Sahih al-Bukhari 611 |
| `after-adhan` | After the adhan | Sahih al-Bukhari 614 |
| `sneezing` | When you sneeze | Sahih al-Bukhari 6224 |
| `visiting-the-sick` | Visiting someone unwell | Sahih al-Bukhari 3616 |
| `looking-in-mirror` | Looking in the mirror | _needs research_ |

## States of the heart

| id | Occasion | Commonly cited as |
|---|---|---|
| `anger` | When angry | Sahih al-Bukhari 3282 |
| `anxiety-and-grief` | In worry or grief | Sahih al-Bukhari 6369 |
| `burdened-by-debt` | Weighed down by debt | Jami at-Tirmidhi 3563 |
| `a-difficult-task` | Facing something difficult | Ibn Hibban 974 |
| `seeking-forgiveness` | Seeking forgiveness | Sahih al-Bukhari 6306 |
| `gratitude` | On good news | Sunan Abi Dawud 2774 |
| `bad-dream` | After a bad dream | Sahih Muslim 2261 |
| `fear-at-night` | Fear at night | Sahih Muslim 2708 |

## Prayer

| id | Occasion | Commonly cited as |
|---|---|---|
| `after-fard-prayer` | After an obligatory prayer | Sahih Muslim 597 |
| `between-adhan-and-iqamah` | Between adhan and iqamah | Sunan Abi Dawud 521 |
| `tahajjud` | Last third of the night | Sahih al-Bukhari 1120 |
| `istikhara` | Seeking guidance | Sahih al-Bukhari 1162 |

## Protective ayahs

| id | Occasion | Reference |
|---|---|---|
| `ayat-al-kursi` | Ayat al-Kursi | Quran 2:255 |
| `three-quls` | The three Quls | Quran 112, 113, 114 |
| `last-two-ayahs-baqarah` | Last two ayahs of al-Baqarah | Quran 2:285–286 |
| `surah-al-mulk` | Surah al-Mulk | Quran 67 |
| `surah-al-kahf` | Surah al-Kahf on Friday | Quran 18 |

For these five, the ayah text can come from the Quran Foundation API the app
already uses rather than being pasted in by hand. Worth doing — it keeps the
Arabic authoritative and consistent with the reader. Tell me if you want that
wired instead of hand-entered text.

## Adding a new occasion

Append to `duaCatalogue`. The id must be lowercase, digits and hyphens only
(the tests enforce it, because it goes into a route and a notification payload).
Pick the trigger conditions from `DuaTrigger`; an empty `{}` means "always
eligible", which puts it in the random everyday pool.
