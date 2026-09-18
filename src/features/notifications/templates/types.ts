import type { WeatherCondition } from '@/features/weather/types/weather.types';
import type { NotificationCategory } from '@/lib/supabase/database.types';
import type { NotificationContent } from '../types/notification.types';

/**
 * Variables a template may interpolate.
 *
 * Deliberately narrow: a template can mention how long a streak is or which
 * ayah is waiting, but there is no slot for note text or a search query, so
 * private content cannot reach a lock screen by accident.
 */
export interface TemplateVariables {
  streakDays?: number;
  remainingVerses?: number;
  ayahReference?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  weatherCondition?: WeatherCondition;
  prayerName?: string;
  userName?: string;
}

export interface NotificationTemplate {
  key: string;
  category: NotificationCategory;
  /**
   * Builds the content. Returning null means "this template does not apply to
   * these variables" — for example a streak template with no streak — which the
   * engine treats as a reason not to send rather than as an error.
   */
  build: (variables: TemplateVariables) => NotificationContent | null;
}
