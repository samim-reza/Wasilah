/**
 * A callback whose identity never changes but which always runs the latest
 * version of `callback`.
 *
 * For handing handlers to memoised list rows that deliberately ignore
 * callback props (see `AyahCard`). A plain `useCallback` there is a trap: the
 * row keeps whichever version it rendered with, and that version reads state
 * from that render — not from the moment of the tap.
 *
 * The ref is updated in an effect, never during render, so a render that is
 * thrown away cannot leave a handler from a state that never committed.
 */
import { useCallback, useEffect, useRef } from 'react';

export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useRef(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  return useCallback((...args: Args) => ref.current(...args), []);
}
