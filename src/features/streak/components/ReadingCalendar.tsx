/**
 * A month of reading, as a calendar grid.
 *
 * Shows presence, not performance: a day is either marked or it is not, with a
 * subtle distinction for days where the fuller goal was met. There is no colour
 * scale of "how much" — a chart of how hard someone tried at worship is exactly
 * the wrong thing to build.
 */
import { useMemo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import {
  addLocalDays,
  endOfLocalMonth,
  localDateRange,
  startOfLocalMonth,
  weekdayOfLocalDate,
  type LocalDate,
} from '@/lib/datetime/localDate';

export interface CalendarEntry {
  date: LocalDate;
  minimumMet: boolean;
  goalMet: boolean;
}

export interface ReadingCalendarProps {
  /** Any date within the month to display. */
  month: LocalDate;
  entries: readonly CalendarEntry[];
  today: LocalDate;
  /** Short weekday initials, Monday first. */
  weekdayLabels: readonly string[];
}

export function ReadingCalendar({ month, entries, today, weekdayLabels }: ReadingCalendarProps) {
  const { cells, lookup } = useMemo(() => {
    const first = startOfLocalMonth(month);
    const last = endOfLocalMonth(month);
    const days = localDateRange(first, last);

    // Pad the start so the 1st lands in its correct weekday column. ISO
    // weekdays run 1 (Monday) to 7 (Sunday), matching the label order.
    const leadingBlanks = weekdayOfLocalDate(first) - 1;
    const padded: (LocalDate | null)[] = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...days,
    ];

    const map = new Map<LocalDate, CalendarEntry>();
    for (const entry of entries) map.set(entry.date, entry);

    return { cells: padded, lookup: map };
  }, [month, entries]);

  return (
    <View>
      <View className="mb-2 flex-row">
        {weekdayLabels.map((label, index) => (
          <View key={`${label}-${index}`} className="flex-1 items-center">
            <Text variant="caption" tone="subtle">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((date, index) => {
          if (!date) {
            return <View key={`blank-${index}`} className="aspect-square w-[14.28%] p-1" />;
          }

          const entry = lookup.get(date);
          const isToday = date === today;
          const isFuture = date > today;
          const dayNumber = Number(date.slice(-2));

          return (
            <View key={date} className="aspect-square w-[14.28%] p-1">
              <View
                className={`flex-1 items-center justify-center rounded-lg ${
                  entry?.goalMet
                    ? 'bg-primary'
                    : entry?.minimumMet
                      ? 'bg-primary-muted'
                      : isToday
                        ? 'border border-border-strong'
                        : ''
                }`}
                accessible
                accessibilityLabel={entry?.minimumMet ? `${date}, complete` : `${date}, no reading`}
              >
                <Text
                  variant="caption"
                  className={`tabular-nums ${
                    entry?.goalMet
                      ? 'text-primary-foreground'
                      : entry?.minimumMet
                        ? 'text-primary'
                        : isFuture
                          ? 'text-content-subtle'
                          : 'text-content-muted'
                  }`}
                >
                  {dayNumber}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** The seven days ending today, for the compact strip on the home screen. */
export function lastSevenDays(today: LocalDate): LocalDate[] {
  return localDateRange(addLocalDays(today, -6), today);
}
