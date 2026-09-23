/**
 * "Something was just queued — flush it now."
 *
 * The queue drains on three signals: sign-in, connectivity returning, and the
 * app coming to the foreground. None of those fires when a user who is online
 * and in the app taps Bookmark. The entry sat in the queue until the next
 * foreground event, and meanwhile the bookmarks list was refetched from a
 * server that had never heard of it — so the bookmark vanished from the list
 * moments after being added.
 *
 * A module-level signal rather than a React context: the services that
 * enqueue (bookmarks, notes, reading sessions) are plain async functions with
 * no component tree to reach a context through, and threading a callback
 * into every one of them would spread the queue's wiring across the app.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Registered by `useOfflineSync`; returns the unsubscribe. */
export function onSyncRequested(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called after an enqueue. Safe with no listener mounted — it simply waits. */
export function requestSync(): void {
  for (const listener of listeners) listener();
}
