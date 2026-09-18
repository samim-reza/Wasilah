/**
 * A wall-clock time picker row.
 *
 * Uses the platform picker via a modal rather than free text: a reminder time
 * typed as "8pm" has too many ways to be wrong, and the native picker already
 * understands the user's 12/24-hour preference.
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { formatTimeForDisplay, type TimeOfDay } from '@/lib/datetime/timeOfDay';
import { useTranslation } from '@/lib/i18n/I18nProvider';

export interface TimePickerRowProps {
  label: string;
  value: TimeOfDay;
  onChange: (time: TimeOfDay) => void;
  disabled?: boolean;
}

export function TimePickerRow({ label, value, onChange, disabled }: TimePickerRowProps) {
  const { locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const asDate = new Date();
  asDate.setHours(value.hour, value.minute, 0, 0);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android's picker is a dialog that dismisses itself; iOS's is inline.
    if (Platform.OS === 'android') setIsOpen(false);
    if (event.type === 'dismissed' || !date) return;

    onChange({ hour: date.getHours(), minute: date.getMinutes() });
  };

  return (
    <View>
      <ListRow
        label={label}
        value={formatTimeForDisplay(value, locale)}
        icon="clock"
        onPress={disabled ? undefined : () => setIsOpen((current) => !current)}
      />

      {isOpen && (
        <DateTimePicker
          value={asDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </View>
  );
}
