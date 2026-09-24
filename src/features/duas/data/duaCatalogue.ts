/**
 * The occasion catalogue.
 *
 * Every entry currently carries placeholder text. The triggers, selection
 * logic, notification copy and detail screen are all real and tested against
 * these placeholders, so filling in the words is the only work left — no code
 * changes are needed to bring the content live.
 *
 * TO FILL THIS IN: replace each `text` block. `docs/dua-catalogue.md` lists
 * every occasion with the commonly cited reference for it as a starting point.
 *
 * Two rules, both machine-enforced by `tests/unit/duaCatalogue.test.ts`:
 *
 *   1. Ids are unique and stable — they appear in routes and analytics.
 *   2. No entry may carry real Arabic text with a placeholder source. The
 *      moment you paste a real dua in, the citation becomes mandatory and the
 *      test suite fails without it. This is spec §23 made unavoidable.
 */
import type { DuaOccasion } from '../types/dua.types';

/** Recognisable sentinel so the release gate can tell real content from stub. */
export const SOURCE_PLACEHOLDER = '__SOURCE_PENDING__';

/** The stand-in dua, used everywhere until the real words are supplied. */
export const PLACEHOLDER_ARABIC = 'Allah';

export const duaCatalogue: readonly DuaOccasion[] = [
  // --- Daily rhythm ---------------------------------------------------------
  {
    id: 'morning-adhkar',
    group: 'daily_rhythm',
    title: 'Morning remembrance',
    prompt: 'The morning words — shall we?',
    trigger: { timesOfDay: ['morning'] },
    imagery: 'dawn',
    text: {
      arabic:
        'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      transliteration:
        "Asbahna wa asbahal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir.",
      translation:
        'We have entered the morning, and the whole kingdom has entered the morning belonging to Allah. All praise is for Allah. None has the right to be worshipped but Allah alone, without partner. His is the dominion and His is the praise, and He is able to do all things.',
      benefit: 'Part of the morning remembrance the Prophet ﷺ kept every day.',
      source: 'Sahih Muslim 2723',
    },
  },
  {
    id: 'evening-adhkar',
    group: 'daily_rhythm',
    title: 'Evening remembrance',
    prompt: 'The day is closing. The evening words are waiting.',
    trigger: { timesOfDay: ['evening'] },
    imagery: 'sun',
    text: {
      arabic:
        'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      transliteration:
        "Amsayna wa amsal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir.",
      translation:
        'We have entered the evening, and the whole kingdom has entered the evening belonging to Allah. All praise is for Allah. None has the right to be worshipped but Allah alone, without partner. His is the dominion and His is the praise, and He is able to do all things.',
      benefit: 'Part of the evening remembrance the Prophet ﷺ kept every day.',
      source: 'Sahih Muslim 2723',
    },
  },
  {
    id: 'before-sleep',
    group: 'daily_rhythm',
    title: 'Before sleeping',
    prompt: 'Before you sleep tonight.',
    trigger: { requiresSleepSchedule: true },
    imagery: 'night',
    text: {
      arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
      transliteration: 'Bismika Allahumma amutu wa ahya.',
      translation: 'In Your name, O Allah, I die and I live.',
      benefit: 'Said by the Prophet ﷺ when he went to his bed.',
      source: 'Sahih al-Bukhari 6324',
    },
  },
  {
    id: 'waking-up',
    group: 'daily_rhythm',
    title: 'On waking',
    prompt: 'The first words of the day.',
    trigger: { timesOfDay: ['morning'] },
    imagery: 'dawn',
    text: {
      arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
      transliteration: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur.",
      translation:
        'All praise is for Allah, who gave us life after having taken it from us, and to Him is the resurrection.',
      benefit: 'Said by the Prophet ﷺ on waking.',
      source: 'Sahih al-Bukhari 6312',
    },
  },

  // --- Sky and weather ------------------------------------------------------
  {
    id: 'rain-falling',
    group: 'sky_and_weather',
    title: 'When it rains',
    prompt: "It's raining where you are. There are words for this.",
    trigger: { weather: ['rain'] },
    imagery: 'rain',
    text: {
      arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا',
      transliteration: "Allahumma sayyiban nafi'an.",
      translation: 'O Allah, a beneficial rain.',
      benefit: 'What the Prophet ﷺ said when he saw rain fall.',
      source: 'Sahih al-Bukhari 1032',
    },
  },
  {
    id: 'rain-heavy',
    group: 'sky_and_weather',
    title: 'When the rain is too heavy',
    prompt: 'Heavy skies tonight.',
    trigger: { weather: ['storm'] },
    imagery: 'rain',
    text: {
      arabic:
        'اللَّهُمَّ حَوَالَيْنَا وَلَا عَلَيْنَا، اللَّهُمَّ عَلَى الآكَامِ وَالظِّرَابِ وَبُطُونِ الأَوْدِيَةِ وَمَنَابِتِ الشَّجَرِ',
      transliteration:
        "Allahumma hawalayna wa la 'alayna, Allahumma 'alal-akami wadh-dhirabi wa butunil-awdiyati wa manabitish-shajar.",
      translation:
        'O Allah, around us and not upon us. O Allah, upon the hills and mountains, the valleys and the places where trees grow.',
      benefit: 'Said by the Prophet ﷺ when rain became so heavy that people feared harm.',
      source: 'Sahih al-Bukhari 1014',
    },
  },
  {
    id: 'thunder',
    group: 'sky_and_weather',
    title: 'On hearing thunder',
    prompt: 'Thunder outside.',
    trigger: { weather: ['storm'] },
    imagery: 'rain',
    text: {
      arabic: 'سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ وَالْمَلَائِكَةُ مِنْ خِيفَتِهِ',
      transliteration: "Subhanal-ladhi yusabbihur-ra'du bihamdihi wal-mala'ikatu min khifatih.",
      translation:
        'Glory be to Him whom the thunder glorifies with His praise, and the angels out of fear of Him.',
      benefit: 'Abdullah ibn az-Zubayr would stop talking on hearing thunder and say this.',
      source: 'Muwatta Malik, Book of Speech (2/992); al-Adab al-Mufrad 723',
    },
  },
  {
    id: 'strong-wind',
    group: 'sky_and_weather',
    title: 'When the wind is strong',
    prompt: 'The wind is up.',
    trigger: { weather: ['storm'] },
    imagery: 'none',
    text: {
      arabic:
        'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا فِيهَا وَخَيْرَ مَا أُرْسِلَتْ بِهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا فِيهَا وَشَرِّ مَا أُرْسِلَتْ بِهِ',
      transliteration:
        "Allahumma inni as'aluka khayraha wa khayra ma fiha wa khayra ma ursilat bih, wa a'udhu bika min sharriha wa sharri ma fiha wa sharri ma ursilat bih.",
      translation:
        'O Allah, I ask You for its good, the good within it and the good it was sent with; and I seek refuge in You from its evil, the evil within it and the evil it was sent with.',
      benefit: 'Said by the Prophet ﷺ when a strong wind blew.',
      source: 'Sahih Muslim 899',
    },
  },
  {
    id: 'intense-heat',
    group: 'sky_and_weather',
    title: 'In intense heat',
    prompt: 'A hot one today.',
    trigger: { minTemperatureCelsius: 35 },
    imagery: 'sun',
    text: {
      arabic:
        'إِذَا اشْتَدَّ الْحَرُّ فَأَبْرِدُوا بِالصَّلَاةِ، فَإِنَّ شِدَّةَ الْحَرِّ مِنْ فَيْحِ جَهَنَّمَ',
      transliteration:
        'Idhash-taddal-harru fa-abridu bis-salah, fa-inna shiddatal-harri min fayhi jahannam.',
      translation:
        '“When the heat is intense, delay the (Dhuhr) prayer until it cools, for intense heat is from the exhalation of Hell.”',
      benefit:
        'Not a dua but the guidance of the Prophet ﷺ for a hot day, and a reminder to seek refuge from the Fire. No specific supplication for heat is authentically transmitted.',
      source: 'Sahih al-Bukhari 536',
    },
  },
  {
    id: 'intense-cold',
    group: 'sky_and_weather',
    title: 'In bitter cold',
    prompt: 'Cold out there today.',
    trigger: { maxTemperatureCelsius: 2 },
    imagery: 'none',
    text: {
      arabic:
        'اشْتَكَتِ النَّارُ إِلَى رَبِّهَا فَقَالَتْ: يَا رَبِّ أَكَلَ بَعْضِي بَعْضًا، فَأَذِنَ لَهَا بِنَفَسَيْنِ: نَفَسٍ فِي الشِّتَاءِ وَنَفَسٍ فِي الصَّيْفِ، فَهُوَ أَشَدُّ مَا تَجِدُونَ مِنَ الْحَرِّ وَأَشَدُّ مَا تَجِدُونَ مِنَ الزَّمْهَرِيرِ',
      transliteration:
        "Ishtakatin-naru ila rabbiha faqalat: ya rabbi akala ba'di ba'da, fa-adhina laha binafasayn: nafasin fish-shita'i wa nafasin fis-sayf, fahuwa ashaddu ma tajiduna minal-harri wa ashaddu ma tajiduna minaz-zamharir.",
      translation:
        '“The Fire complained to its Lord: ‘My Lord, part of me is consuming the other.’ So He allowed it two breaths, one in winter and one in summer — and that is the severest heat you feel and the severest cold you feel.”',
      benefit:
        'Not a dua but a reminder from the Prophet ﷺ that bitter cold, like intense heat, points to the Fire and to seeking refuge from it. No specific supplication for cold is authentically transmitted.',
      source: 'Sahih al-Bukhari 537',
    },
  },
  {
    id: 'new-crescent',
    group: 'sky_and_weather',
    title: 'On sighting the new crescent',
    prompt: 'A new moon tonight.',
    trigger: { newMoon: true, timesOfDay: ['evening', 'night'] },
    imagery: 'moon',
    text: {
      arabic:
        'اللَّهُ أَكْبَرُ، اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالأَمْنِ وَالإِيمَانِ، وَالسَّلَامَةِ وَالإِسْلَامِ، وَالتَّوْفِيقِ لِمَا تُحِبُّ رَبَّنَا وَتَرْضَى، رَبُّنَا وَرَبُّكَ اللَّهُ',
      transliteration:
        "Allahu akbar. Allahumma ahillahu 'alayna bil-amni wal-iman, was-salamati wal-islam, wat-tawfiqi lima tuhibbu rabbana wa tarda, rabbuna wa rabbukallah.",
      translation:
        'Allah is the greatest. O Allah, bring this crescent over us with security and faith, safety and Islam, and the ability to do what You love and are pleased with. Our Lord and your Lord is Allah.',
      benefit: 'Said by the Prophet ﷺ on seeing the new crescent.',
      source: 'Jami at-Tirmidhi 3451; Sunan ad-Darimi 1687',
    },
  },
  {
    id: 'clear-night-sky',
    group: 'sky_and_weather',
    title: 'Under a clear night sky',
    prompt: 'Clear skies tonight.',
    trigger: { weather: ['clear'], timesOfDay: ['night'] },
    imagery: 'night',
    text: {
      arabic:
        'إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِأُولِي الْأَلْبَابِ ۝ الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ وَيَتَفَكَّرُونَ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ',
      transliteration:
        "Inna fi khalqis-samawati wal-ardi wakhtilafil-layli wan-nahari la-ayatil-li-ulil-albab. Alladhina yadhkurunallaha qiyamaw-wa qu'udaw-wa 'ala junubihim wa yatafakkaruna fi khalqis-samawati wal-ard: rabbana ma khalaqta hadha batila, subhanaka faqina 'adhaban-nar.",
      translation:
        'Indeed, in the creation of the heavens and the earth and the alternation of night and day are signs for those of understanding — who remember Allah standing, sitting and lying on their sides, and reflect on the creation of the heavens and the earth: “Our Lord, You did not create this in vain. Glory be to You; protect us from the punishment of the Fire.”',
      benefit: 'The Prophet ﷺ recited these ayahs on waking at night and looking up at the sky.',
      source: 'Quran 3:190–191; Sahih al-Bukhari 4569',
    },
  },

  // --- Calendar -------------------------------------------------------------
  {
    id: 'friday',
    group: 'calendar',
    title: 'Friday',
    prompt: "It's Friday.",
    trigger: { weekdays: [5] },
    imagery: 'mosque',
    text: {
      arabic:
        'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
      transliteration:
        "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad, kama sallayta 'ala Ibrahima wa 'ala ali Ibrahim, innaka hamidum-majid. Allahumma barik 'ala Muhammadin wa 'ala ali Muhammad, kama barakta 'ala Ibrahima wa 'ala ali Ibrahim, innaka hamidum-majid.",
      translation:
        'O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious.',
      benefit:
        'The Prophet ﷺ asked for more salutations upon him on Friday: “Send blessings upon me abundantly on Friday, for your blessings are presented to me.”',
      source: 'Sahih al-Bukhari 3370; Sunan Abi Dawud 1047',
    },
  },
  {
    id: 'friday-last-hour',
    group: 'calendar',
    title: 'The last hour of Friday',
    prompt: 'The last hour of Friday is slipping by.',
    trigger: { weekdays: [5], timesOfDay: ['evening'] },
    imagery: 'mosque',
    text: {
      arabic:
        'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
      transliteration:
        "Rabbana atina fid-dunya hasanataw-wa fil-akhirati hasanataw-wa qina 'adhaban-nar.",
      translation:
        'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
      benefit:
        'On Friday there is an hour in which a Muslim who asks Allah for something good is given it; the narration places it in the last hour after Asr. This was the dua the Prophet ﷺ made most often.',
      source: 'Sunan Abi Dawud 1048; Quran 2:201; Sahih al-Bukhari 6389',
    },
  },
  {
    id: 'ramadan-iftar',
    group: 'calendar',
    title: 'Breaking the fast',
    prompt: 'At the moment of iftar.',
    trigger: { hijri: { months: [9] }, timesOfDay: ['evening'] },
    imagery: 'sun',
    text: {
      arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
      transliteration: "Dhahabaz-zama'u wabtallatil-'uruqu wa thabatal-ajru in sha Allah.",
      translation:
        'The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.',
      benefit: 'Said by the Prophet ﷺ when he broke his fast.',
      source: 'Sunan Abi Dawud 2357',
    },
  },
  {
    id: 'laylat-al-qadr',
    group: 'calendar',
    title: 'Laylat al-Qadr',
    prompt: 'These are the nights.',
    trigger: {
      hijri: { months: [9], nights: [21, 23, 25, 27, 29] },
      timesOfDay: ['evening', 'night'],
    },
    imagery: 'night',
    text: {
      arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
      transliteration: "Allahumma innaka 'afuwwun tuhibbul-'afwa fa'fu 'anni.",
      translation: 'O Allah, You are Pardoning and You love to pardon, so pardon me.',
      benefit: 'What the Prophet ﷺ told Aishah to say if she knew which night was Laylat al-Qadr.',
      source: 'Jami at-Tirmidhi 3513; Sunan Ibn Majah 3850',
    },
  },
  {
    id: 'new-hijri-month',
    group: 'calendar',
    title: 'A new Hijri month',
    prompt: 'A new month begins.',
    trigger: { hijri: { days: [1, 2] } },
    imagery: 'moon',
    text: {
      arabic:
        'اللَّهُ أَكْبَرُ، اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالأَمْنِ وَالإِيمَانِ، وَالسَّلَامَةِ وَالإِسْلَامِ، وَالتَّوْفِيقِ لِمَا تُحِبُّ رَبَّنَا وَتَرْضَى، رَبُّنَا وَرَبُّكَ اللَّهُ',
      transliteration:
        "Allahu akbar. Allahumma ahillahu 'alayna bil-amni wal-iman, was-salamati wal-islam, wat-tawfiqi lima tuhibbu rabbana wa tarda, rabbuna wa rabbukallah.",
      translation:
        'Allah is the greatest. O Allah, bring this crescent over us with security and faith, safety and Islam, and the ability to do what You love and are pleased with. Our Lord and your Lord is Allah.',
      benefit:
        'The crescent that opens a new month is greeted with the same words the Prophet ﷺ used for every new moon.',
      source: 'Jami at-Tirmidhi 3451; Sunan ad-Darimi 1687',
    },
  },

  // --- Everyday actions -----------------------------------------------------
  {
    id: 'leaving-home',
    group: 'everyday_actions',
    title: 'Leaving the house',
    prompt: 'Do you know the dua for leaving the house?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
      transliteration: "Bismillah, tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah.",
      translation:
        'In the name of Allah; I place my trust in Allah; there is no might nor power except with Allah.',
      benefit:
        'Whoever says this on leaving his house is told: “You are guided, defended and protected,” and the devil keeps away from him.',
      source: 'Sunan Abi Dawud 5095; Jami at-Tirmidhi 3426',
    },
  },
  {
    id: 'entering-home',
    group: 'everyday_actions',
    title: 'Entering the house',
    prompt: 'Do you know the dua for coming home?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
      transliteration:
        "Bismillahi walajna, wa bismillahi kharajna, wa 'alallahi rabbina tawakkalna.",
      translation:
        'In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we rely.',
      benefit: 'Said on entering the house, followed by greeting those inside with salam.',
      source: 'Sunan Abi Dawud 5096',
    },
  },
  {
    id: 'entering-washroom',
    group: 'everyday_actions',
    title: 'Entering the washroom',
    prompt: 'Do you know the dua for entering the washroom?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',
      transliteration: "Allahumma inni a'udhu bika minal-khubthi wal-khaba'ith.",
      translation: 'O Allah, I seek refuge in You from the male and female devils.',
      benefit: 'Said by the Prophet ﷺ before entering the place of relieving oneself.',
      source: 'Sahih al-Bukhari 142; Sahih Muslim 375',
    },
  },
  {
    id: 'leaving-washroom',
    group: 'everyday_actions',
    title: 'Leaving the washroom',
    prompt: 'Do you know the dua for leaving the washroom?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'غُفْرَانَكَ',
      transliteration: 'Ghufranak.',
      translation: 'I ask You for Your forgiveness.',
      benefit: 'Said by the Prophet ﷺ on coming out.',
      source: 'Sunan Abi Dawud 30; Jami at-Tirmidhi 7',
    },
  },
  {
    id: 'before-wudu',
    group: 'everyday_actions',
    title: 'Before wudu',
    prompt: 'Do you know the words before wudu?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'بِسْمِ اللَّهِ',
      transliteration: 'Bismillah.',
      translation: 'In the name of Allah.',
      benefit: 'Wudu begins with the name of Allah.',
      source: 'Sunan Abi Dawud 101; Sunan Ibn Majah 397',
    },
  },
  {
    id: 'after-wudu',
    group: 'everyday_actions',
    title: 'After wudu',
    prompt: 'Do you know the words after wudu?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
      transliteration:
        "Ash-hadu al-la ilaha illallahu wahdahu la sharika lah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh.",
      translation:
        'I bear witness that none has the right to be worshipped but Allah alone, without partner, and I bear witness that Muhammad is His servant and Messenger.',
      benefit:
        'Whoever performs wudu well and then says this has the eight gates of Paradise opened for him, to enter by whichever he wishes.',
      source: 'Sahih Muslim 234',
    },
  },
  {
    id: 'before-eating',
    group: 'everyday_actions',
    title: 'Before eating',
    prompt: 'Do you know the dua before eating?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'بِسْمِ اللَّهِ',
      transliteration: 'Bismillah.',
      translation: 'In the name of Allah.',
      benefit:
        'The Prophet ﷺ taught: “Say the name of Allah, eat with your right hand, and eat from what is nearest to you.” If it is forgotten at the start, say: “Bismillahi awwalahu wa akhirah” (in the name of Allah, at its beginning and its end).',
      source: 'Sahih al-Bukhari 5376; Sunan Abi Dawud 3767',
    },
  },
  {
    id: 'after-eating',
    group: 'everyday_actions',
    title: 'After eating',
    prompt: 'Do you know the dua after eating?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
      transliteration:
        "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlim-minni wa la quwwah.",
      translation:
        'All praise is for Allah, who fed me this and provided it for me without any might or power on my part.',
      benefit: 'Whoever says this after eating has his past sins forgiven.',
      source: 'Sunan Abi Dawud 4023; Jami at-Tirmidhi 3458',
    },
  },
  {
    id: 'drinking-water',
    group: 'everyday_actions',
    title: 'Drinking water',
    prompt: 'Do you know the words for drinking?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'الْحَمْدُ لِلَّهِ',
      transliteration: 'Alhamdu lillah.',
      translation: 'All praise is for Allah.',
      benefit:
        '“Allah is pleased with a servant who eats a meal and praises Him for it, and takes a drink and praises Him for it.” Begin with Bismillah, drink sitting, and praise Allah after.',
      source: 'Sahih Muslim 2734',
    },
  },
  {
    id: 'wearing-new-clothes',
    group: 'everyday_actions',
    title: 'Wearing new clothes',
    prompt: 'Do you know the dua for new clothes?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ، أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ',
      transliteration:
        "Allahumma lakal-hamdu anta kasawtanih, as'aluka min khayrihi wa khayri ma suni'a lah, wa a'udhu bika min sharrihi wa sharri ma suni'a lah.",
      translation:
        'O Allah, to You is all praise; You have clothed me with it. I ask You for its good and the good of what it was made for, and I seek refuge in You from its evil and the evil of what it was made for.',
      benefit: 'Said by the Prophet ﷺ when he put on a new garment.',
      source: 'Sunan Abi Dawud 4020; Jami at-Tirmidhi 1767',
    },
  },
  {
    id: 'entering-masjid',
    group: 'everyday_actions',
    title: 'Entering the masjid',
    prompt: 'Do you know the dua for entering the masjid?',
    trigger: {},
    imagery: 'mosque',
    text: {
      arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
      transliteration: 'Allahummaf-tah li abwaba rahmatik.',
      translation: 'O Allah, open for me the gates of Your mercy.',
      benefit: 'Said on entering the mosque, right foot first.',
      source: 'Sahih Muslim 713',
    },
  },
  {
    id: 'leaving-masjid',
    group: 'everyday_actions',
    title: 'Leaving the masjid',
    prompt: 'Do you know the dua for leaving the masjid?',
    trigger: {},
    imagery: 'mosque',
    text: {
      arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
      transliteration: "Allahumma inni as'aluka min fadlik.",
      translation: 'O Allah, I ask You of Your bounty.',
      benefit: 'Said on leaving the mosque, left foot first.',
      source: 'Sahih Muslim 713',
    },
  },
  {
    id: 'starting-a-journey',
    group: 'everyday_actions',
    title: 'Setting out on a journey',
    prompt: 'Do you know the dua for travelling?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الأَهْلِ',
      transliteration:
        "Allahu akbar, Allahu akbar, Allahu akbar. Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun. Allahumma inna nas'aluka fi safarina hadhal-birra wat-taqwa, wa minal-'amali ma tarda. Allahumma hawwin 'alayna safarana hadha watwi 'anna bu'dah. Allahumma antas-sahibu fis-safari wal-khalifatu fil-ahl.",
      translation:
        'Allah is the greatest, Allah is the greatest, Allah is the greatest. Glory be to Him who has placed this at our service, for we could never have done it ourselves, and to our Lord we shall return. O Allah, we ask You on this journey of ours for righteousness and piety, and for deeds that please You. O Allah, make this journey easy for us and fold up its distance for us. O Allah, You are the Companion on the journey and the Guardian of the family left behind.',
      benefit: 'Said by the Prophet ﷺ when he had settled on his mount to set out.',
      source: 'Sahih Muslim 1342',
    },
  },
  {
    id: 'riding-a-vehicle',
    group: 'everyday_actions',
    title: 'Riding a vehicle',
    prompt: 'Do you know the words when you board?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ ۝ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ',
      transliteration:
        'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun.',
      translation:
        'Glory be to Him who has placed this at our service, for we could never have done it ourselves, and to our Lord we shall return.',
      benefit:
        'Said on mounting; the Prophet ﷺ said Bismillah as he set foot on the stirrup, then this once seated.',
      source: 'Quran 43:13–14; Sunan Abi Dawud 2602',
    },
  },
  {
    id: 'returning-from-travel',
    group: 'everyday_actions',
    title: 'Returning from travel',
    prompt: 'Do you know the dua for coming back?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ',
      transliteration: "Ayibuna ta'ibuna 'abiduna lirabbina hamidun.",
      translation: 'We return, repentant, worshipping, praising our Lord.',
      benefit:
        'Said by the Prophet ﷺ on returning from a journey, with the takbir on every rise in the road.',
      source: 'Sahih al-Bukhari 1797; Sahih Muslim 1342',
    },
  },
  {
    id: 'entering-market',
    group: 'everyday_actions',
    title: 'Entering the market',
    prompt: 'Do you know the dua for the marketplace?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ وَهُوَ حَيٌّ لَا يَمُوتُ، بِيَدِهِ الْخَيْرُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      transliteration:
        "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, yuhyi wa yumitu wa huwa hayyul-la yamut, biyadihil-khayr, wa huwa 'ala kulli shay'in qadir.",
      translation:
        'None has the right to be worshipped but Allah alone, without partner. His is the dominion and His is the praise. He gives life and causes death, and He is Living and does not die. In His hand is all good, and He is able to do all things.',
      benefit:
        'Whoever says this on entering a market has a million good deeds written for him, a million sins erased, and is raised a million degrees.',
      source: 'Jami at-Tirmidhi 3428',
    },
  },
  {
    id: 'hearing-adhan',
    group: 'everyday_actions',
    title: 'Hearing the adhan',
    prompt: 'Do you know what to say with the adhan?',
    trigger: {},
    imagery: 'mosque',
    text: {
      arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
      transliteration: 'La hawla wa la quwwata illa billah.',
      translation: 'There is no might nor power except with Allah.',
      benefit:
        'Repeat what the muezzin says, except at “come to prayer” and “come to success”, where this is said instead.',
      source: 'Sahih al-Bukhari 611; Sahih Muslim 385',
    },
  },
  {
    id: 'after-adhan',
    group: 'everyday_actions',
    title: 'After the adhan',
    prompt: 'Do you know the dua after the adhan?',
    trigger: {},
    imagery: 'mosque',
    text: {
      arabic:
        'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ',
      transliteration:
        "Allahumma rabba hadhihid-da'watit-tammah, was-salatil-qa'imah, ati Muhammadanil-wasilata wal-fadilah, wab'ath-hu maqamam-mahmudanil-ladhi wa'adtah.",
      translation:
        'O Allah, Lord of this perfect call and the prayer about to be established, grant Muhammad the intermediary position and the excellence, and raise him to the praised station You have promised him.',
      benefit:
        'Whoever says this after the adhan will have the intercession of the Prophet ﷺ on the Day of Resurrection.',
      source: 'Sahih al-Bukhari 614',
    },
  },
  {
    id: 'sneezing',
    group: 'everyday_actions',
    title: 'When you sneeze',
    prompt: 'Do you know what to say when you sneeze?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'الْحَمْدُ لِلَّهِ',
      transliteration: 'Alhamdu lillah.',
      translation: 'All praise is for Allah.',
      benefit:
        'The one who sneezes says this; the one who hears replies “Yarhamukallah” (may Allah have mercy on you), and the first answers “Yahdikumullahu wa yuslihu balakum” (may Allah guide you and set your affairs right).',
      source: 'Sahih al-Bukhari 6224',
    },
  },
  {
    id: 'visiting-the-sick',
    group: 'everyday_actions',
    title: 'Visiting someone unwell',
    prompt: 'Do you know the dua for visiting the sick?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ',
      transliteration: "As'alullahal-'azima rabbal-'arshil-'azimi ay-yashfiyak.",
      translation: 'I ask Allah the Mighty, Lord of the mighty Throne, to cure you.',
      benefit:
        'Said seven times at the bedside of someone unwell; the Prophet ﷺ also said “No harm — a purification, if Allah wills.”',
      source: 'Sunan Abi Dawud 3106; Jami at-Tirmidhi 2083; Sahih al-Bukhari 3616',
    },
  },
  {
    id: 'looking-in-mirror',
    group: 'everyday_actions',
    title: 'Looking in the mirror',
    prompt: 'Do you know the words for the mirror?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'اللَّهُمَّ كَمَا حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي',
      transliteration: 'Allahumma kama hassanta khalqi fahassin khuluqi.',
      translation: 'O Allah, as You have made my form good, make my character good.',
      benefit:
        'A supplication of the Prophet ﷺ, from the narration of Ibn Mas‘ud; the link to the mirror specifically is from a weaker report, so it is offered here simply as a fitting moment for the words.',
      source:
        'Sahih Ibn Hibban 959; Musnad Ahmad 3823; graded sahih by al-Albani (Sahih al-Jami 1307)',
    },
  },

  // --- States of the heart --------------------------------------------------
  {
    id: 'anger',
    group: 'states_of_heart',
    title: 'When angry',
    prompt: 'Do you know what to say in anger?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
      transliteration: "A'udhu billahi minash-shaytanir-rajim.",
      translation: 'I seek refuge in Allah from the accursed devil.',
      benefit:
        'The Prophet ﷺ said of a man in a rage: “I know a word which, if he said it, what he feels would leave him.”',
      source: 'Sahih al-Bukhari 3282; Sahih Muslim 2610',
    },
  },
  {
    id: 'anxiety-and-grief',
    group: 'states_of_heart',
    title: 'In worry or grief',
    prompt: 'There are words for a heavy heart.',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
      transliteration:
        "Allahumma inni a'udhu bika minal-hammi wal-hazan, wal-'ajzi wal-kasal, wal-bukhli wal-jubn, wa dala'id-dayni wa ghalabatir-rijal.",
      translation:
        'O Allah, I seek refuge in You from worry and grief, from incapacity and laziness, from miserliness and cowardice, from the burden of debt and from being overpowered by men.',
      benefit: 'A dua the Prophet ﷺ made often.',
      source: 'Sahih al-Bukhari 6369',
    },
  },
  {
    id: 'burdened-by-debt',
    group: 'states_of_heart',
    title: 'Weighed down by debt',
    prompt: 'There are words for this weight.',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ',
      transliteration: "Allahummak-fini bihalalika 'an haramik, wa aghnini bifadlika 'amman siwak.",
      translation:
        'O Allah, suffice me with what You have made lawful against what You have forbidden, and make me independent, by Your bounty, of everyone besides You.',
      benefit:
        'Taught by the Prophet ﷺ to a man who said his debt was as great as a mountain: “Say this, and Allah will settle it for you.”',
      source: 'Jami at-Tirmidhi 3563',
    },
  },
  {
    id: 'a-difficult-task',
    group: 'states_of_heart',
    title: 'Facing something difficult',
    prompt: 'Something hard ahead?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
      transliteration:
        "Allahumma la sahla illa ma ja'altahu sahla, wa anta taj'alul-hazna idha shi'ta sahla.",
      translation:
        'O Allah, nothing is easy except what You make easy, and You make the difficult easy when You will.',
      benefit: 'Said when facing something hard.',
      source: 'Sahih Ibn Hibban 974 (2427)',
    },
  },
  {
    id: 'seeking-forgiveness',
    group: 'states_of_heart',
    title: 'Seeking forgiveness',
    prompt: 'A moment for istighfar.',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
      transliteration:
        "Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana 'abduk, wa ana 'ala 'ahdika wa wa'dika mas-tata't, a'udhu bika min sharri ma sana't, abu'u laka bini'matika 'alayy, wa abu'u bidhanbi faghfir li fa-innahu la yaghfirudh-dhunuba illa ant.",
      translation:
        'O Allah, You are my Lord; none has the right to be worshipped but You. You created me and I am Your servant, and I keep Your covenant and promise as far as I am able. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me, and I acknowledge my sin, so forgive me, for none forgives sins but You.',
      benefit:
        'The master supplication for forgiveness: whoever says it with conviction in the evening and dies that night, or in the morning and dies that day, enters Paradise.',
      source: 'Sahih al-Bukhari 6306',
    },
  },
  {
    id: 'gratitude',
    group: 'states_of_heart',
    title: 'On good news',
    prompt: 'Something good happened?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic: 'الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
      transliteration: "Alhamdu lillahil-ladhi bini'matihi tatimmus-salihat.",
      translation: 'All praise is for Allah, by whose favour good things are completed.',
      benefit: 'What the Prophet ﷺ said when something he liked came to him.',
      source: 'Sunan Ibn Majah 3803',
    },
  },
  {
    id: 'bad-dream',
    group: 'states_of_heart',
    title: 'After a bad dream',
    prompt: 'There are words for a troubled night.',
    trigger: { timesOfDay: ['night'] },
    imagery: 'night',
    text: {
      arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ وَمِنْ شَرِّ مَا رَأَيْتُ',
      transliteration: "A'udhu billahi minash-shaytanir-rajimi wa min sharri ma ra'ayt.",
      translation:
        'I seek refuge in Allah from the accursed devil and from the evil of what I saw.',
      benefit:
        'After a bad dream: spit lightly to the left three times, seek refuge in Allah from its evil, turn over to the other side, and do not tell anyone about it. It will not harm you.',
      source: 'Sahih Muslim 2261; Sahih Muslim 2262',
    },
  },
  {
    id: 'fear-at-night',
    group: 'states_of_heart',
    title: 'Fear at night',
    prompt: 'There are words for the dark.',
    trigger: { timesOfDay: ['night'] },
    imagery: 'night',
    text: {
      arabic:
        'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ غَضَبِهِ وَعِقَابِهِ، وَشَرِّ عِبَادِهِ، وَمِنْ هَمَزَاتِ الشَّيَاطِينِ وَأَنْ يَحْضُرُونِ',
      transliteration:
        "A'udhu bikalimatillahit-tammati min ghadabihi wa 'iqabih, wa sharri 'ibadih, wa min hamazatish-shayatini wa ay-yahdurun.",
      translation:
        'I seek refuge in the perfect words of Allah from His anger and His punishment, from the evil of His servants, and from the whisperings of the devils and their presence.',
      benefit: 'Taught by the Prophet ﷺ for fear and sleeplessness at night.',
      source: 'Sunan Abi Dawud 3893; Jami at-Tirmidhi 3528',
    },
  },

  // --- Prayer ---------------------------------------------------------------
  {
    id: 'after-fard-prayer',
    group: 'prayer',
    title: 'After an obligatory prayer',
    prompt: 'The words after salah.',
    trigger: {},
    imagery: 'mosque',
    text: {
      arabic:
        'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالإِكْرَامِ',
      transliteration:
        'Astaghfirullah, astaghfirullah, astaghfirullah. Allahumma antas-salamu wa minkas-salam, tabarakta ya dhal-jalali wal-ikram.',
      translation:
        'I seek the forgiveness of Allah (three times). O Allah, You are Peace and from You is peace; blessed are You, Possessor of majesty and honour.',
      benefit: 'What the Prophet ﷺ said as soon as he finished the prayer.',
      source: 'Sahih Muslim 591',
    },
  },
  {
    id: 'between-adhan-and-iqamah',
    group: 'prayer',
    title: 'Between adhan and iqamah',
    prompt: 'This is a moment when dua is answered.',
    trigger: {},
    imagery: 'mosque',
    text: {
      arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
      transliteration: "Allahumma inni as'alukal-'afwa wal-'afiyata fid-dunya wal-akhirah.",
      translation: 'O Allah, I ask You for pardon and well-being in this world and the Hereafter.',
      benefit:
        '“The supplication between the adhan and the iqamah is not rejected.” Asked what to ask for, the Prophet ﷺ said: “Ask Allah for well-being in this world and the Hereafter.”',
      source: 'Sunan Abi Dawud 521; Jami at-Tirmidhi 3594; Sunan Ibn Majah 3871',
    },
  },
  {
    id: 'tahajjud',
    group: 'prayer',
    title: 'In the last third of the night',
    prompt: 'The quietest hours.',
    trigger: { timesOfDay: ['night'] },
    imagery: 'night',
    text: {
      arabic:
        'اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ قَيِّمُ السَّمَاوَاتِ وَالأَرْضِ وَمَنْ فِيهِنَّ، وَلَكَ الْحَمْدُ لَكَ مُلْكُ السَّمَاوَاتِ وَالأَرْضِ وَمَنْ فِيهِنَّ، وَلَكَ الْحَمْدُ أَنْتَ نُورُ السَّمَاوَاتِ وَالأَرْضِ، وَلَكَ الْحَمْدُ أَنْتَ الْحَقُّ وَوَعْدُكَ الْحَقُّ',
      transliteration:
        "Allahumma lakal-hamdu anta qayyimus-samawati wal-ardi wa man fihinn, wa lakal-hamdu laka mulkus-samawati wal-ardi wa man fihinn, wa lakal-hamdu anta nurus-samawati wal-ard, wa lakal-hamdu antal-haqqu wa wa'dukal-haqq.",
      translation:
        'O Allah, to You is all praise; You are the Sustainer of the heavens and the earth and all within them. To You is all praise; Yours is the dominion of the heavens and the earth and all within them. To You is all praise; You are the Light of the heavens and the earth. To You is all praise; You are the Truth, and Your promise is true.',
      benefit:
        'The opening of the Prophet’s ﷺ night prayer. In the last third of every night Allah says: “Who calls on Me, that I may answer him? Who asks of Me, that I may give him?”',
      source: 'Sahih al-Bukhari 1120; Sahih al-Bukhari 1145',
    },
  },
  {
    id: 'istikhara',
    group: 'prayer',
    title: 'Seeking guidance (istikhara)',
    prompt: 'A decision to make?',
    trigger: {},
    imagery: 'none',
    text: {
      arabic:
        'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ، اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِي الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ',
      transliteration:
        "Allahumma inni astakhiruka bi'ilmik, wa astaqdiruka biqudratik, wa as'aluka min fadlikal-'azim, fa-innaka taqdiru wa la aqdir, wa ta'lamu wa la a'lam, wa anta 'allamul-ghuyub. Allahumma in kunta ta'lamu anna hadhal-amra khayrul-li fi dini wa ma'ashi wa 'aqibati amri faqdurhu li wa yassirhu li thumma barik li fih. Wa in kunta ta'lamu anna hadhal-amra sharrul-li fi dini wa ma'ashi wa 'aqibati amri fasrifhu 'anni wasrifni 'anh, waqdur liyal-khayra haythu kana thumma ardini bih.",
      translation:
        'O Allah, I seek Your guidance through Your knowledge, and I seek ability through Your power, and I ask You of Your great bounty; for You are able and I am not, You know and I do not, and You are the Knower of the unseen. O Allah, if You know this matter to be good for me in my religion, my livelihood and the outcome of my affairs, then decree it for me, make it easy for me and bless me in it. And if You know this matter to be bad for me in my religion, my livelihood and the outcome of my affairs, then turn it away from me and turn me away from it, and decree for me the good wherever it may be, then make me content with it.',
      benefit:
        'Prayed after two units of voluntary prayer when a decision has to be made. Name the matter in place of “this matter”.',
      source: 'Sahih al-Bukhari 1162',
    },
  },

  // --- Protective ayahs -----------------------------------------------------
  {
    id: 'ayat-al-kursi',
    group: 'protective_ayahs',
    title: 'Ayat al-Kursi',
    prompt: 'One ayah before you sleep.',
    trigger: { timesOfDay: ['night'] },
    imagery: 'night',
    text: {
      arabic:
        'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
      transliteration:
        "Allahu la ilaha illa huwal-hayyul-qayyum. La ta'khudhuhu sinatuw-wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhal-ladhi yashfa'u 'indahu illa bi-idhnih. Ya'lamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bishay'im-min 'ilmihi illa bima sha'. Wasi'a kursiyyuhus-samawati wal-ard, wa la ya'uduhu hifzuhuma, wa huwal-'aliyyul-'azim.",
      translation:
        'Allah — there is no god but He, the Ever-Living, the Sustainer of all. Neither drowsiness nor sleep overtakes Him. To Him belongs whatever is in the heavens and whatever is on the earth. Who can intercede with Him except by His permission? He knows what is before them and what is behind them, and they encompass nothing of His knowledge except what He wills. His Kursi extends over the heavens and the earth, and guarding them does not weary Him. He is the Most High, the Most Great.',
      benefit:
        'Whoever recites it when going to bed has a guardian from Allah over him, and no devil comes near him until morning.',
      source: 'Quran 2:255; Sahih al-Bukhari 2311',
    },
  },
  {
    id: 'three-quls',
    group: 'protective_ayahs',
    title: 'The three Quls',
    prompt: 'Three short surahs, morning and evening.',
    trigger: { timesOfDay: ['morning', 'evening'] },
    imagery: 'dawn',
    text: {
      arabic:
        'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
      transliteration:
        'Qul huwallahu ahad. Allahus-samad. Lam yalid wa lam yulad. Wa lam yakul-lahu kufuwan ahad.',
      translation:
        'Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, and there is none comparable to Him. — Then Surah al-Falaq (113) and Surah an-Nas (114).',
      benefit:
        'Recite the three Quls three times in the morning and three times in the evening, and they suffice you against everything.',
      source: 'Quran 112, 113, 114; Sunan Abi Dawud 5082; Jami at-Tirmidhi 3575',
    },
  },
  {
    id: 'last-two-ayahs-baqarah',
    group: 'protective_ayahs',
    title: 'The last two ayahs of al-Baqarah',
    prompt: 'Two ayahs are enough for the night.',
    trigger: { timesOfDay: ['night'] },
    imagery: 'night',
    text: {
      arabic:
        'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ۝ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ',
      transliteration:
        "Amanar-rasulu bima unzila ilayhi mir-rabbihi wal-mu'minun. Kullun amana billahi wa mala'ikatihi wa kutubihi wa rusulih, la nufarriqu bayna ahadim-mir-rusulih. Wa qalu sami'na wa ata'na, ghufranaka rabbana wa ilaykal-masir. La yukallifullahu nafsan illa wus'aha. Laha ma kasabat wa 'alayha mak-tasabat. Rabbana la tu'akhidhna in-nasina aw akhta'na. Rabbana wa la tahmil 'alayna isran kama hamaltahu 'alal-ladhina min qablina. Rabbana wa la tuhammilna ma la taqata lana bih. Wa'fu 'anna waghfir lana warhamna. Anta mawlana fansurna 'alal-qawmil-kafirin.",
      translation:
        'The Messenger has believed in what was revealed to him from his Lord, and so have the believers. All of them believe in Allah, His angels, His books and His messengers: “We make no distinction between any of His messengers.” And they say: “We hear and we obey. Your forgiveness, our Lord, and to You is the return.” Allah does not burden a soul beyond what it can bear. It has what it has earned, and against it is what it has earned. “Our Lord, do not take us to task if we forget or make a mistake. Our Lord, do not lay upon us a burden like that which You laid upon those before us. Our Lord, do not burden us with what we have no strength to bear. Pardon us, forgive us and have mercy on us. You are our Protector, so give us victory over the disbelieving people.”',
      benefit: 'Whoever recites the last two ayahs of Surah al-Baqarah at night, they suffice him.',
      source: 'Quran 2:285–286; Sahih al-Bukhari 5009',
    },
  },
  {
    id: 'surah-al-mulk',
    group: 'protective_ayahs',
    title: 'Surah al-Mulk',
    prompt: 'The surah of the night.',
    trigger: { timesOfDay: ['night'] },
    imagery: 'night',
    text: {
      arabic: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
      transliteration: "Tabarakal-ladhi biyadihil-mulku wa huwa 'ala kulli shay'in qadir.",
      translation:
        'Blessed is He in whose hand is the dominion, and He is able to do all things. (The opening of Surah al-Mulk; read the whole surah in the reader.)',
      benefit:
        'A surah of thirty ayahs that intercedes for its reader until he is forgiven; the Prophet ﷺ would not sleep until he had recited it.',
      source: 'Quran 67; Jami at-Tirmidhi 2891; Jami at-Tirmidhi 2892',
    },
  },
  {
    id: 'surah-al-kahf',
    group: 'protective_ayahs',
    title: 'Surah al-Kahf on Friday',
    prompt: "It's Friday — al-Kahf is waiting.",
    trigger: { weekdays: [5] },
    imagery: 'mosque',
    text: {
      arabic:
        'الْحَمْدُ لِلَّهِ الَّذِي أَنزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ وَلَمْ يَجْعَل لَّهُ عِوَجًا',
      transliteration:
        "Alhamdu lillahil-ladhi anzala 'ala 'abdihil-kitaba wa lam yaj'al-lahu 'iwaja.",
      translation:
        'All praise is for Allah, who sent down the Book upon His servant and placed no crookedness in it. (The opening of Surah al-Kahf; read the whole surah in the reader.)',
      benefit:
        'Whoever reads Surah al-Kahf on Friday has a light shining for him until the next Friday, and its first ten ayahs are a protection from the Dajjal.',
      source:
        'Quran 18; al-Hakim 2/368 (graded sahih by al-Albani, Sahih al-Jami 6470); Sahih Muslim 809',
    },
  },
];

/**
 * Whether an occasion has real words yet, as opposed to the stub.
 *
 * This is the production safeguard. The catalogue ships with placeholders so
 * the machinery can be built and tested, but a placeholder must never reach a
 * user: a notification leading to a screen reading "Allah — Placeholder text"
 * is worse than no notification at all.
 */
export function hasRealContent(occasion: DuaOccasion): boolean {
  return occasion.text.arabic !== PLACEHOLDER_ARABIC;
}

/**
 * The occasions that are actually showable.
 *
 * Everything downstream selects from this, never from the raw catalogue, so
 * the feature switches itself on occasion by occasion as content lands rather
 * than needing a release to flip. While it is empty, no dua is ever scheduled
 * and the settings section stays hidden.
 */
export function readyOccasions(): DuaOccasion[] {
  return duaCatalogue.filter(hasRealContent);
}

/** True once at least one occasion has real words. Gates the settings UI. */
export function isDuaCatalogueReady(): boolean {
  return duaCatalogue.some(hasRealContent);
}

/** Lookup by id, for routes and notification payloads. */
export function findOccasion(id: string): DuaOccasion | undefined {
  return duaCatalogue.find((occasion) => occasion.id === id);
}
