-- ---------------------------------------------------------------------------
-- Local development seed.
--
-- Contains no Quran content. Quran text, translations, tafsir and recitations
-- come from the Quran Foundation API at runtime and are never copied into this
-- database — doing so would breach the developer terms and would create a
-- second, unversioned source of scripture.
--
-- Only feature flags, notification copy and a sample curated ayah live here.
-- ---------------------------------------------------------------------------

insert into public.feature_flags (key, enabled, rollout_percentage, description) values
  ('weather_notifications', false, 0,   'Contextual reminders influenced by local weather'),
  ('prayer_notifications',  true,  100, 'Reminders anchored to calculated prayer times'),
  ('ai_assistant',          false, 0,   'Ask about this ayah — off until sourcing is in place'),
  ('mushaf_mode',           false, 0,   'Full-page Mushaf rendering; needs licensed page imagery'),
  ('word_by_word',          true,  100, 'Word-by-word translation in the reader'),
  ('tafsir',                true,  100, 'Tafsir tab on the ayah sheet'),
  ('smart_reminders',       true,  100, 'Adaptive reminder timing'),
  ('share_cards',           true,  100, 'Shareable ayah images')
on conflict (key) do nothing;

-- Notification copy. The app ships a local fallback for every key, so these
-- rows exist to allow wording changes without an app release.
insert into public.notification_templates (key, locale, category, title, body, route) values
  ('dailyReminder', 'en', 'daily_reminder',
   'Your daily ayah is waiting', 'A moment with the Quran is enough.',
   '/(tabs)/home?focus=todays-ayah'),

  ('dailyReminder', 'bn', 'daily_reminder',
   'আজকের আয়াত অপেক্ষা করছে', 'কুরআনের সাথে এক মুহূর্তই যথেষ্ট।',
   '/(tabs)/home?focus=todays-ayah'),

  ('streakReminder', 'en', 'streak_reminder',
   'Your streak is waiting', 'One ayah keeps it going.',
   '/(tabs)/home?focus=todays-ayah'),

  ('streakReminder', 'bn', 'streak_reminder',
   'আপনার ধারা অপেক্ষা করছে', 'একটি আয়াতেই তা টিকে থাকবে।',
   '/(tabs)/home?focus=todays-ayah')
on conflict (key, locale) do nothing;

-- A single example curated selection, so the daily-ayah function has something
-- to return in local development. Ayat al-Kursi is a well-known reference point
-- and is present in the Quran Foundation pre-live dataset (surah 2).
insert into public.daily_ayah_selections (selection_date, verse_key, chapter_id, verse_number)
values (current_date, '2:255', 2, 255)
on conflict (selection_date) do nothing;
