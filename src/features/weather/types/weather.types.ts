/**
 * Weather is used for ONE thing: choosing between two phrasings of a reminder.
 * It never appears as content, and it is never given religious significance.
 */
export type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'snow' | 'fog' | 'storm';

export interface WeatherSnapshot {
  condition: WeatherCondition;
  temperatureCelsius: number;
  isDaytime: boolean;
  fetchedAt: string;
}
