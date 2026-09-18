/**
 * Query key factory.
 *
 * Every cache key in the app is built here. Centralising them means
 * invalidation is precise — `queryKeys.quran.all` invalidates all Quran
 * content and nothing else — and makes it impossible for two call sites to
 * cache the same data under different keys.
 *
 * Keys are hierarchical: ['quran', 'verses', chapterId, params] so a prefix
 * invalidation cascades exactly as far as intended.
 */
import type { VerseKey } from '@/features/quran/types/quran.types';

export interface VerseQueryScope {
  translationIds: number[];
  includeWords: boolean;
  language: string;
}

export const queryKeys = {
  quran: {
    all: ['quran'] as const,
    chapters: (language: string) => ['quran', 'chapters', language] as const,
    chapter: (chapterId: number, language: string) =>
      ['quran', 'chapter', chapterId, language] as const,
    juzs: () => ['quran', 'juzs'] as const,
    verses: (chapterId: number, scope: VerseQueryScope) =>
      ['quran', 'verses', 'chapter', chapterId, scope] as const,
    versesByJuz: (juzNumber: number, scope: VerseQueryScope) =>
      ['quran', 'verses', 'juz', juzNumber, scope] as const,
    versesByPage: (pageNumber: number, scope: VerseQueryScope) =>
      ['quran', 'verses', 'page', pageNumber, scope] as const,
    verse: (verseKey: VerseKey, scope: VerseQueryScope) =>
      ['quran', 'verse', verseKey, scope] as const,
    tafsir: (tafsirId: number, verseKey: VerseKey) =>
      ['quran', 'tafsir', tafsirId, verseKey] as const,
    search: (query: string, language: string) => ['quran', 'search', query, language] as const,
    translationResources: (language: string) =>
      ['quran', 'resources', 'translations', language] as const,
    tafsirResources: (language: string) => ['quran', 'resources', 'tafsirs', language] as const,
    reciterResources: (language: string) => ['quran', 'resources', 'reciters', language] as const,
  },

  audio: {
    all: ['audio'] as const,
    chapterRecitation: (recitationId: number, chapterId: number) =>
      ['audio', 'chapter', recitationId, chapterId] as const,
    ayahRecitation: (recitationId: number, verseKey: VerseKey) =>
      ['audio', 'ayah', recitationId, verseKey] as const,
  },

  habit: {
    all: ['habit'] as const,
    streak: (userId: string) => ['habit', 'streak', userId] as const,
    today: (userId: string, localDate: string) => ['habit', 'today', userId, localDate] as const,
    calendar: (userId: string, month: string) => ['habit', 'calendar', userId, month] as const,
    goal: (userId: string) => ['habit', 'goal', userId] as const,
    achievements: (userId: string) => ['habit', 'achievements', userId] as const,
    sessions: (userId: string) => ['habit', 'sessions', userId] as const,
  },

  library: {
    all: ['library'] as const,
    bookmarks: (userId: string) => ['library', 'bookmarks', userId] as const,
    bookmark: (userId: string, verseKey: VerseKey) =>
      ['library', 'bookmark', userId, verseKey] as const,
    collections: (userId: string) => ['library', 'collections', userId] as const,
    notes: (userId: string) => ['library', 'notes', userId] as const,
    note: (userId: string, verseKey: VerseKey) => ['library', 'note', userId, verseKey] as const,
    readingPosition: (userId: string) => ['library', 'position', userId] as const,
  },

  dailyAyah: {
    forDate: (localDate: string) => ['dailyAyah', localDate] as const,
  },

  preferences: {
    all: ['preferences'] as const,
    app: (userId: string) => ['preferences', 'app', userId] as const,
    quran: (userId: string) => ['preferences', 'quran', userId] as const,
    reminders: (userId: string) => ['preferences', 'reminders', userId] as const,
    notifications: (userId: string) => ['preferences', 'notifications', userId] as const,
    prayer: (userId: string) => ['preferences', 'prayer', userId] as const,
  },

  platform: {
    featureFlags: () => ['platform', 'featureFlags'] as const,
    announcements: (locale: string) => ['platform', 'announcements', locale] as const,
  },

  prayer: {
    times: (latitude: number, longitude: number, date: string, method: string) =>
      ['prayer', 'times', latitude, longitude, date, method] as const,
  },

  weather: {
    current: (latitude: number, longitude: number) =>
      ['weather', 'current', latitude, longitude] as const,
  },
} as const;
