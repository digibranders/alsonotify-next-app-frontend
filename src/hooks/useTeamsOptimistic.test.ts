import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  addPendingMessage,
  markMessageFailed,
  markMessagePending,
  reconcilePendingMessage,
  preservePendingMessages,
} from './useTeamsRealtime';
import { queryKeys } from '../lib/queryKeys';
import type { ApiResponse } from '../types/api';
import type { TeamsChatMessage } from '../services/teams';

// The real cache (see useTeams.ts -> useTeamsChatMessages / useChannelMessages,
// and useTeamsRealtime.ts / useTeamsRealtime.test.ts, established in Task 8)
// holds the API envelope `ApiResponse<TeamsChatMessage[]>`
// (`{ success, message, result }`), NOT a bare array. The three helpers under
// test operate on `existing.result`, so the cache must be seeded in that
// shape or they no-op (see the early `if (!existing?.result) return;` guards
// in useTeamsRealtime.ts).
const wrap = (result: Partial<TeamsChatMessage>[]): ApiResponse<TeamsChatMessage[]> => ({
  success: true,
  message: '',
  result: result as TeamsChatMessage[],
});

type LocalRow = TeamsChatMessage & { __status?: 'pending' | 'failed'; __tempId?: string };

let qc: QueryClient;
const KEY = () => queryKeys.teams.chatMessages('19:abc');

beforeEach(() => {
  qc = new QueryClient();
  qc.setQueryData(KEY(), wrap([]));
});

describe('optimistic send', () => {
  it('shows the message immediately, marked pending', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    const [msg] = cached!.result;
    expect(msg.body.content).toBe('hello');
    expect(msg.__status).toBe('pending');
  });

  it('replaces the pending copy when the real message arrives, without duplicating', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });

    reconcilePendingMessage(qc, '19:abc', 't1', { id: 'real-1', body: { content: 'hello' } });

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    expect(cached!.result).toHaveLength(1);
    expect(cached!.result[0].id).toBe('real-1');
    expect(cached!.result[0].__status).toBeUndefined();
  });

  it('marks the message failed rather than removing it, so the text is not lost', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });

    markMessageFailed(qc, '19:abc', 't1');

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    const [msg] = cached!.result;
    expect(msg.__status).toBe('failed');
    expect(msg.body.content).toBe('hello');
  });

  it('keeps ordering stable when several sends are in flight', () => {
    // Cache order is newest-first (see useTeamsRealtime.ts / useTeamsRealtime.test.ts:
    // Graph returns messages newest-first, and TeamsChatView reverses `result`
    // before rendering). So `t2` ("second"), added after `t1`, is prepended
    // ahead of it: raw cache order is [second, first], which TeamsChatView
    // displays as "first" then "second". Reconciling `t1` replaces it IN
    // PLACE rather than moving it to the front, so a slow first send cannot
    // jump behind a fast second one and reorder the conversation.
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'first', contentType: 'text', authorId: 'me' });
    addPendingMessage(qc, '19:abc', { tempId: 't2', body: 'second', contentType: 'text', authorId: 'me' });

    reconcilePendingMessage(qc, '19:abc', 't1', { id: 'r1', body: { content: 'first' } });

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    expect(cached!.result.map((m) => m.body.content)).toEqual(['second', 'first']);
  });
});

describe('the timestamp on an optimistic row', () => {
  // Only the client clock is available here, and it is not trustworthy: a
  // skewed one mislabels the bubble and, worse, makes groupMessagesByDate in
  // TeamsChatView emit a whole spurious date separator above it. It vanishes
  // on reconcile -- unless the send FAILS, in which case the row and its
  // separator stay on screen.
  const NEWEST_CACHED = '2026-08-19T10:00:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers();
    qc.setQueryData(KEY(), wrap([{ id: 'm0', createdDateTime: NEWEST_CACHED }]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the client clock when it is ahead of the newest cached message', () => {
    vi.setSystemTime(new Date('2026-08-19T10:05:00.000Z'));

    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hi', contentType: 'text', authorId: null });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.createdDateTime).toBe('2026-08-19T10:05:00.000Z');
  });

  it('does not date the row before the message it is being placed above', () => {
    // Two days behind: the row would render above m0 while claiming to
    // predate it, and TeamsChatView would draw an "August 17" separator in
    // between. The newest cached message carries a server-assigned timestamp,
    // so it is a hard lower bound on the real present.
    vi.setSystemTime(new Date('2026-08-17T09:00:00.000Z'));

    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hi', contentType: 'text', authorId: null });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.createdDateTime).toBe(NEWEST_CACHED);
  });

  it('falls back to the client clock when the chat has nothing cached to clamp against', () => {
    vi.setSystemTime(new Date('2026-08-19T10:05:00.000Z'));
    qc.setQueryData(KEY(), wrap([]));

    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hi', contentType: 'text', authorId: null });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.createdDateTime).toBe('2026-08-19T10:05:00.000Z');
  });

  it('falls back to the client clock when the newest cached timestamp is unparseable', () => {
    vi.setSystemTime(new Date('2026-08-19T10:05:00.000Z'));
    qc.setQueryData(KEY(), wrap([{ id: 'm0', createdDateTime: 'not a date' }]));

    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hi', contentType: 'text', authorId: null });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.createdDateTime).toBe('2026-08-19T10:05:00.000Z');
  });
});

describe('a send into a chat that has no cache entry yet', () => {
  // The composer is live while the message pane still shows its loading
  // skeleton, and a chat whose fetch 401s (or whose user is not connected to
  // Microsoft) never gets a cache entry at all. addPendingMessage used to
  // no-op in both cases: nothing rendered, and because the row was never
  // inserted, the later markMessageFailed had nothing to mark either. The
  // composer clears itself synchronously on send, so the user's text was
  // simply gone -- no bubble, no failed row, no retry, no toast.
  const UNSEEDED = '19:not-fetched-yet';
  const unseededKey = () => queryKeys.teams.chatMessages(UNSEEDED);

  it('renders the message anyway, by seeding the envelope', () => {
    const fresh = new QueryClient();

    addPendingMessage(fresh, UNSEEDED, { tempId: 't1', body: 'typed early', contentType: 'text', authorId: 'me' });

    const cached = fresh.getQueryData<ApiResponse<LocalRow[]>>(unseededKey());
    expect(cached?.result).toHaveLength(1);
    expect(cached?.result[0].body.content).toBe('typed early');
    expect(cached?.result[0].__status).toBe('pending');
  });

  it('seeds an envelope of the same shape the query itself writes', () => {
    // If the seeded entry were not a well-formed ApiResponse, the next thing
    // to touch it (the component reading `.result`, preservePendingMessages
    // reading `existing.result`) would break instead of merging.
    const fresh = new QueryClient();

    addPendingMessage(fresh, UNSEEDED, { tempId: 't1', body: 'typed early', contentType: 'text', authorId: 'me' });

    const cached = fresh.getQueryData<ApiResponse<LocalRow[]>>(unseededKey());
    expect(cached).toMatchObject({ success: true, message: '' });
    expect(Array.isArray(cached?.result)).toBe(true);
  });

  it('can then be marked failed, so the text survives and offers a retry', () => {
    const fresh = new QueryClient();

    addPendingMessage(fresh, UNSEEDED, { tempId: 't1', body: 'typed early', contentType: 'text', authorId: 'me' });
    markMessageFailed(fresh, UNSEEDED, 't1');

    const cached = fresh.getQueryData<ApiResponse<LocalRow[]>>(unseededKey());
    expect(cached?.result[0].__status).toBe('failed');
    expect(cached?.result[0].body.content).toBe('typed early');
  });

  it('is carried forward, not duplicated, when the first real fetch finally lands', () => {
    const fresh = new QueryClient();
    addPendingMessage(fresh, UNSEEDED, { tempId: 't1', body: 'typed early', contentType: 'text', authorId: 'me' });

    const merged = preservePendingMessages(
      fresh,
      unseededKey(),
      wrap([{ id: 'm0', body: { content: 'earlier', contentType: 'text' } }]),
    ) as ApiResponse<LocalRow[]>;

    expect(merged.result.map((m) => m.id)).toEqual(['t1', 'm0']);
  });
});

describe('retry after a failed send', () => {
  it('flips the same row back to pending in place, rather than inserting a new one', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });
    markMessageFailed(qc, '19:abc', 't1');

    markMessagePending(qc, '19:abc', 't1');

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    expect(cached!.result).toHaveLength(1);
    expect(cached!.result[0].__tempId).toBe('t1');
    expect(cached!.result[0].__status).toBe('pending');
    expect(cached!.result[0].body.content).toBe('hello');
  });

  it('can then be reconciled by the same tempId once the retry succeeds', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });
    markMessageFailed(qc, '19:abc', 't1');
    markMessagePending(qc, '19:abc', 't1');

    reconcilePendingMessage(qc, '19:abc', 't1', { id: 'real-1', body: { content: 'hello' } });

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    expect(cached!.result).toHaveLength(1);
    expect(cached!.result[0].id).toBe('real-1');
    expect(cached!.result[0].__status).toBeUndefined();
  });

  it('flips back to failed correctly if the retry itself fails again', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });
    markMessageFailed(qc, '19:abc', 't1');
    markMessagePending(qc, '19:abc', 't1'); // user clicks Retry
    markMessageFailed(qc, '19:abc', 't1'); // the retry also fails

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    expect(cached!.result).toHaveLength(1);
    expect(cached!.result[0].__tempId).toBe('t1');
    expect(cached!.result[0].__status).toBe('failed');
    expect(cached!.result[0].body.content).toBe('hello');
  });

  it('matches on __tempId, not id, so a row whose id has been rewritten is still found', () => {
    // For a row that is still pending, `id` and `__tempId` are the same value,
    // so a helper that matched on `id` would pass every other test in this
    // file while being wrong. They diverge for any row reconcile has touched:
    // reconcilePendingMessage rewrites `id` to the server's and deliberately
    // keeps `__tempId`. `__tempId` is the correlation key by contract — it is
    // the only field guaranteed stable for the whole life of a send — so pin
    // it against a row in exactly that post-reconcile shape.
    qc.setQueryData(
      KEY(),
      wrap([
        {
          id: 'real-9',
          __tempId: 't1',
          __status: 'failed',
          body: { content: 'the failed send', contentType: 'text' },
        } as Partial<TeamsChatMessage>,
      ]),
    );

    markMessagePending(qc, '19:abc', 't1');
    expect(qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result[0].__status).toBe('pending');

    markMessageFailed(qc, '19:abc', 't1');
    expect(qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result[0].__status).toBe('failed');
  });

  it('keeps the row keyed on the same __tempId after reconciliation, so the UI does not remount it', () => {
    // __tempId is deliberately NOT cleared by reconcilePendingMessage (only
    // __status is): TeamsChatView keys rows on `__tempId ?? id` so the row's
    // React key stays stable across the pending -> reconciled transition,
    // even though `id` itself changes from the temp id to the real one.
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });

    reconcilePendingMessage(qc, '19:abc', 't1', { id: 'real-1', body: { content: 'hello' } });

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    expect(cached!.result[0].__tempId).toBe('t1');
    expect(cached!.result[0].id).toBe('real-1');
  });
});

describe('reconcile racing an independent delivery of the same message', () => {
  it('drops the redundant row rather than leaving two entries with the same real id', () => {
    // Simulates the race: the WebSocket push (applyTeamsEvent) or a poll
    // (preservePendingMessages) learned about this message under its real id
    // and already inserted a row for it, BEFORE this send's own onSuccess
    // fired to reconcile the still-pending row.
    qc.setQueryData(
      KEY(),
      wrap([
        { id: 'real-1', body: { content: 'hello', contentType: 'text' } },
      ]),
    );
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });

    reconcilePendingMessage(qc, '19:abc', 't1', { id: 'real-1', body: { content: 'hello' } });

    const cached = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY());
    expect(cached!.result).toHaveLength(1);
    expect(cached!.result.filter((m) => m.id === 'real-1')).toHaveLength(1);
    // The reconciled row (which keeps a stable __tempId key) is the survivor,
    // not the earlier server-only duplicate.
    expect(cached!.result[0].__tempId).toBe('t1');
  });
});

describe('a message deleted while its own send was still in flight', () => {
  // The full race, which the review flagged as leaving a resurrected message
  // on screen forever: send -> the WebSocket delivers `created` under the real
  // id while the POST is still open -> the user deletes it from the desktop
  // app -> `deleted` removes the real-id row -> the late onSuccess rewrites
  // the pending row to that same id, and its dedup finds nothing to drop.
  //
  // The message does come back. It is NOT permanent, and that is the reason
  // this is pinned here rather than fixed with a set of recently-deleted ids:
  // the reconciled row has no __status, so preservePendingMessages does not
  // carry it forward, and the next poll -- at most 120s later -- drops it.
  // Tracking deleted ids would trade a bounded, sub-second-race artefact for
  // permanent module state with its own eviction policy.
  it('reappears after the reconcile, and the next poll removes it again', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'oops', contentType: 'text', authorId: null });

    // The WebSocket's `created` arrives under the real id, then the delete.
    qc.setQueryData(KEY(), wrap([{ id: 'real-1' }, ...qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result]));
    qc.setQueryData(KEY(), {
      ...qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!,
      result: qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result.filter((m) => m.id !== 'real-1'),
    });

    reconcilePendingMessage(qc, '19:abc', 't1', { id: 'real-1', body: { content: 'oops' } });
    expect(qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result.map((m) => m.id)).toEqual([
      'real-1',
    ]);

    // The very next fetch is authoritative and no longer contains it.
    const merged = preservePendingMessages(qc, KEY(), wrap([{ id: 'm0' }]));

    expect(merged.result.map((m) => m.id)).toEqual(['m0']);
  });
});

describe('no-op guards for an unknown tempId or an unseeded chat', () => {
  it('reconcilePendingMessage is a no-op when the tempId is not in the cache', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });
    const before = qc.getQueryData(KEY());

    reconcilePendingMessage(qc, '19:abc', 'does-not-exist', { id: 'real-1', body: { content: 'x' } });

    expect(qc.getQueryData(KEY())).toEqual(before);
  });

  it('markMessageFailed is a no-op when the tempId is not in the cache', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });
    const before = qc.getQueryData(KEY());

    markMessageFailed(qc, '19:abc', 'does-not-exist');

    expect(qc.getQueryData(KEY())).toEqual(before);
  });

  it('markMessagePending is a no-op when the tempId is not in the cache', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });
    const before = qc.getQueryData(KEY());

    markMessagePending(qc, '19:abc', 'does-not-exist');

    expect(qc.getQueryData(KEY())).toEqual(before);
  });

  it('all three helpers no-op cleanly when the chat was never fetched (no cache entry at all)', () => {
    const freshQc = new QueryClient();
    const unseeded = queryKeys.teams.chatMessages('19:never-opened');

    expect(() => {
      reconcilePendingMessage(freshQc, '19:never-opened', 't1', { id: 'real-1', body: { content: 'x' } });
      markMessageFailed(freshQc, '19:never-opened', 't1');
      markMessagePending(freshQc, '19:never-opened', 't1');
    }).not.toThrow();

    expect(freshQc.getQueryData(unseeded)).toBeUndefined();
  });
});

// Deferred from Task 8's review: the 120s background poll (see
// useTeamsChatMessages / useChannelMessages in useTeams.ts) does a normal
// fetch-and-cache-write. Its response is server data only -- it has no
// concept of a local-only pending/failed row -- so a poll landing while one
// of those rows exists must not silently drop it from the cache.
describe('poll-vs-push race (preservePendingMessages)', () => {
  it('keeps a pending message when a background poll response lands without it', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'still sending', contentType: 'text', authorId: 'me' });

    // Simulates what the poll's queryFn receives from the server: it knows
    // nothing about the optimistic row that only exists in the cache.
    const serverResponse = wrap([{ id: 'm0', body: { content: 'earlier', contentType: 'text' } }]);
    const merged = preservePendingMessages(qc, KEY(), serverResponse) as ApiResponse<LocalRow[]>;

    expect(merged.result.some((m) => m.__tempId === 't1')).toBe(true);
    expect(merged.result.map((m) => m.id)).toEqual(['t1', 'm0']);
  });

  it('keeps a failed message across a poll too', () => {
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'oops', contentType: 'text', authorId: 'me' });
    markMessageFailed(qc, '19:abc', 't1');

    const merged = preservePendingMessages(qc, KEY(), wrap([])) as ApiResponse<LocalRow[]>;

    expect(merged.result).toHaveLength(1);
    expect(merged.result[0].__status).toBe('failed');
  });

  it('returns the fetched response unchanged when nothing is pending', () => {
    const serverResponse = wrap([{ id: 'm1', body: { content: 'hi', contentType: 'text' } }]);

    const merged = preservePendingMessages(qc, KEY(), serverResponse);

    expect(merged).toEqual(serverResponse);
  });

  it('a reconciled row (status cleared) is no longer carried forward as pending', () => {
    // Regression guard for the __status-based predicate: previously this
    // checked `__tempId` presence, and __tempId is now intentionally kept
    // after reconciliation as a stable UI key (see reconcilePendingMessage),
    // so the predicate must be __status, not __tempId, or every
    // ever-optimistic row would be treated as still-pending forever.
    //
    // The fetched page deliberately does NOT contain the reconciled row's id.
    // Asserting against a response that DOES contain it proves nothing: the
    // id-dedup below would drop the carried-forward copy anyway, so a
    // `__tempId`-based predicate passes such a test while being wrong. The
    // real scenario is a message deleted from the Teams desktop app between
    // the reconcile and the poll — it must stay deleted, not be resurrected
    // from the local cache.
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'hello', contentType: 'text', authorId: 'me' });
    reconcilePendingMessage(qc, '19:abc', 't1', { id: 'real-1', body: { content: 'hello' } });

    const serverResponse = wrap([{ id: 'm0', body: { content: 'earlier', contentType: 'text' } }]);
    const merged = preservePendingMessages(qc, KEY(), serverResponse);

    expect(merged.result.map((m) => m.id)).toEqual(['m0']);
    expect(merged).toEqual(serverResponse);
  });

  it('still carries a pending row forward when the fetched page shares no ids with it', () => {
    // The mirror of the test above, so neither one can be satisfied by a
    // predicate that simply never carries anything forward.
    addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'still sending', contentType: 'text', authorId: 'me' });

    const merged = preservePendingMessages(
      qc,
      KEY(),
      wrap([{ id: 'm0', body: { content: 'earlier', contentType: 'text' } }]),
    ) as ApiResponse<LocalRow[]>;

    expect(merged.result.map((m) => m.id)).toEqual(['t1', 'm0']);
  });

  // The envelope's `result` is typed `T[]`, but that is a claim about the API,
  // not a guarantee: every consumer of these queries writes
  // `messagesData?.result || []` precisely because a `{ success: true,
  // result: null }` body is a shape the backend can and does return. Moving
  // the merge INSIDE the queryFn moved it in front of those `|| []` guards,
  // so the same body that used to render as an empty chat now throws out of
  // the queryFn — and React Query retries a throwing queryFn three times
  // before settling on exactly the empty render it would have produced
  // straight away.
  describe('a fetched envelope whose result is not an array', () => {
    it('does not throw when a pending row has to be merged into it', () => {
      addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'still sending', contentType: 'text', authorId: 'me' });

      const nullResult = { success: true, message: '', result: null } as unknown as ApiResponse<
        TeamsChatMessage[]
      >;

      expect(() => preservePendingMessages(qc, KEY(), nullResult)).not.toThrow();
    });

    it('keeps the pending row and normalises the result to an array', () => {
      // Normalising rather than passing `null` back through matters beyond the
      // crash: `applyTeamsEvent` bails on `!existing?.result`, so leaving null
      // in the cache means realtime messages for this chat are dropped until a
      // later poll happens to return a list.
      addPendingMessage(qc, '19:abc', { tempId: 't1', body: 'still sending', contentType: 'text', authorId: 'me' });

      const nullResult = { success: true, message: '', result: null } as unknown as ApiResponse<
        TeamsChatMessage[]
      >;
      const merged = preservePendingMessages(qc, KEY(), nullResult) as ApiResponse<LocalRow[]>;

      expect(merged.result.map((m) => m.id)).toEqual(['t1']);
    });

    it('normalises to an empty array even when there is nothing pending to merge', () => {
      const nullResult = { success: true, message: '', result: null } as unknown as ApiResponse<
        TeamsChatMessage[]
      >;

      const merged = preservePendingMessages(qc, KEY(), nullResult);

      expect(merged.result).toEqual([]);
    });
  });

  it('prefers the fetched (server) copy over a local row sharing the same id', () => {
    // Defensive dedup requested in review: even though a still-pending row's
    // id is always its tempId and can never naturally collide with a real
    // Graph id (so this exact path is not reachable through normal use
    // today), preservePendingMessages must never hand back two rows sharing
    // an id.
    qc.setQueryData(
      KEY(),
      wrap([{ id: 'dup-1', __status: 'pending', body: { content: 'stale local copy', contentType: 'text' } }]),
    );

    const serverResponse = wrap([{ id: 'dup-1', body: { content: 'authoritative server copy', contentType: 'text' } }]);
    const merged = preservePendingMessages(qc, KEY(), serverResponse);

    expect(merged.result).toHaveLength(1);
    expect(merged.result[0].body.content).toBe('authoritative server copy');
  });
});
