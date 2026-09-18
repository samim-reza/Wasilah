/**
 * Runtime shape guards for values read back from storage.
 *
 * Kept together so the checks stay consistent and so it is obvious which
 * persisted values are structured enough to need one.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An array whose every entry satisfies `entryGuard`. */
export function isArrayOf<T>(
  entryGuard: (entry: unknown) => entry is T,
): (value: unknown) => value is T[] {
  return (value): value is T[] => Array.isArray(value) && value.every(entryGuard);
}

/** A record carrying every one of `keys` as a string. */
export function hasStringKeys<T>(...keys: string[]): (value: unknown) => value is T {
  return (value): value is T =>
    isRecord(value) && keys.every((key) => typeof value[key] === 'string');
}

/** A record carrying every one of `keys` as a number. */
export function hasNumberKeys<T>(...keys: string[]): (value: unknown) => value is T {
  return (value): value is T =>
    isRecord(value) && keys.every((key) => typeof value[key] === 'number');
}
