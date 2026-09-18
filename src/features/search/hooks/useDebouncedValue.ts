/**
 * Debounces a rapidly-changing value.
 *
 * Search runs on every keystroke otherwise, which wastes the API quota, makes
 * the results flicker between partial queries, and burns battery on the radio.
 */
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    // Clearing on every change is what makes this a debounce rather than a
    // throttle: only a pause in typing lets the value through.
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
