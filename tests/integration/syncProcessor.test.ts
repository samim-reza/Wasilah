/**
 * Offline sync integration tests.
 *
 * Supabase is mocked at the client boundary rather than the network, so these
 * exercise the real queue, the real conflict policy and the real retry
 * behaviour — the parts most likely to lose a user's reading if they regress.
 */
// `jest.mock` calls are hoisted above every import by babel, so the modules
// under test can be imported normally at the top of the file.
import { AppError } from '@/lib/api/errors';
import { flushQueue } from '@/lib/offline/syncProcessor';
import type { QueuedOperation } from '@/lib/offline/types';

// Jest hoists `jest.mock` factories above every import, so any variable they
// close over must be declared with a `mock`-prefixed name.
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockPeekBatch = jest.fn();
const mockRemove = jest.fn();
const mockRecordFailure = jest.fn();

jest.mock('@/lib/offline/syncQueue', () => ({
  peekBatch: (...args: unknown[]) => mockPeekBatch(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
  recordFailure: (...args: unknown[]) => mockRecordFailure(...args),
}));

const USER_ID = 'user-1';

function sessionOperation(id: number, clientSessionId: string): QueuedOperation {
  return {
    id,
    type: 'reading_session',
    userId: USER_ID,
    createdAt: '2026-03-09T10:00:00Z',
    attempts: 0,
    lastError: null,
    payload: {
      clientSessionId,
      startedAt: '2026-03-09T10:00:00Z',
      endedAt: '2026-03-09T10:05:00Z',
      localDate: '2026-03-09',
      timezone: 'Asia/Dhaka',
      versesRead: 3,
      pagesRead: 0,
      rukusRead: 0,
      chapterId: 2,
      startVerse: 1,
      endVerse: 3,
      source: 'reader',
    },
  };
}

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ error: null });
  mockFrom.mockReset();
  mockPeekBatch.mockReset();
  mockRemove.mockReset().mockResolvedValue(undefined);
  mockRecordFailure.mockReset().mockResolvedValue(false);
});

describe('flushQueue', () => {
  it('sends a queued reading session and clears it from the queue', async () => {
    mockPeekBatch.mockResolvedValue([sessionOperation(1, 'abc')]);

    const result = await flushQueue(USER_ID);

    expect(mockRpc).toHaveBeenCalledWith(
      'record_reading_session',
      expect.objectContaining({
        p_client_session_id: 'abc',
        p_local_date: '2026-03-09',
        p_timezone: 'Asia/Dhaka',
        p_verses_read: 3,
      }),
    );
    expect(mockRemove).toHaveBeenCalledWith(1);
    expect(result).toEqual({ flushed: 1, failed: 0, discarded: 0 });
  });

  it('replays in the order the user made the writes', async () => {
    mockPeekBatch.mockResolvedValue([sessionOperation(1, 'first'), sessionOperation(2, 'second')]);

    await flushQueue(USER_ID);

    const sentIds = mockRpc.mock.calls.map(
      (call) => (call[1] as { p_client_session_id: string }).p_client_session_id,
    );
    expect(sentIds).toEqual(['first', 'second']);
  });

  it('pauses rather than burning retry budget while offline', async () => {
    mockPeekBatch.mockResolvedValue([sessionOperation(1, 'first'), sessionOperation(2, 'second')]);
    mockRpc.mockRejectedValueOnce(new AppError('offline', 'no connection'));

    const result = await flushQueue(USER_ID);

    // Stops at the first entry; the second is untouched and still queued.
    expect(result.flushed).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockRecordFailure).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('counts a server rejection as a failure and keeps going', async () => {
    mockPeekBatch.mockResolvedValue([sessionOperation(1, 'first'), sessionOperation(2, 'second')]);
    mockRpc.mockResolvedValueOnce({ error: { message: 'constraint violation' } });

    const result = await flushQueue(USER_ID);

    expect(mockRecordFailure).toHaveBeenCalledWith(1, expect.stringContaining('constraint'));
    expect(result.failed).toBe(1);
    // The second entry is not blocked by the first one failing.
    expect(result.flushed).toBe(1);
  });

  it('reports an entry abandoned after exhausting its retries', async () => {
    mockPeekBatch.mockResolvedValue([sessionOperation(1, 'first')]);
    mockRpc.mockResolvedValueOnce({ error: { message: 'permanent' } });
    mockRecordFailure.mockResolvedValue(true);

    const result = await flushQueue(USER_ID);

    expect(result).toEqual({ flushed: 0, failed: 1, discarded: 1 });
  });

  it('does nothing when the queue is empty', async () => {
    mockPeekBatch.mockResolvedValue([]);

    const result = await flushQueue(USER_ID);

    expect(result).toEqual({ flushed: 0, failed: 0, discarded: 0 });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('reading position conflict resolution', () => {
  function positionOperation(updatedAt: string): QueuedOperation {
    return {
      id: 1,
      type: 'position_save',
      userId: USER_ID,
      createdAt: updatedAt,
      attempts: 0,
      lastError: null,
      payload: { verseKey: '2:10', chapterId: 2, verseNumber: 10, updatedAt },
    };
  }

  function mockPositionTable(remoteUpdatedAt: string | null) {
    const upsert = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: remoteUpdatedAt ? { updated_at: remoteUpdatedAt } : null,
              error: null,
            }),
        }),
      }),
      upsert,
    }));

    return upsert;
  }

  it('writes when the server has no position yet', async () => {
    mockPeekBatch.mockResolvedValue([positionOperation('2026-03-09T12:00:00Z')]);
    const upsert = mockPositionTable(null);

    await flushQueue(USER_ID);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ verse_key: '2:10', verse_number: 10 }),
    );
  });

  it('does not let a stale local position overwrite a newer one from another device', async () => {
    mockPeekBatch.mockResolvedValue([positionOperation('2026-03-09T12:00:00Z')]);
    const upsert = mockPositionTable('2026-03-09T18:00:00Z');

    const result = await flushQueue(USER_ID);

    expect(upsert).not.toHaveBeenCalled();
    // Skipping is a success: the queue entry is resolved, not retried forever.
    expect(result.flushed).toBe(1);
  });

  it('writes when the local position is the newer one', async () => {
    mockPeekBatch.mockResolvedValue([positionOperation('2026-03-09T20:00:00Z')]);
    const upsert = mockPositionTable('2026-03-09T18:00:00Z');

    await flushQueue(USER_ID);

    expect(upsert).toHaveBeenCalled();
  });
});
