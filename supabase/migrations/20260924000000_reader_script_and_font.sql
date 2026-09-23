-- Script and typeface choices for the reader, synced with the account.
--
-- `arabic_script` selects which TEXT the Quran is fetched in — Uthmani,
-- IndoPak or Imlaei are different orthographies served by the Quran
-- Foundation API, not different fonts. `arabic_font` selects the bundled face
-- it is drawn in. They are independent: a reader may want IndoPak text in a
-- Naskh face, or Uthmani text in Nastaliq.
--
-- Stored as text with a check rather than an enum, so adding a script or a
-- face later is a constraint change rather than a type migration.

alter table public.user_quran_preferences
  add column arabic_script text not null default 'uthmani'
    check (arabic_script in ('uthmani', 'indopak', 'imlaei')),
  add column arabic_font text not null default 'AmiriQuran'
    check (arabic_font in ('AmiriQuran', 'Amiri', 'ScheherazadeNew', 'NotoNaskhArabic', 'NotoNastaliqUrdu'));
