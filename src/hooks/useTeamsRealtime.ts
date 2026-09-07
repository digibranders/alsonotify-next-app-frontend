import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { ApiResponse } from '../types/api';

/**
 * Cache writes for realtime Teams events.
 *
 * These are plain functions taking a QueryClient rather than hooks, so they
 * can be tested without rendering and called from the WebSocket handler
 * (useWebSocket.ts), which is not inside a component.
 *
 * IMPORTANT — cache shape: `useTeamsChatMessages` / `useChannelMessages`
 * (see useTeams.ts) cache the raw API envelope `ApiResponse<Message[]>`
 * (`{ success, message, result }`, see services/teams.ts and types/api.ts),
 * not a bare array. Graph also returns messages newest-first — TeamsChatView
 * reverses `result` before rendering — so a newly created message is
 * PREPENDED to `result`, matching that ordering.
 */

/** Mirrors the backend's TeamsEventAttachment (teams-event.ts). */
export interface TeamsEventAttachment {
  id: string | null;
  name: string | null;
  contentType: string | null;
  contentUrl: string | null;
  content: string | null;
  thumbnailUrl: string | null;
}

/** Mirrors the backend's TeamsEventReaction (teams-event.ts). */
export interface TeamsEventReaction {
  reactionType: string | null;
  createdDateTime: string | null;
  user: { id: string | null; displayName: string | null };
}

export interface TeamsEventMessage {
  id: string;
  chatId: string | null;
  channelId: string | null;
  teamId: string | null;
  body: string;
  contentType: string;
  /** 'message' | 'systemEventMessage' | anything Graph adds. A plain string on purpose. */
  messageType: string;
  from: { id: string | null; displayName: string | null };
  createdDateTime: string;
  lastEditedDateTime: string | null;
  /** Set when Graph delivers a soft delete as an update rather than as `changeType: 'deleted'`. */
  deletedDateTime: string | null;
  replyToId: string | null;
  attachments: TeamsEventAttachment[];
  reactions: TeamsEventReaction[];
}

export interface TeamsEvent {
  type: 'TEAMS_MESSAGE';
  changeType: string;
  message: TeamsEventMessage;
}

/** Shape the Teams UI already renders (see TeamsChatMessage / ChannelMessage in services/teams.ts). */
interface CachedMessage {
  id: string;
  messageType?: string;
  body?: { content?: string; contentType?: string };
  from?: { user?: { id?: string | null; displayName?: string | null } | null } | null;
  createdDateTime?: string;
  lastEditedDateTime?: string | null;
  replyToId?: string | null;
  attachments?: TeamsEventAttachment[];
  reactions?: TeamsEventReaction[];
  /** Local-only: present while a send is in flight or has failed. Cleared once reconciled. */
  __status?: 'pending' | 'failed';
  /**
   * Correlates an optimistic message with its eventual server copy, and with
   * retries of the same send. Deliberately NOT cleared once reconciled (only
   * `__status` is): the UI keys rows on `__tempId ?? id` so a message that
   * started life as an optimistic row keeps the SAME React key through
   * pending -> failed -> retried -> reconciled, instead of remounting when
   * `id` swaps from the temp id to the real one.
   */
  __tempId?: string;
}

type MessagesResponse = ApiResponse<CachedMessage[]>;

/**
 * Report a broken contract on the realtime channel.
 *
 * These are "the shape we agreed on changed" conditions, not routine ones,
 * and they are otherwise completely invisible: the backend discards
 * `pushToUser`'s return value, so nothing is logged there either, and the
 * 120s poll papers over the symptom well enough that realtime could be dead
 * for everyone without a single signal. Dev-only, because in production the
 * useful action is a Sentry issue rather than a console line, and there is no
 * client-side reporter wired to this module.
 *
 * Never pass message bodies: chat content must not reach a console log or a
 * Sentry breadcrumb.
 */
function warnContractBreak(reason: string, detail: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') return;
  console.warn(`[teams-realtime] dropped an event: ${reason}`, detail);
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

/** A field of the frame, or null if it is anything other than a string. */
const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

/** Only plain objects; anything else in the array is dropped, not emitted as a hole. */
function objectEntries(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === 'object' && entry !== null && !Array.isArray(entry),
  );
}

function toEventAttachment(raw: Record<string, unknown>): TeamsEventAttachment {
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    contentType: asString(raw.contentType),
    contentUrl: asString(raw.contentUrl),
    content: asString(raw.content),
    thumbnailUrl: asString(raw.thumbnailUrl),
  };
}

function toEventReaction(raw: Record<string, unknown>): TeamsEventReaction {
  const user =
    typeof raw.user === 'object' && raw.user !== null ? (raw.user as Record<string, unknown>) : {};

  return {
    reactionType: asString(raw.reactionType),
    createdDateTime: asString(raw.createdDateTime),
    user: { id: asString(user.id), displayName: asString(user.displayName) },
  };
}

/**
 * Validate one inbound socket frame.
 *
 * The frame is `JSON.parse(event.data)` — genuinely unknown data crossing a
 * trust boundary. Asserting it to `TeamsEvent` and narrowing on `type` alone
 * (what useWebSocket used to do) let `{"type":"TEAMS_MESSAGE"}` with no
 * `message` through, typed as a complete event: the type annotation was
 * decorative and `applyTeamsEvent`'s runtime re-checks were load-bearing.
 * With this, the type means something and those checks become defence in
 * depth.
 *
 * Returns a fresh literal with fixed keys rather than the parsed object, so
 * no field we have not reviewed — the backend's `clientState` secret, say, if
 * its own allowlist ever regressed — can ride along into the cache.
 *
 * Strict on purpose: the backend's `toTeamsEvent` normalises every field to a
 * string or null with defaults, so a real frame always satisfies this. The
 * one field it does not check is `id`, which is exactly the drift this
 * catches.
 */
export function parseTeamsEvent(raw: unknown): TeamsEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const frame = raw as Record<string, unknown>;
  // Not a Teams frame at all (a notification, a future control frame): not a
  // contract break, and warning would fire on every notification.
  if (frame.type !== 'TEAMS_MESSAGE') return null;

  const reject = (reason: string): null => {
    warnContractBreak(reason, { changeType: frame.changeType });
    return null;
  };

  if (!isString(frame.changeType)) return reject('changeType is not a string');
  if (typeof frame.message !== 'object' || frame.message === null) {
    return reject('frame carries no message');
  }

  const message = frame.message as Record<string, unknown>;
  if (typeof message.from !== 'object' || message.from === null) {
    return reject('message carries no sender');
  }
  const from = message.from as Record<string, unknown>;

  if (!isString(message.id) || message.id === '') return reject('message id is missing');
  if (!isNullableString(message.chatId)) return reject('chatId is not a string or null');
  if (!isNullableString(message.channelId)) return reject('channelId is not a string or null');
  if (!isNullableString(message.teamId)) return reject('teamId is not a string or null');
  if (!isString(message.body)) return reject('body is not a string');
  if (!isString(message.contentType)) return reject('contentType is not a string');
  if (!isNullableString(from.id)) return reject('sender id is not a string or null');
  if (!isNullableString(from.displayName)) return reject('sender name is not a string or null');
  if (!isString(message.createdDateTime)) return reject('createdDateTime is not a string');
  if (!isNullableString(message.lastEditedDateTime)) {
    return reject('lastEditedDateTime is not a string or null');
  }
  if (!isNullableString(message.replyToId)) return reject('replyToId is not a string or null');

  return {
    type: 'TEAMS_MESSAGE',
    changeType: frame.changeType,
    message: {
      id: message.id,
      chatId: message.chatId,
      channelId: message.channelId,
      teamId: message.teamId,
      body: message.body,
      contentType: message.contentType,
      from: { id: from.id, displayName: from.displayName },
      createdDateTime: message.createdDateTime,
      lastEditedDateTime: message.lastEditedDateTime,
      replyToId: message.replyToId,
      // The four fields the backend added so a message can actually be
      // rendered (attachments, system messages, reactions, soft deletes).
      // Normalised on absence rather than rejected: the two repos deploy
      // separately, so a frontend that ships first must not drop every
      // realtime message until the backend catches up. A wrong type gets the
      // same safe default -- normalising is not the same as passing through.
      messageType: asString(message.messageType) ?? 'message',
      deletedDateTime: asString(message.deletedDateTime),
      attachments: objectEntries(message.attachments).map(toEventAttachment),
      reactions: objectEntries(message.reactions).map(toEventReaction),
    },
  };
}

function keyFor(message: TeamsEventMessage) {
  if (message.chatId) return queryKeys.teams.chatMessages(message.chatId);
  if (message.teamId && message.channelId) {
    return queryKeys.teams.channelMessages(message.teamId, message.channelId);
  }
  return null;
}

function toCached(message: TeamsEventMessage): CachedMessage {
  return {
    id: message.id,
    // Was hardcoded 'message', which rendered "Priya added Sam to the chat" as
    // an ordinary bubble with an empty body.
    messageType: message.messageType,
    body: { content: message.body, contentType: message.contentType },
    from: { user: { id: message.from.id, displayName: message.from.displayName } },
    createdDateTime: message.createdDateTime,
    lastEditedDateTime: message.lastEditedDateTime,
    replyToId: message.replyToId,
    // Both lists are authoritative for the moment the notification was raised,
    // so they overwrite what was cached rather than merging into it -- a
    // removed reaction has to be able to disappear. Dropping them was what
    // made a shared file (body `<attachment id="..."></attachment>` and
    // nothing else) render to nothing while still counting as a row.
    attachments: message.attachments,
    reactions: message.reactions,
  };
}

/**
 * Apply one realtime event to the cache.
 *
 * Silently ignores conversations that are not cached: the user has not opened
 * that chat/channel, so there is nothing to update and it will be fetched
 * fresh when they do.
 */
export function applyTeamsEvent(queryClient: QueryClient, event: TeamsEvent): void {
  if (event?.type !== 'TEAMS_MESSAGE' || !event.message) return;

  // The backend's `toTeamsEvent` sets `id: raw.id` straight from
  // `JSON.parse`'d Graph payload with no schema validation, so a malformed
  // or schema-drifted webhook can reach here with a missing id. Without this
  // guard, `id: undefined` would collide with any other `id: undefined` row
  // already in the cache (silent overwrite) and produce a duplicate React
  // key in TeamsChatView/TeamsChannelView. Best-effort realtime channel: a
  // bad frame should be a silent no-op, not corrupt the cache.
  if (typeof event.message.id !== 'string' || !event.message.id) {
    warnContractBreak('message id is missing', { changeType: event.changeType });
    return;
  }

  const key = keyFor(event.message);
  if (!key) {
    // Neither a chat nor a complete channel identity. If Graph ever stops
    // populating chatId, EVERY realtime message lands here and chat silently
    // reverts to the poll — the exact degradation this feature replaced.
    warnContractBreak('event belongs to no conversation', {
      changeType: event.changeType,
      id: event.message.id,
    });
    return;
  }

  const existing = queryClient.getQueryData<MessagesResponse>(key);
  if (!existing?.result) return;

  // Graph delivers some deletions as `changeType: 'updated'` carrying
  // `deletedDateTime` rather than as a delete, so keying on changeType alone
  // left the message on screen and every subsequent update re-wrote it.
  if (event.changeType === 'deleted' || event.message.deletedDateTime) {
    queryClient.setQueryData<MessagesResponse>(key, {
      ...existing,
      result: existing.result.filter((m) => m.id !== event.message.id),
    });
    return;
  }

  const incoming = toCached(event.message);
  const at = existing.result.findIndex((m) => m.id === incoming.id);

  if (at >= 0) {
    // Already present. Graph sends `created` and `updated` for the same id, and
    // our own optimistic copy may have been reconciled first, so replacing in
    // place is correct for both edits and duplicate deliveries.
    const nextResult = [...existing.result];
    nextResult[at] = { ...existing.result[at], ...incoming, __status: undefined };
    queryClient.setQueryData<MessagesResponse>(key, { ...existing, result: nextResult });
    return;
  }

  // API returns messages newest-first; prepend to match that ordering.
  queryClient.setQueryData<MessagesResponse>(key, {
    ...existing,
    result: [incoming, ...existing.result],
  });
}

/**
 * When to say an optimistic row was sent.
 *
 * The client clock is the only clock this module has, and it is not
 * trustworthy: a skewed one mislabels the bubble's time and, worse, makes
 * `groupMessagesByDate` in TeamsChatView draw an entire spurious
 * TeamsDateSeparator above it. That is transient on a successful send, but a
 * FAILED send leaves the row — and the separator — on screen indefinitely.
 *
 * Clamped so the row is never dated before the message it is being placed
 * above. The newest cached message carries a server-assigned timestamp, which
 * makes it a hard lower bound on the real present, so a clock running behind
 * is fully corrected. A clock running ahead is not fixable from here: nothing
 * in the cache bounds the present from above, and a server time reference
 * would have to come from the transport. Left as-is rather than guessed at.
 */
function optimisticSentAt(newest: CachedMessage | undefined): string {
  const now = Date.now();
  const floor = newest?.createdDateTime ? Date.parse(newest.createdDateTime) : NaN;
  return new Date(Number.isNaN(floor) ? now : Math.max(now, floor)).toISOString();
}

/**
 * Insert a message optimistically, before the server has confirmed it.
 *
 * Seeds the envelope when the chat has no cache entry, rather than no-opping
 * as the other helpers do. The composer clears the editor synchronously on
 * send, so a no-op here loses the user's text outright: nothing renders, and
 * because no row was inserted, the later `markMessageFailed` has nothing to
 * mark either — no failed bubble, no retry affordance, no toast. Two ordinary
 * paths reach it: typing during the 1-3s initial fetch (the composer is live
 * while the message pane still shows its skeleton), and any chat whose fetch
 * 401s or whose user is not connected to Microsoft, where EVERY send would be
 * invisible.
 *
 * The seeded value is a well-formed `ApiResponse` envelope, the same shape
 * the query writes, so the in-flight or next fetch merges over it through
 * `preservePendingMessages` exactly as it would over a fetched page.
 */
export function addPendingMessage(
  queryClient: QueryClient,
  chatId: string,
  input: {
    tempId: string;
    body: string;
    /**
     * Required, not defaulted: the caller always knows what the composer
     * produced, and guessing here is exactly the bug this replaced — a
     * hardcoded 'text' rendered the raw `<div>` markup of any multi-line or
     * formatted message in the sender's own bubble.
     */
    contentType: 'html' | 'text';
    /**
     * The sender's Azure AD object id, or `null` when we do not have one —
     * which is every user today, since no backend path writes `azure_oid`.
     * Nullable rather than defaulted to `''` so the row says "unknown sender"
     * instead of claiming a sender id that matches nothing.
     */
    authorId: string | null;
  },
): void {
  const key = queryKeys.teams.chatMessages(chatId);
  const cached = queryClient.getQueryData<MessagesResponse>(key);
  const existing: MessagesResponse = cached?.result
    ? cached
    : { success: true, message: '', result: [] };

  const pending: CachedMessage = {
    id: input.tempId,
    __tempId: input.tempId,
    __status: 'pending',
    messageType: 'message',
    body: { content: input.body, contentType: input.contentType },
    from: { user: { id: input.authorId, displayName: null } },
    createdDateTime: optimisticSentAt(existing.result[0]),
    lastEditedDateTime: null,
    replyToId: null,
  };

  // Newest-first ordering, same as the server would return once it lands.
  queryClient.setQueryData<MessagesResponse>(key, {
    ...existing,
    result: [pending, ...existing.result],
  });
}

/**
 * Swap the optimistic copy for the server's, IN PLACE.
 *
 * Position is preserved rather than moved to the front, so a slow first send
 * cannot jump behind a fast second one and reorder the conversation.
 * `__tempId` is deliberately NOT cleared (only `__status` is): it stays as a
 * stable React key across the pending -> reconciled transition (see
 * `CachedMessage.__tempId`'s doc comment), and `applyTeamsEvent`'s
 * already-present branch relies on the same convention.
 *
 * Also guards against a race with the WebSocket push or the 120s poll: either
 * can independently learn about this same message under its real id BEFORE
 * this reconcile runs (see `preservePendingMessages` / `applyTeamsEvent`),
 * leaving a second, redundant row already sitting in the cache under
 * `serverMessage.id`. Once this row is rewritten to that same id, any OTHER
 * row that already carries it is dropped, so the conversation ends up with
 * one entry (and one React key) for the message, not two.
 */
export function reconcilePendingMessage(
  queryClient: QueryClient,
  chatId: string,
  tempId: string,
  serverMessage: { id: string; body?: { content?: string } },
): void {
  const key = queryKeys.teams.chatMessages(chatId);
  const existing = queryClient.getQueryData<MessagesResponse>(key);
  if (!existing?.result) return;

  const at = existing.result.findIndex((m) => m.__tempId === tempId);
  if (at < 0) return;

  const reconciled: CachedMessage = {
    ...existing.result[at],
    ...serverMessage,
    __status: undefined,
  };

  const withReconciled = [...existing.result];
  withReconciled[at] = reconciled;
  const nextResult = withReconciled.filter((m, i) => i === at || m.id !== reconciled.id);

  queryClient.setQueryData<MessagesResponse>(key, { ...existing, result: nextResult });
}

/**
 * Mark a send as failed.
 *
 * The message is kept, not removed: dropping it would throw away text the
 * user typed. The UI offers a retry against the same entry.
 *
 * Unlike `addPendingMessage` this does NOT seed a missing envelope, and must
 * not: it is given a `tempId`, never the text, so the row it could invent
 * would be a blank failed bubble with nothing to retry — strictly worse than
 * no row. It does not need to, either: `addPendingMessage` now always inserts
 * the row this marks, so by the time a send can fail the entry exists.
 */
export function markMessageFailed(
  queryClient: QueryClient,
  chatId: string,
  tempId: string,
): void {
  const key = queryKeys.teams.chatMessages(chatId);
  const existing = queryClient.getQueryData<MessagesResponse>(key);
  if (!existing?.result) return;

  queryClient.setQueryData<MessagesResponse>(key, {
    ...existing,
    result: existing.result.map((m) => (m.__tempId === tempId ? { ...m, __status: 'failed' } : m)),
  });
}

/**
 * Retry a failed send: flip the same row back to `pending` IN PLACE.
 *
 * The retry re-runs the mutation with the failed row's existing `tempId`
 * rather than a freshly generated one, so this must find that row by
 * `__tempId` and flip its status, not insert a new one — otherwise a retry
 * would leave the stale failed row behind and add a second, duplicate entry
 * for the same piece of text.
 */
export function markMessagePending(
  queryClient: QueryClient,
  chatId: string,
  tempId: string,
): void {
  const key = queryKeys.teams.chatMessages(chatId);
  const existing = queryClient.getQueryData<MessagesResponse>(key);
  if (!existing?.result) return;

  queryClient.setQueryData<MessagesResponse>(key, {
    ...existing,
    result: existing.result.map((m) => (m.__tempId === tempId ? { ...m, __status: 'pending' } : m)),
  });
}

/**
 * Guard against the poll-vs-push race: `useTeamsChatMessages` / `useChannelMessages`
 * poll every 120s as a safety net behind the WebSocket (see useTeams.ts). That
 * poll's response is server data only — it has no concept of a pending/failed
 * row that exists only in the local cache — so writing it over the cache
 * verbatim would silently erase any in-flight or failed optimistic send.
 *
 * Call this with the freshly fetched response INSIDE the query's `queryFn`,
 * before it is returned (and therefore before React Query writes it to the
 * cache): any row still genuinely local-only (`__status` is `pending` or
 * `failed` — NOT merely `__tempId` present, since that field now survives
 * reconciliation as a stable key, see `CachedMessage.__tempId`) is carried
 * forward, newest-first ahead of the fetched page, matching the ordering
 * `addPendingMessage` uses.
 *
 * Deduped by `id`, fetched (server) rows winning over carried-forward local
 * rows: a still-pending row's `id` is always its `tempId`, which can never
 * collide with a real Graph id, so this cannot happen through this merge
 * alone today. It is kept anyway as a cheap, defensive guarantee that this
 * function never hands back two rows sharing an `id` — the actual fix for
 * the id-collision race (a pending row's `tempId` being rewritten to an id
 * that's already sitting in the cache from an independent poll/WebSocket
 * delivery) lives in `reconcilePendingMessage`, which is the point where
 * that collision can first occur.
 *
 * `fetched.result` is typed `T[]` but treated as untrusted: the API can answer
 * `{ success: true, result: null }`, which every consumer of these queries
 * already absorbs with `messagesData?.result || []`. Running this merge inside
 * the queryFn puts it AHEAD of those guards, where the same body would throw —
 * and a throwing queryFn costs three React Query retries before settling on
 * the empty render it would otherwise have produced immediately. Normalised to
 * `[]` rather than passed through, so `applyTeamsEvent`'s `!existing?.result`
 * bail-out does not then drop every realtime message for that conversation.
 */
export function preservePendingMessages<T extends { id: string; __status?: 'pending' | 'failed' }>(
  queryClient: QueryClient,
  key: QueryKey,
  fetched: ApiResponse<T[]>,
): ApiResponse<T[]> {
  const fetchedRows = Array.isArray(fetched.result) ? fetched.result : [];

  const existing = queryClient.getQueryData<ApiResponse<T[]>>(key);
  const pendingOrFailed =
    existing?.result?.filter((m) => m.__status === 'pending' || m.__status === 'failed') ?? [];

  const fetchedIds = new Set(fetchedRows.map((m) => m.id));
  const localOnly = pendingOrFailed.filter((m) => !fetchedIds.has(m.id));

  return { ...fetched, result: [...localOnly, ...fetchedRows] };
}
