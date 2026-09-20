/**
 * Tasbeeh persistence.
 *
 * Device-first, and not merely as an optimisation: a counter that waits for a
 * network round trip before the number moves is unusable, and guest mode has
 * no row to write to at all. Every press lands locally and immediately; the
 * account copy catches up afterwards and never blocks the UI.
 *
 * Conflict handling between device and account is deliberately crude —
 * whichever total is higher wins. A tasbeeh only ever counts upward, so the
 * larger number is the one that includes presses the other side has not seen.
 * That is right for the realistic case (the phone counted while offline) and
 * merely harmless for the unrealistic one.
 */
import { isRecord } from '@/lib/storage/guards';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';
import { logger } from '@/lib/monitoring/logger';
import { supabase } from '@/lib/supabase/client';
import type { TasbeehRow } from '@/lib/supabase/database.types';
import type { LocalDate } from '@/lib/datetime/localDate';

import type { Tasbeeh, TasbeehDraft } from '../types/tasbeeh.types';
import { DEFAULT_TASBEEH_NAME } from '../utils/tasbeehProgress';

/**
 * The counter every new user starts with.
 *
 * The Kalima, at 100 a round: a starting point that needs no setup, so the
 * feature is usable the first time it is opened rather than presenting an
 * empty list and a form.
 */
export function defaultTasbeeh(): Tasbeeh {
  return {
    id: 'default-kalima',
    name: DEFAULT_TASBEEH_NAME,
    arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ',
    roundSize: 100,
    dailyTarget: 0,
    totalCount: 0,
    todayCount: 0,
    todayDate: null,
    position: 0,
  };
}

function isTasbeehArray(value: unknown): value is Tasbeeh[] {
  return Array.isArray(value) && value.every((entry) => isRecord(entry) && 'id' in entry);
}

export async function loadLocal(): Promise<Tasbeeh[]> {
  const stored = await keyValueStore.get<Tasbeeh[]>(storageKeys.tasbeeh, isTasbeehArray);
  // A first run seeds the default rather than showing an empty list.
  return stored && stored.length > 0 ? stored : [defaultTasbeeh()];
}

export async function saveLocal(list: readonly Tasbeeh[]): Promise<void> {
  await keyValueStore.set(storageKeys.tasbeeh, list);
}

function toTasbeeh(row: TasbeehRow): Tasbeeh {
  return {
    id: row.id,
    name: row.name,
    arabic: row.arabic ?? '',
    roundSize: row.round_size,
    dailyTarget: row.daily_target,
    totalCount: Number(row.total_count),
    todayCount: row.today_count,
    todayDate: (row.today_date as LocalDate | null) ?? null,
    position: row.position,
  };
}

export async function fetchRemote(userId: string): Promise<Tasbeeh[]> {
  const { data, error } = await supabase
    .from('tasbeeh')
    .select('*')
    .eq('user_id', userId)
    .order('position')
    .order('created_at');

  if (error) {
    logger.warn('tasbeeh.fetchFailed', { error });
    return [];
  }

  return (data ?? []).map(toTasbeeh);
}

export async function upsertRemote(userId: string, tasbeeh: Tasbeeh): Promise<void> {
  const { error } = await supabase.from('tasbeeh').upsert(
    {
      id: tasbeeh.id,
      user_id: userId,
      name: tasbeeh.name,
      arabic: tasbeeh.arabic || null,
      round_size: tasbeeh.roundSize,
      daily_target: tasbeeh.dailyTarget,
      total_count: tasbeeh.totalCount,
      today_count: tasbeeh.todayCount,
      today_date: tasbeeh.todayDate,
      position: tasbeeh.position,
    },
    { onConflict: 'id' },
  );

  // A failed sync leaves the device copy intact, which is the authority until
  // the next successful write. Never worth interrupting counting for.
  if (error) logger.debug('tasbeeh.syncFailed', { error });
}

export async function deleteRemote(id: string): Promise<void> {
  const { error } = await supabase.from('tasbeeh').delete().eq('id', id);
  if (error) logger.debug('tasbeeh.deleteFailed', { error });
}

/**
 * Merges the account's counters with the device's.
 *
 * Matched by id, higher total wins. Anything the device has that the account
 * does not is kept — that is the guest's counters being adopted on sign-in,
 * which must not be silently dropped.
 */
export function mergeByHighestCount(local: readonly Tasbeeh[], remote: readonly Tasbeeh[]): Tasbeeh[] {
  const merged = new Map<string, Tasbeeh>();

  for (const entry of remote) merged.set(entry.id, entry);

  for (const entry of local) {
    const existing = merged.get(entry.id);
    if (!existing) {
      merged.set(entry.id, entry);
      continue;
    }
    merged.set(entry.id, entry.totalCount > existing.totalCount ? entry : existing);
  }

  return [...merged.values()].sort((a, b) => a.position - b.position);
}

/** A new counter from what the user typed. */
export function fromDraft(draft: TasbeehDraft, position: number): Tasbeeh {
  return {
    // `crypto.randomUUID` exists in Hermes and in every browser this ships to.
    id: globalThis.crypto?.randomUUID?.() ?? `tasbeeh-${Date.now()}`,
    name: draft.name.trim(),
    arabic: draft.arabic.trim(),
    roundSize: Math.max(1, draft.roundSize),
    dailyTarget: Math.max(0, draft.dailyTarget),
    totalCount: 0,
    todayCount: 0,
    todayDate: null,
    position,
  };
}
