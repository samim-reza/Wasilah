/**
 * The user's current local date, kept correct across midnight.
 *
 * A date captured at mount goes stale for anyone using the app at midnight, and
 * a stale "today" makes the streak appear to break. This hook re-evaluates when
 * the app returns to the foreground and schedules a single timer for the next
 * local midnight.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { endOfLocalDay, getDeviceTimezone, todayLocalDate, type LocalDate } from './localDate';

export interface LocalDateState {
  today: LocalDate;
  timezone: string;
  /** Minutes remaining in the local day; drives streak-at-risk messaging. */
  minutesUntilMidnight: number;
}

function snapshot(): LocalDateState {
  const timezone = getDeviceTimezone();
  const today = todayLocalDate(timezone);
  const midnight = endOfLocalDay(today, timezone).getTime();

  return {
    today,
    timezone,
    minutesUntilMidnight: Math.max(0, Math.round((midnight - Date.now()) / 60_000)),
  };
}

export function useLocalDate(): LocalDateState {
  const [state, setState] = useState<LocalDateState>(snapshot);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setState(snapshot());
  }, []);

  // One timer, re-armed each time it fires, rather than polling every minute —
  // a per-minute interval would keep the JS thread waking for no reason.
  useEffect(() => {
    function scheduleMidnightRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current);

      const current = snapshot();
      const midnight = endOfLocalDay(current.today, current.timezone).getTime();
      // One extra second so the timer lands after midnight, not exactly on it.
      const delay = Math.max(1_000, midnight - Date.now() + 1_000);

      timerRef.current = setTimeout(() => {
        refresh();
        scheduleMidnightRefresh();
      }, delay);
    }

    scheduleMidnightRefresh();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refresh]);

  // Timers do not run reliably while backgrounded, and the device may also have
  // changed timezone while the app was away.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return state;
}
