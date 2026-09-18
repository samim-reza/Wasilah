/**
 * Calendar data for the progress screen.
 *
 * Works identically for a guest and a signed-in user, reading from local
 * storage or Supabase respectively — the progress screen should not be a
 * feature you have to sign up to see.
 */
import { useQuery } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { queryKeys } from '@/lib/api/queryKeys';
import { endOfLocalMonth, startOfLocalMonth, type LocalDate } from '@/lib/datetime/localDate';

import { fetchProgressRange, type CalendarDay } from '../services/habitService';
import { getLocalCalendar } from '../services/localHabitStore';

export function useProgressCalendar(month: LocalDate) {
  const userId = useUserId();
  const from = startOfLocalMonth(month);
  const to = endOfLocalMonth(month);

  return useQuery<CalendarDay[]>({
    // Keyed by month so navigating between months caches each one separately
    // rather than refetching the same data on every swipe back.
    queryKey: queryKeys.habit.calendar(userId ?? 'guest', from),
    queryFn: () => (userId ? fetchProgressRange(userId, from, to) : getLocalCalendar(from, to)),
    staleTime: 5 * 60 * 1000,
  });
}
