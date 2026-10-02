/**
 * How much of each dhikr was counted on each day, for the reading calendar's
 * day summary.
 *
 * A counter itself only knows today and its lifetime total, so the day's
 * figure is copied here whenever it changes — after a press, an undo or a
 * reset — and survives the counter rolling over to the next day. Kept on the
 * device: it is the user's own record of their days, read only here.
 *
 * Writes are coalesced. A sitting is hundreds of presses, and rewriting the
 * history on each would be wasted work; the latest figures are held in memory
 * and written a moment after the presses stop.
 */
import { addLocalDays, type LocalDate } from '@/lib/datetime/localDate';
import { logger } from '@/lib/monitoring/logger';
import { isRecord } from '@/lib/storage/guards';
import { keyValueStore } from '@/lib/storage/keyValueStore';
import { storageKeys } from '@/lib/storage/storageKeys';

import type { Tasbeeh } from '../types/tasbeeh.types';

export interface DhikrCount {
  name: string;
  count: number;
}

/** Day → counter id → that day's count. */
type History = Record<LocalDate, Record<string, DhikrCount>>;

/** Just over a year, like the reading history. */
const RETAINED_DAYS = 400;
const WRITE_DELAY_MS = 1_000;

let cache: History | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

/** Every day must be a record of counters, or summing a day would throw. */
function isHistory(value: unknown): value is History {
  return isRecord(value) && Object.values(value).every(isRecord);
}

async function load(): Promise<History> {
  cache ??= (await keyValueStore.get(storageKeys.tasbeehHistory, isHistory)) ?? {};
  return cache;
}

function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    if (!cache) return;
    void keyValueStore
      .set(storageKeys.tasbeehHistory, cache)
      .catch((error: unknown) => logger.warn('tasbeeh.historyWriteFailed', { error }));
  }, WRITE_DELAY_MS);
}

/** Pure: the history with `tasbeeh`'s count for its day recorded. */
export function withCount(history: History, tasbeeh: Tasbeeh): History {
  const date = tasbeeh.todayDate;
  if (!date) return history;

  const day = { ...(history[date] ?? {}) };
  if (tasbeeh.todayCount > 0) {
    day[tasbeeh.id] = { name: tasbeeh.name, count: tasbeeh.todayCount };
  } else {
    delete day[tasbeeh.id];
  }

  const next = { ...history, [date]: day };
  if (Object.keys(day).length === 0) delete next[date];

  const cutoff = addLocalDays(date, -RETAINED_DAYS);
  for (const key of Object.keys(next)) if (key < cutoff) delete next[key];
  return next;
}

/** Records a counter's figure for its day. Fire-and-forget. */
export function noteTasbeehCount(tasbeeh: Tasbeeh): void {
  void load().then((history) => {
    cache = withCount(history, tasbeeh);
    scheduleWrite();
  });
}

/** Each dhikr counted on `date`, most first. */
export async function dhikrOnDay(date: LocalDate): Promise<DhikrCount[]> {
  const day = (await load())[date] ?? {};
  return Object.values(day)
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}
