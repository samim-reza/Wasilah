/**
 * Database types.
 *
 * Hand-maintained to mirror `supabase/migrations`. Regenerate with
 * `npm run db:types` once a local Supabase stack is running; until then, any
 * change to a migration must be reflected here in the same commit.
 */

export type GoalUnit = 'ayahs' | 'pages' | 'minutes' | 'rukus';
export type SessionSource = 'reader' | 'daily_ayah' | 'audio' | 'search';
export type NotificationCategory =
  | 'daily_reminder'
  | 'goal_reminder'
  | 'streak_reminder'
  | 'todays_ayah'
  | 'prayer_reminder'
  | 'weather_reminder'
  | 'announcement';
export type NotificationOutcome = 'sent' | 'delivered' | 'opened' | 'dismissed' | 'failed';
export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type ReminderOffsetDirection = 'before' | 'after';
export type DevicePlatform = 'ios' | 'android' | 'web';
export type ReadingModeValue = 'translation' | 'arabic_only' | 'mushaf';
export type ThemePreferenceValue = 'light' | 'dark' | 'system';

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferencesRow = {
  user_id: string;
  theme: ThemePreferenceValue;
  locale: string;
  analytics_opt_in: boolean;
  crash_reports_opt_in: boolean;
  haptics_enabled: boolean;
  reduce_motion: boolean;
  keep_screen_awake_while_reading: boolean;
  created_at: string;
  updated_at: string;
};

export type UserQuranPreferencesRow = {
  user_id: string;
  translation_ids: number[];
  tafsir_id: number | null;
  recitation_id: number;
  arabic_font_size: number;
  translation_font_size: number;
  show_translation: boolean;
  show_word_by_word: boolean;
  mode: ReadingModeValue;
  playback_rate: number;
  created_at: string;
  updated_at: string;
};

export type ReminderPreferencesRow = {
  user_id: string;
  daily_reminder_enabled: boolean;
  /** 'HH:MM:SS' in the user's local time. */
  daily_reminder_time: string;
  streak_reminder_enabled: boolean;
  goal_reminder_enabled: boolean;
  todays_ayah_enabled: boolean;
  prayer_reminders_enabled: boolean;
  weather_reminders_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_notifications_per_day: number;
  min_minutes_between_notifications: number;
  adaptive_frequency_enabled: boolean;
  dua_reminders_enabled: boolean;
  sleep_dua_enabled: boolean;
  /** 'HH:MM:SS' in the user's local time. */
  sleep_time: string;
  created_at: string;
  updated_at: string;
};

export type NotificationPreferencesRow = {
  user_id: string;
  push_enabled: boolean;
  disabled_categories: NotificationCategory[];
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PrayerReminderRuleRow = {
  id: string;
  user_id: string;
  prayer: PrayerName;
  direction: ReminderOffsetDirection;
  offset_minutes: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PrayerSettingsRow = {
  user_id: string;
  calculation_method: string;
  madhab: 'shafi' | 'hanafi';
  high_latitude_rule: string;
  latitude: number | null;
  longitude: number | null;
  city_label: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalRow = {
  user_id: string;
  goal_unit: GoalUnit;
  goal_amount: number;
  minimum_unit: GoalUnit;
  minimum_amount: number;
  created_at: string;
  updated_at: string;
};

export type ReadingSessionRow = {
  id: string;
  user_id: string;
  client_session_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  chapter_id: number | null;
  start_verse: number | null;
  end_verse: number | null;
  verses_read: number;
  pages_read: number;
  source: SessionSource;
  local_date: string;
  timezone: string;
  created_at: string;
};

export type DailyProgressRow = {
  user_id: string;
  /** 'YYYY-MM-DD' in the user's local timezone. */
  local_date: string;
  verses_read: number;
  seconds_read: number;
  pages_read: number;
  rukus_read: number;
  minimum_met: boolean;
  goal_met: boolean;
  first_activity_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StreakRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  total_active_days: number;
  total_verses_read: number;
  total_seconds_read: number;
  streak_started_on: string | null;
  updated_at: string;
};

export type AchievementRow = {
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
};

export type BookmarkCollectionRow = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BookmarkRow = {
  id: string;
  user_id: string;
  verse_key: string;
  chapter_id: number;
  verse_number: number;
  collection_id: string | null;
  created_at: string;
};

export type NoteRow = {
  id: string;
  user_id: string;
  verse_key: string;
  chapter_id: number;
  verse_number: number;
  body: string;
  created_at: string;
  updated_at: string;
};

export type ReadingPositionRow = {
  user_id: string;
  chapter_id: number;
  verse_number: number;
  verse_key: string;
  updated_at: string;
};

export type ReadingHistoryRow = {
  id: string;
  user_id: string;
  chapter_id: number;
  verse_number: number;
  verse_key: string;
  local_date: string;
  read_at: string;
};

export type PushTokenRow = {
  id: string;
  user_id: string;
  token: string;
  platform: DevicePlatform;
  device_id: string | null;
  app_version: string | null;
  timezone: string;
  invalidated_at: string | null;
  created_at: string;
  last_seen_at: string;
};

export type NotificationHistoryRow = {
  id: string;
  user_id: string;
  category: NotificationCategory;
  template_key: string;
  outcome: NotificationOutcome;
  local_date: string;
  sent_at: string;
  opened_at: string | null;
  dismissed_at: string | null;
  route: string | null;
  variables: Record<string, string | number>;
  dedupe_key: string | null;
  created_at: string;
};

export type NotificationTemplateRow = {
  key: string;
  locale: string;
  category: NotificationCategory;
  title: string;
  body: string;
  route: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  rollout_percentage: number;
  description: string | null;
  updated_at: string;
};

export type DailyAyahSelectionRow = {
  selection_date: string;
  verse_key: string;
  chapter_id: number;
  verse_number: number;
  curator_note: string | null;
  created_at: string;
};

export type AppAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  locale: string;
  min_app_version: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

/** Shape returned by the `record_reading_session` RPC. */
export type RecordReadingSessionResult = {
  /** False when the session was already recorded — an idempotent replay. */
  recorded: boolean;
  day: DailyProgressRow;
  streak: StreakRow;
};

/**
 * NOTE: every type in this file is a `type` alias, never an `interface`.
 * postgrest-js constrains Row/Insert/Update to `Record<string, unknown>`, and
 * TypeScript gives implicit index signatures to type aliases but not to
 * interfaces. Declaring these as interfaces makes the schema silently fail the
 * constraint, at which point every query result degrades to `never` with no
 * error pointing at the cause.
 */

/** Helper so table definitions stay DRY across Row/Insert/Update. */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Pick<ProfileRow, 'id'> & Partial<ProfileRow>>;
      user_preferences: Table<
        UserPreferencesRow,
        Pick<UserPreferencesRow, 'user_id'> & Partial<UserPreferencesRow>
      >;
      user_quran_preferences: Table<
        UserQuranPreferencesRow,
        Pick<UserQuranPreferencesRow, 'user_id'> & Partial<UserQuranPreferencesRow>
      >;
      reminder_preferences: Table<
        ReminderPreferencesRow,
        Pick<ReminderPreferencesRow, 'user_id'> & Partial<ReminderPreferencesRow>
      >;
      notification_preferences: Table<
        NotificationPreferencesRow,
        Pick<NotificationPreferencesRow, 'user_id'> & Partial<NotificationPreferencesRow>
      >;
      prayer_reminder_rules: Table<
        PrayerReminderRuleRow,
        Omit<PrayerReminderRuleRow, 'id' | 'created_at' | 'updated_at'>
      >;
      prayer_settings: Table<
        PrayerSettingsRow,
        Pick<PrayerSettingsRow, 'user_id'> & Partial<PrayerSettingsRow>
      >;
      goals: Table<GoalRow, Pick<GoalRow, 'user_id'> & Partial<GoalRow>>;
      reading_sessions: Table<ReadingSessionRow, Omit<ReadingSessionRow, 'id' | 'created_at'>>;
      daily_progress: Table<
        DailyProgressRow,
        Pick<DailyProgressRow, 'user_id' | 'local_date'> & Partial<DailyProgressRow>
      >;
      streaks: Table<StreakRow, Pick<StreakRow, 'user_id'> & Partial<StreakRow>>;
      achievements: Table<
        AchievementRow,
        Omit<AchievementRow, 'unlocked_at'> & Partial<AchievementRow>
      >;
      bookmark_collections: Table<
        BookmarkCollectionRow,
        Omit<BookmarkCollectionRow, 'id' | 'created_at' | 'updated_at'>
      >;
      bookmarks: Table<BookmarkRow, Omit<BookmarkRow, 'id' | 'created_at'>>;
      notes: Table<NoteRow, Omit<NoteRow, 'id' | 'created_at' | 'updated_at'>>;
      reading_positions: Table<ReadingPositionRow, Omit<ReadingPositionRow, 'updated_at'>>;
      reading_history: Table<ReadingHistoryRow, Omit<ReadingHistoryRow, 'id' | 'read_at'>>;
      push_tokens: Table<
        PushTokenRow,
        Omit<PushTokenRow, 'id' | 'created_at' | 'last_seen_at' | 'invalidated_at'>
      >;
      notification_history: Table<
        NotificationHistoryRow,
        Omit<NotificationHistoryRow, 'id' | 'created_at' | 'sent_at'>
      >;
      notification_templates: Table<NotificationTemplateRow>;
      feature_flags: Table<FeatureFlagRow>;
      daily_ayah_selections: Table<DailyAyahSelectionRow>;
      app_announcements: Table<AppAnnouncementRow>;
    };
    // `{ [_ in never]: never }` rather than `Record<string, never>`: the latter
    // does not satisfy postgrest-js's `Record<string, GenericView>` constraint,
    // which silently degrades every query result to `never`.
    Views: { [_ in never]: never };
    Functions: {
      record_reading_session: {
        Args: {
          p_client_session_id: string;
          p_started_at: string;
          p_ended_at: string;
          p_local_date: string;
          p_timezone: string;
          p_verses_read?: number;
          p_pages_read?: number;
          p_rukus_read?: number;
          p_chapter_id?: number | null;
          p_start_verse?: number | null;
          p_end_verse?: number | null;
          p_source?: SessionSource;
        };
        Returns: RecordReadingSessionResult;
      };
      reevaluate_progress: {
        Args: { p_today: string };
        Returns: StreakRow;
      };
      unlock_achievement: {
        Args: { p_achievement_key: string };
        Returns: boolean;
      };
      record_notification_outcome: {
        Args: { p_notification_id: string; p_outcome: NotificationOutcome };
        Returns: undefined;
      };
    };
    Enums: {
      goal_unit: GoalUnit;
      session_source: SessionSource;
      notification_category: NotificationCategory;
      notification_outcome: NotificationOutcome;
      prayer_name: PrayerName;
      reminder_offset_direction: ReminderOffsetDirection;
      device_platform: DevicePlatform;
      reading_mode: ReadingModeValue;
      theme_preference: ThemePreferenceValue;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
