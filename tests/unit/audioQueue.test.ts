import {
  emptyQueue,
  currentTrack,
  findTrackIndex,
  indexAfterCompletion,
  nextIndex,
  stepAfterCompletion,
  previousIndex,
  shouldRestartInsteadOfPrevious,
  trackToPrefetch,
  type QueueState,
} from '@/features/audio/services/audioQueue';
import type { AudioTrack } from '@/features/audio/types/audio.types';

function track(verseNumber: number): AudioTrack {
  return {
    verseKey: `1:${verseNumber}`,
    url: `https://example.test/1-${verseNumber}.mp3`,
    chapterId: 1,
    verseNumber,
    segments: null,
  };
}

function queue(
  currentIndex: number,
  repeatMode: QueueState['repeatMode'] = 'off',
  repeat: Partial<QueueState> = {},
): QueueState {
  return {
    ...emptyQueue,
    tracks: [track(1), track(2), track(3)],
    currentIndex,
    repeatMode,
    ...repeat,
  };
}

describe('currentTrack', () => {
  it('is null for an empty queue', () => {
    expect(currentTrack(emptyQueue)).toBeNull();
  });

  it('is null for an out-of-range index', () => {
    expect(currentTrack(queue(9))).toBeNull();
  });
});

describe('indexAfterCompletion', () => {
  it('advances through the queue', () => {
    expect(indexAfterCompletion(queue(0))).toBe(1);
  });

  it('stops at the end with repeat off', () => {
    expect(indexAfterCompletion(queue(2))).toBeNull();
  });

  it('wraps with repeat all', () => {
    expect(indexAfterCompletion(queue(2, 'all'))).toBe(0);
  });

  it('replays the same ayah with repeat one', () => {
    expect(indexAfterCompletion(queue(1, 'one'))).toBe(1);
  });

  it('is null for an empty queue', () => {
    expect(indexAfterCompletion(emptyQueue)).toBeNull();
  });
});

describe('stepAfterCompletion with repeat counts', () => {
  it('recites each ayah the chosen number of times before moving on', () => {
    const first = stepAfterCompletion(queue(0, 'off', { repeatEach: 3 }));
    expect(first).toMatchObject({ currentIndex: 0, plays: 1 });

    const second = stepAfterCompletion(first!);
    expect(second).toMatchObject({ currentIndex: 0, plays: 2 });

    const third = stepAfterCompletion(second!);
    expect(third).toMatchObject({ currentIndex: 1, plays: 0 });
  });

  it('plays the whole range again until the passes are used up', () => {
    const wrapped = stepAfterCompletion(queue(2, 'off', { repeatRange: 2 }));
    expect(wrapped).toMatchObject({ currentIndex: 0, passes: 1 });

    expect(stepAfterCompletion({ ...wrapped!, currentIndex: 2 })).toBeNull();
  });

  it('repeats the range until stopped when the count is 0', () => {
    const state = queue(2, 'off', { repeatRange: 0, passes: 40 });
    expect(stepAfterCompletion(state)).toMatchObject({ currentIndex: 0, passes: 41 });
  });

  it('finishes the last ayah’s repeats before ending', () => {
    const state = queue(2, 'off', { repeatEach: 2 });
    expect(stepAfterCompletion(state)).toMatchObject({ currentIndex: 2, plays: 1 });
    expect(stepAfterCompletion({ ...state, plays: 1 })).toBeNull();
  });
});

describe('nextIndex', () => {
  it('advances even in repeat-one, unlike natural completion', () => {
    // The distinction that makes the skip button work while repeating an ayah.
    expect(indexAfterCompletion(queue(1, 'one'))).toBe(1);
    expect(nextIndex(queue(1, 'one'))).toBe(2);
  });

  it('stops at the end with repeat off', () => {
    expect(nextIndex(queue(2))).toBeNull();
  });
});

describe('previousIndex', () => {
  it('steps back', () => {
    expect(previousIndex(queue(1))).toBe(0);
  });

  it('is null at the start with repeat off', () => {
    expect(previousIndex(queue(0))).toBeNull();
  });

  it('wraps to the end with repeat all', () => {
    expect(previousIndex(queue(0, 'all'))).toBe(2);
  });
});

describe('shouldRestartInsteadOfPrevious', () => {
  it('restarts once a few seconds in', () => {
    expect(shouldRestartInsteadOfPrevious(5)).toBe(true);
    expect(shouldRestartInsteadOfPrevious(1)).toBe(false);
  });
});

describe('trackToPrefetch', () => {
  it('warms the next ayah', () => {
    expect(trackToPrefetch(queue(0))?.verseKey).toBe('1:2');
  });

  it('does not prefetch a repeat of what is already loaded', () => {
    expect(trackToPrefetch(queue(1, 'one'))).toBeNull();
  });

  it('is null at the end of a non-repeating queue', () => {
    expect(trackToPrefetch(queue(2))).toBeNull();
  });
});

describe('findTrackIndex', () => {
  it('locates an ayah by key', () => {
    expect(findTrackIndex(queue(0), '1:3')).toBe(2);
    expect(findTrackIndex(queue(0), '2:1')).toBe(-1);
  });
});
