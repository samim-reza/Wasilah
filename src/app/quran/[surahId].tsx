/**
 * Surah reader route.
 *
 * `?ayah=` carries a deep-link target from a notification, a bookmark or the
 * "continue reading" card.
 */
import { useLocalSearchParams } from 'expo-router';

import { ReaderScreen } from '@/features/reader/screens/ReaderScreen';
import { quranStructure } from '@/config/quran';

export default function SurahRoute() {
  const params = useLocalSearchParams<{ surahId: string; ayah?: string }>();

  const surahId = Number(params.surahId);
  const ayah = params.ayah ? Number(params.ayah) : undefined;

  // A malformed or out-of-range id can arrive from a hand-edited deep link;
  // falling back to Al-Fatihah is friendlier than an error screen.
  const chapterId =
    Number.isFinite(surahId) && surahId >= 1 && surahId <= quranStructure.chapterCount
      ? surahId
      : 1;

  return (
    <ReaderScreen
      source={{ kind: 'chapter', chapterId }}
      initialVerseNumber={Number.isFinite(ayah) ? ayah : undefined}
    />
  );
}
