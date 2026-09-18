import { View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatTimeForDisplay } from '@/lib/datetime/timeOfDay';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export interface PrayerTimeRowProps {
  labelKey: string;
  time: Date;
  /** Highlighted as the next prayer of the day. */
  isNext: boolean;
  /** Sunrise is shown for orientation but is not a prayer. */
  isInformational?: boolean;
  icon: IconName;
}

export function PrayerTimeRow({
  labelKey,
  time,
  isNext,
  isInformational = false,
  icon,
}: PrayerTimeRowProps) {
  const { t, locale } = useTranslation();
  const label = t(labelKey);
  const formatted = formatTimeForDisplay(
    { hour: time.getHours(), minute: time.getMinutes() },
    locale,
  );

  return (
    <View
      className={`flex-row items-center gap-3 rounded-lg px-3 py-3 ${isNext ? 'bg-primary-muted' : ''}`}
      accessible
      accessibilityLabel={
        isNext ? t('prayer.nextPrayer', { name: label, time: formatted }) : `${label}, ${formatted}`
      }
    >
      <Icon
        name={icon}
        size={17}
        color={isNext ? 'primary' : isInformational ? 'textSubtle' : 'textMuted'}
      />

      <Text
        className={`flex-1 ${isNext ? 'font-semibold text-primary' : ''}`}
        tone={isInformational && !isNext ? 'subtle' : 'default'}
      >
        {label}
      </Text>

      <Text
        className={`tabular-nums ${isNext ? 'font-semibold text-primary' : ''}`}
        tone={isInformational && !isNext ? 'subtle' : 'muted'}
      >
        {formatted}
      </Text>
    </View>
  );
}
