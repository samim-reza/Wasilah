import { useLocalSearchParams } from 'expo-router';

import { ReaderScreen } from '@/features/reader/screens/ReaderScreen';
import { quranStructure } from '@/config/quran';

export default function JuzRoute() {
  const params = useLocalSearchParams<{ juzId: string }>();
  const parsed = Number(params.juzId);

  const juzNumber =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= quranStructure.juzCount ? parsed : 1;

  return <ReaderScreen source={{ kind: 'juz', juzNumber }} />;
}
