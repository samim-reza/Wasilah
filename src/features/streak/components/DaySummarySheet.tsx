/**
 * What one day held, opened by tapping it in the reading calendar: time with
 * the Quran, ayahs read, whether the target was reached, and each dhikr
 * counted.
 */
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { dhikrOnDay, type DhikrCount } from '@/features/tasbeeh/services/tasbeehHistory';
import type { LocalDate } from '@/lib/datetime/localDate';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export interface DaySummary {
  versesRead: number;
  secondsRead: number;
  minimumMet: boolean;
  goalMet: boolean;
}

export interface DaySummarySheetProps {
  /** The day to show; null keeps the sheet closed. */
  date: LocalDate | null;
  /** The day's reading, or undefined when nothing was read. */
  summary: DaySummary | undefined;
  onClose: () => void;
}

export function DaySummarySheet({ date, summary, onClose }: DaySummarySheetProps) {
  const { t, locale } = useTranslation();
  const [dhikr, setDhikr] = useState<DhikrCount[]>([]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    void dhikrOnDay(date).then((counts) => {
      if (!cancelled) setDhikr(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const title = date
    ? DateTime.fromISO(date).setLocale(locale).toLocaleString(DateTime.DATE_HUGE)
    : '';
  const minutes = Math.round((summary?.secondsRead ?? 0) / 60);
  const readAnything = (summary?.secondsRead ?? 0) > 0 || (summary?.versesRead ?? 0) > 0;

  return (
    <BottomSheet visible={date !== null} onClose={onClose} title={title} heightRatio={0.5}>
      <View className="gap-3 px-4 pb-8">
        <Row
          icon="quran"
          label={t('progress.dayQuran')}
          value={
            readAnything
              ? t('progress.dayQuranValue', {
                  minutes: minutes < 1 ? '<1' : minutes,
                  ayahs: summary?.versesRead ?? 0,
                })
              : t('progress.dayNothing')
          }
          highlight={summary?.minimumMet === true}
          note={summary?.goalMet || summary?.minimumMet ? t('progress.dayTargetMet') : undefined}
        />

        {dhikr.length > 0 ? (
          dhikr.map((entry, index) => (
            <Row
              // Two counters can share a name.
              key={`${entry.name}-${index}`}
              icon="streakOutline"
              label={entry.name}
              value={t('progress.dayDhikrCount', { count: entry.count })}
            />
          ))
        ) : (
          <Row
            icon="streakOutline"
            label={t('progress.dayDhikr')}
            value={t('progress.dayNothing')}
          />
        )}
      </View>
    </BottomSheet>
  );
}

function Row({
  icon,
  label,
  value,
  note,
  highlight = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
      <Icon name={icon} size={20} color={highlight ? 'primary' : 'textMuted'} />
      <View className="flex-1">
        <Text className="font-semibold" numberOfLines={1}>
          {label}
        </Text>
        {note ? (
          <Text variant="caption" tone="success">
            {note}
          </Text>
        ) : null}
      </View>
      <Text tone="muted" className="tabular-nums">
        {value}
      </Text>
    </View>
  );
}
