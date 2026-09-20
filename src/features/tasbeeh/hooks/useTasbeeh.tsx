/**
 * Tasbeeh state, shared across every screen that touches it.
 *
 * A provider rather than a plain hook, because three screens read the same
 * list — the tab, the counter and the editor. As a plain hook each one held
 * its own copy, so adding a counter in the editor left the tab showing stale
 * state until it remounted. That is the bug this shape exists to prevent, not
 * an optimisation.
 *
 * Every mutation applies to state first, writes to the device, and only then
 * syncs. The press has to register on the very next frame — anything slower
 * and the counter feels broken, which for a dhikr counter is the whole
 * product.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useUserId } from '@/features/auth/hooks/AuthProvider';
import { useLocalDate } from '@/lib/datetime/useLocalDate';

import {
  deleteRemote,
  fetchRemote,
  fromDraft,
  loadLocal,
  mergeByHighestCount,
  saveLocal,
  upsertRemote,
} from '../services/tasbeehStore';
import {
  decrement as decrementCounter,
  increment as incrementCounter,
  reset as resetCounter,
} from '../utils/tasbeehProgress';
import type { Tasbeeh, TasbeehDraft } from '../types/tasbeeh.types';

export interface UseTasbeehResult {
  list: Tasbeeh[];
  isLoading: boolean;
  find: (id: string) => Tasbeeh | undefined;
  press: (id: string) => void;
  stepBack: (id: string) => void;
  resetOne: (id: string) => void;
  create: (draft: TasbeehDraft) => void;
  edit: (id: string, draft: TasbeehDraft) => void;
  remove: (id: string) => void;
}

function useTasbeehState(): UseTasbeehResult {
  const userId = useUserId();
  const { today } = useLocalDate();
  const [list, setList] = useState<Tasbeeh[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const local = await loadLocal();
      if (!cancelled) setList(local);

      if (userId) {
        const remote = await fetchRemote(userId);
        if (!cancelled && remote.length > 0) {
          const merged = mergeByHighestCount(local, remote);
          setList(merged);
          await saveLocal(merged);
        }
      }

      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Applies a change to one counter.
   *
   * Local state and the device write happen together; the account sync is
   * fire-and-forget so a slow network cannot stall the next press.
   */
  const mutate = useCallback(
    (id: string, change: (current: Tasbeeh) => Tasbeeh) => {
      setList((current) => {
        const next = current.map((entry) => (entry.id === id ? change(entry) : entry));
        void saveLocal(next);

        const updated = next.find((entry) => entry.id === id);
        if (userId && updated) void upsertRemote(userId, updated);

        return next;
      });
    },
    [userId],
  );

  const press = useCallback(
    (id: string) => mutate(id, (entry) => incrementCounter(entry, today)),
    [mutate, today],
  );

  const stepBack = useCallback(
    (id: string) => mutate(id, (entry) => decrementCounter(entry, today)),
    [mutate, today],
  );

  const resetOne = useCallback(
    (id: string) => mutate(id, (entry) => resetCounter(entry, today)),
    [mutate, today],
  );

  const create = useCallback(
    (draft: TasbeehDraft) => {
      setList((current) => {
        const entry = fromDraft(draft, current.length);
        const next = [...current, entry];
        void saveLocal(next);
        if (userId) void upsertRemote(userId, entry);
        return next;
      });
    },
    [userId],
  );

  const edit = useCallback(
    (id: string, draft: TasbeehDraft) =>
      mutate(id, (entry) => ({
        ...entry,
        name: draft.name.trim(),
        dailyTarget: Math.max(0, draft.dailyTarget),
      })),
    [mutate],
  );

  const remove = useCallback(
    (id: string) => {
      setList((current) => {
        const next = current.filter((entry) => entry.id !== id);
        void saveLocal(next);
        if (userId) void deleteRemote(id);
        return next;
      });
    },
    [userId],
  );

  const find = useCallback((id: string) => list.find((entry) => entry.id === id), [list]);

  return useMemo(
    () => ({ list, isLoading, find, press, stepBack, resetOne, create, edit, remove }),
    [list, isLoading, find, press, stepBack, resetOne, create, edit, remove],
  );
}

const TasbeehContext = createContext<UseTasbeehResult | null>(null);

export function TasbeehProvider({ children }: { children: ReactNode }) {
  const value = useTasbeehState();
  return <TasbeehContext.Provider value={value}>{children}</TasbeehContext.Provider>;
}

/**
 * Reads the shared list.
 *
 * Throws rather than falling back to a private copy: a silent fallback would
 * reintroduce exactly the stale-list bug this provider removes, and it would
 * only show up as "the new counter did not appear".
 */
export function useTasbeeh(): UseTasbeehResult {
  const value = useContext(TasbeehContext);
  if (!value) throw new Error('useTasbeeh must be used inside TasbeehProvider');
  return value;
}
