import { useLocalSearchParams } from 'expo-router';

import { ReaderScreen } from '@/features/reader/screens/ReaderScreen';
import { quranStructure } from '@/config/quran';

export default function PageRoute() {
  const params = useLocalSearchParams<{ pageId: string }>();
  const parsed = Number(params.pageId);

  const pageNumber =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= quranStructure.pageCount ? parsed : 1;

  return <ReaderScreen source={{ kind: 'page', pageNumber }} />;
}
