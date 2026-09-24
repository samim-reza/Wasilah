# Dua catalogue

Every occasion in [`src/features/duas/data/duaCatalogue.ts`](../src/features/duas/data/duaCatalogue.ts)
now carries its words: Arabic, a transliteration, the meaning, the benefit the
source names, and the source itself. The catalogue drives three things:

- **Notifications.** The reminder planner offers the occasion whose trigger
  holds — rain, a prayer, the new crescent, Friday — and the nightly
  "do you know the dua for…?" prompt. The widget's background task raises the
  weather alerts (rain, thunder, heat, cold) the moment a fresh reading shows
  them.
- **The home-screen widget.** Each moment of the day shows its occasion over a
  scene: the sunset with the evening remembrance, Maghrib with the dua after
  the adhan, the crescent nights with the crescent dua, and between moments
  an everyday dua or a word about reading.
- **The dua screen** at `/dua/<id>`, on the app and the web, which shows the
  full text and its source.

## The rule that governs the content

Spec §23: a condition in the world — rain, heat, a new moon, a Friday — may
only carry religious meaning when an authoritative source says it does. So
`source` is required on every entry, and
[`tests/unit/duaCatalogue.test.ts`](../tests/unit/duaCatalogue.test.ts) fails the
build for any entry with real Arabic and a placeholder source.

Two entries are deliberately **not duas**. No specific supplication for intense
heat or bitter cold is authentically transmitted, and inventing one would break
the rule above. Those two entries carry the Prophet's ﷺ own words about heat
and cold (Sahih al-Bukhari 536 and 537) with a note saying so, and point to
seeking refuge from the Fire.

Two more carry an honest caveat in their `benefit`: the mirror dua's link to
the mirror specifically comes from a weak report (the words themselves are
sound, Sahih Ibn Hibban 959), and Surah al-Mulk and al-Kahf show only their
opening ayah with a pointer to the reader, because thirty ayahs do not belong
on a notification.

## Where each source comes from

The references are the standard collections as numbered on sunnah.com and in
Hisn al-Muslim. Verify against the collection itself, not this table.

| id | Occasion | Trigger | Source |
|---|---|---|---|
| `morning-adhkar` | Morning remembrance | morning | Sahih Muslim 2723 |
| `evening-adhkar` | Evening remembrance | evening | Sahih Muslim 2723 |
| `before-sleep` | Before sleeping | sleep reminder | Sahih al-Bukhari 6324 |
| `waking-up` | On waking | morning | Sahih al-Bukhari 6312 |
| `rain-falling` | When it rains | weather: rain | Sahih al-Bukhari 1032 |
| `rain-heavy` | When rain is too heavy | weather: storm | Sahih al-Bukhari 1014 |
| `thunder` | On hearing thunder | weather: storm | Muwatta Malik 2/992; al-Adab al-Mufrad 723 |
| `strong-wind` | When the wind is strong | weather: storm | Sahih Muslim 899 |
| `intense-heat` | In intense heat (a reminder, not a dua) | ≥ 35°C | Sahih al-Bukhari 536 |
| `intense-cold` | In bitter cold (a reminder, not a dua) | ≤ 2°C | Sahih al-Bukhari 537 |
| `new-crescent` | Sighting the new crescent | moon age 0.9–3.5 days, evening/night | Jami at-Tirmidhi 3451; Sunan ad-Darimi 1687 |
| `clear-night-sky` | Under a clear night sky | clear, night | Quran 3:190–191; Sahih al-Bukhari 4569 |
| `friday` | Friday | Friday | Sahih al-Bukhari 3370; Sunan Abi Dawud 1047 |
| `friday-last-hour` | The last hour of Friday | Friday evening | Sunan Abi Dawud 1048; Quran 2:201; Sahih al-Bukhari 6389 |
| `ramadan-iftar` | Breaking the fast | Ramadan, evening | Sunan Abi Dawud 2357 |
| `laylat-al-qadr` | The odd nights of Ramadan | Ramadan nights 21/23/25/27/29 | Jami at-Tirmidhi 3513; Sunan Ibn Majah 3850 |
| `new-hijri-month` | A new Hijri month | Hijri day 1–2 | Jami at-Tirmidhi 3451; Sunan ad-Darimi 1687 |
| `leaving-home` | Leaving the house | everyday | Sunan Abi Dawud 5095; Jami at-Tirmidhi 3426 |
| `entering-home` | Entering the house | everyday | Sunan Abi Dawud 5096 |
| `entering-washroom` | Entering the washroom | everyday | Sahih al-Bukhari 142; Sahih Muslim 375 |
| `leaving-washroom` | Leaving the washroom | everyday | Sunan Abi Dawud 30; Jami at-Tirmidhi 7 |
| `before-wudu` | Before wudu | everyday | Sunan Abi Dawud 101; Sunan Ibn Majah 397 |
| `after-wudu` | After wudu | everyday | Sahih Muslim 234 |
| `before-eating` | Before eating | everyday | Sahih al-Bukhari 5376; Sunan Abi Dawud 3767 |
| `after-eating` | After eating | everyday | Sunan Abi Dawud 4023; Jami at-Tirmidhi 3458 |
| `drinking-water` | Drinking water | everyday | Sahih Muslim 2734 |
| `wearing-new-clothes` | Wearing new clothes | everyday | Sunan Abi Dawud 4020; Jami at-Tirmidhi 1767 |
| `entering-masjid` | Entering the masjid | everyday | Sahih Muslim 713 |
| `leaving-masjid` | Leaving the masjid | everyday | Sahih Muslim 713 |
| `starting-a-journey` | Setting out on a journey | everyday | Sahih Muslim 1342 |
| `riding-a-vehicle` | Riding a vehicle | everyday | Quran 43:13–14; Sunan Abi Dawud 2602 |
| `returning-from-travel` | Returning from travel | everyday | Sahih al-Bukhari 1797; Sahih Muslim 1342 |
| `entering-market` | Entering the market | everyday | Jami at-Tirmidhi 3428 |
| `hearing-adhan` | Hearing the adhan | everyday | Sahih al-Bukhari 611; Sahih Muslim 385 |
| `after-adhan` | After the adhan | everyday; widget: each prayer | Sahih al-Bukhari 614 |
| `sneezing` | When you sneeze | everyday | Sahih al-Bukhari 6224 |
| `visiting-the-sick` | Visiting someone unwell | everyday | Sunan Abi Dawud 3106; Jami at-Tirmidhi 2083; Sahih al-Bukhari 3616 |
| `looking-in-mirror` | Looking in the mirror | everyday | Sahih Ibn Hibban 959; Musnad Ahmad 3823 |
| `anger` | When angry | everyday | Sahih al-Bukhari 3282; Sahih Muslim 2610 |
| `anxiety-and-grief` | In worry or grief | everyday | Sahih al-Bukhari 6369 |
| `burdened-by-debt` | Weighed down by debt | everyday | Jami at-Tirmidhi 3563 |
| `a-difficult-task` | Facing something difficult | everyday | Sahih Ibn Hibban 974 |
| `seeking-forgiveness` | Seeking forgiveness | everyday | Sahih al-Bukhari 6306 |
| `gratitude` | On good news | everyday | Sunan Ibn Majah 3803 |
| `bad-dream` | After a bad dream | night | Sahih Muslim 2261, 2262 |
| `fear-at-night` | Fear at night | night | Sunan Abi Dawud 3893; Jami at-Tirmidhi 3528 |
| `after-fard-prayer` | After an obligatory prayer | everyday; widget: afternoon | Sahih Muslim 591 |
| `between-adhan-and-iqamah` | Between adhan and iqamah | everyday; widget: noon | Sunan Abi Dawud 521; Jami at-Tirmidhi 3594; Sunan Ibn Majah 3871 |
| `tahajjud` | The last third of the night | night; widget: last third | Sahih al-Bukhari 1120, 1145 |
| `istikhara` | Seeking guidance | everyday | Sahih al-Bukhari 1162 |
| `ayat-al-kursi` | Ayat al-Kursi | night | Quran 2:255; Sahih al-Bukhari 2311 |
| `three-quls` | The three Quls | morning, evening | Quran 112–114; Sunan Abi Dawud 5082; Jami at-Tirmidhi 3575 |
| `last-two-ayahs-baqarah` | Last two ayahs of al-Baqarah | night; widget: midnight | Quran 2:285–286; Sahih al-Bukhari 5009 |
| `surah-al-mulk` | Surah al-Mulk | night | Quran 67; Jami at-Tirmidhi 2891, 2892 |
| `surah-al-kahf` | Surah al-Kahf on Friday | Friday | Quran 18; al-Hakim 2/368; Sahih Muslim 809 |

## The calendar

Ramadan, the odd nights and the new month are judged by the tabular Hijri
calendar in [`src/lib/datetime/hijri.ts`](../src/lib/datetime/hijri.ts). It is
right to within a day of the sighted month, which is enough to offer the words
and not enough to announce a date — so copy says "one of the odd nights", never
"tonight is the 27th". The Islamic day begins at sunset, and the night triggers
account for that: the night of the 27th is the evening after the 26th's
daylight.

## The widget's day

`src/features/widget/services/widgetCards.ts` lays the day out as moments, each
with the occasion that belongs to it:

| Moment | When | Occasion |
|---|---|---|
| Last third of the night | from a third of the night before fajr, to fajr | `tahajjud` |
| Each prayer | 30 minutes from its time | `after-adhan` (`ramadan-iftar` at Maghrib in Ramadan) |
| Dawn | after the Fajr card, until sunrise | `morning-adhkar` |
| Sunrise | 25 minutes | `waking-up` |
| Morning | an hour after sunrise, 25 minutes | `three-quls` |
| Noon | 25 minutes before Dhuhr | `between-adhan-and-iqamah` |
| Afternoon | 25 minutes before Asr | `after-fard-prayer` |
| Sunset | 30 minutes before Maghrib | `evening-adhkar` |
| Night | after the Isha card, 25 minutes | `ayat-al-kursi` |
| Midnight | solar midnight, 25 minutes | `last-two-ayahs-baqarah` |

Weather beats the clock (rain, thunder, heat, cold), then the sky and the
calendar (the crescent, the odd nights, a new month, Friday), and between
moments the card rotates every hour between an everyday dua and a word about
reading — a nudge while today's ayah is unread, praise once it is read.

Prayer cards need the real prayer times, which need a location; without one the
moments follow the clock and no prayer is announced.

## Adding a new occasion

Append to `duaCatalogue`. The id must be lowercase, digits and hyphens only
(the tests enforce it, because it goes into a route and a notification payload).
Pick the trigger conditions from `DuaTrigger`; an empty `{}` means "always
eligible", which puts it in the random everyday pool. Fill every field of
`text`, and cite the source.
