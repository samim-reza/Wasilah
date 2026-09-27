/**
 * Auto-scroll: the page moves on its own at a steady pace, so the reader can
 * follow the text without touching the screen.
 *
 * Driven from a requestAnimationFrame loop that nudges the list by
 * `speed × elapsed time` each frame, rather than by one long animated scroll:
 * a single animation cannot change pace mid-way, cannot give way to the
 * user's finger, and would have to be restarted every time another page of
 * ayahs arrives and the content grows.
 *
 * The user always wins. A drag pauses the loop, and when the finger lifts —
 * and any fling has settled — scrolling carries on from wherever they left
 * the page.
 */
import type { FlashListRef } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Speeds offered in the reader, slowest first, in points per second. */
export const autoScrollSpeeds = [10, 16, 24, 36, 52] as const;

/** Frames longer than this (a stall, the app returning) are not caught up. */
const MAX_FRAME_MS = 64;

/**
 * A scroll event this far from where the loop put the list means something
 * else moved it — ayahs inserted above, the reader following the recitation —
 * and the loop adopts the new position instead of dragging the list back.
 */
const EXTERNAL_MOVE_THRESHOLD = 40;

/** How long after a finger lifts to wait for a fling before resuming. */
const RELEASE_DELAY_MS = 150;

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export interface AutoScrollOptions {
  /** Scrolling only happens while this is true. */
  active: boolean;
  /** Index into `autoScrollSpeeds`. */
  speedLevel: number;
}

export function useAutoScroll<T>(
  listRef: React.RefObject<FlashListRef<T> | null>,
  { active, speedLevel }: AutoScrollOptions,
) {
  const offsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const isHeldRef = useRef(false);
  const activeRef = useRef(active);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const pointsPerSecond =
    autoScrollSpeeds[Math.min(Math.max(0, speedLevel), autoScrollSpeeds.length - 1)] ??
    autoScrollSpeeds[0];

  useEffect(() => {
    if (!active) return;

    let frame: number | null = null;
    let last: number | null = null;

    const step = (now: number) => {
      if (last !== null && !isHeldRef.current) {
        const elapsed = Math.min(MAX_FRAME_MS, now - last);
        const maxOffset = Math.max(0, contentHeightRef.current - viewportHeightRef.current);
        const nextOffset = Math.min(
          maxOffset,
          offsetRef.current + (pointsPerSecond * elapsed) / 1000,
        );

        if (nextOffset > offsetRef.current) {
          offsetRef.current = nextOffset;
          listRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
        }
      }
      last = now;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [active, pointsPerSecond, listRef]);

  useEffect(
    () => () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    },
    [],
  );

  const release = useCallback(() => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
    isHeldRef.current = false;
  }, []);

  const onScroll = useCallback((event: ScrollEvent) => {
    const y = event.nativeEvent.contentOffset.y;
    // While idle or under the finger, the list's own position is the truth.
    // While scrolling, only a large jump is someone else's doing.
    if (
      !activeRef.current ||
      isHeldRef.current ||
      Math.abs(y - offsetRef.current) > EXTERNAL_MOVE_THRESHOLD
    ) {
      offsetRef.current = y;
    }
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    isHeldRef.current = true;
  }, []);

  const onScrollEndDrag = useCallback(
    (event: ScrollEvent) => {
      offsetRef.current = event.nativeEvent.contentOffset.y;
      // A fling reports its own start; if none comes, the drag simply ended.
      releaseTimerRef.current = setTimeout(release, RELEASE_DELAY_MS);
    },
    [release],
  );

  const onMomentumScrollBegin = useCallback(() => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    isHeldRef.current = true;
  }, []);

  const onMomentumScrollEnd = useCallback(
    (event: ScrollEvent) => {
      offsetRef.current = event.nativeEvent.contentOffset.y;
      release();
    },
    [release],
  );

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    contentHeightRef.current = height;
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  return useMemo(
    () => ({
      onScroll,
      onScrollBeginDrag,
      onScrollEndDrag,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      onContentSizeChange,
      onLayout,
    }),
    [
      onScroll,
      onScrollBeginDrag,
      onScrollEndDrag,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      onContentSizeChange,
      onLayout,
    ],
  );
}
