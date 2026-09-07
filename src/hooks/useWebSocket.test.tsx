import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWebSocket } from './useWebSocket';
import { queryKeys } from '../lib/queryKeys';
import type { ApiResponse } from '../types/api';
import type { TeamsChatMessage } from '../services/teams';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { custom: vi.fn(), dismiss: vi.fn() }),
}));

/**
 * Stand-in for the browser's WebSocket. The hook only ever assigns the four
 * `on*` handlers and calls `close()`, so tests drive it by invoking those
 * handlers directly — the same way the browser would.
 */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static latest(): FakeWebSocket {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  close = vi.fn();

  constructor(
    readonly url: string,
    readonly protocols?: string | string[],
  ) {
    FakeWebSocket.instances.push(this);
  }

  /** What the browser does on a close, in the order it does it. */
  simulateClose(code: number, reason = ''): void {
    this.onclose?.({ code, reason });
  }

  receive(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

const CHAT_ID = '19:abc';
const CHAT_KEY = () => queryKeys.teams.chatMessages(CHAT_ID);

const teamsFrame = (over: Record<string, unknown> = {}) => ({
  type: 'TEAMS_MESSAGE',
  changeType: 'created',
  message: {
    id: 'm1', chatId: CHAT_ID, channelId: null, teamId: null,
    body: 'hello', contentType: 'text',
    from: { id: 'oid-1', displayName: 'Priya' },
    createdDateTime: '2026-08-06T10:00:00Z',
    lastEditedDateTime: null, replyToId: null,
    ...over,
  },
});

let qc: QueryClient;
let invalidate: ReturnType<typeof vi.spyOn>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

const render = () => renderHook(() => useWebSocket(), { wrapper });

/** Let every scheduled reconnect that is ever going to fire, fire. */
const runAllBackoffs = () => {
  act(() => {
    vi.advanceTimersByTime(120_000);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  FakeWebSocket.instances = [];
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
  document.cookie = '_token=a-jwt';
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  invalidate = vi.spyOn(qc, 'invalidateQueries');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useWebSocket — connection lifecycle', () => {
  it('opens one socket, passing the auth token as the subprotocol', () => {
    render();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.latest().url).toMatch(/\/ws$/);
    expect(FakeWebSocket.latest().protocols).toBe('a-jwt');
  });

  it('reconnects after an abnormal close, which is what the backoff exists for', () => {
    render();
    act(() => {
      FakeWebSocket.latest().simulateClose(1006);
    });

    runAllBackoffs();

    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
  });

  it('reconnects when the server goes away for a restart', () => {
    render();
    act(() => {
      FakeWebSocket.latest().simulateClose(1001, 'Server shutting down');
    });

    runAllBackoffs();

    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
  });

  it('does not reconnect when the server closed this socket to make way for another tab', () => {
    // The backend keeps one socket per user and closes the previous one with
    // 1000 when a second tab connects. Reconnecting on that made two open
    // tabs ping-pong forever at ~1s cadence -- and since onopen resets the
    // retry counter, MAX_RETRIES never stopped it. Each tab then received
    // roughly half the messages, with the rest landing in a tab nobody was
    // looking at.
    render();

    act(() => {
      FakeWebSocket.latest().simulateClose(1000, 'Replaced by a newer connection');
    });
    runAllBackoffs();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('picks the socket back up when the user returns to the replaced tab', () => {
    // The replaced tab is deliberately left on the 120s poll rather than
    // fighting for the socket. It should not stay that way forever: the tab
    // the user is actually looking at is the one that should hold it.
    render();
    act(() => {
      FakeWebSocket.latest().simulateClose(1000, 'Replaced by a newer connection');
    });
    runAllBackoffs();

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('does not retry after the server rejects the credential', () => {
    // 1008 is the backend's code for a missing or invalid token. Ten retries
    // with the same rejected token cannot succeed.
    render();

    act(() => {
      FakeWebSocket.latest().simulateClose(1008, 'Invalid or Expired Token');
    });
    runAllBackoffs();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe('useWebSocket — the auth cookie is not readable at mount', () => {
  /** Longer than the whole retry budget (1+2+4+8+16+30×5 = 181s). */
  const runEveryRetry = () => {
    act(() => {
      vi.advanceTimersByTime(600_000);
    });
  };

  const clearToken = () => {
    document.cookie = '_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  };

  it('opens no socket while there is no token', () => {
    clearToken();

    render();

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('connects once the cookie shows up, instead of giving up for the whole session', () => {
    // `if (!token) return` scheduled nothing, so a mount that raced the cookie
    // -- a hard reload, or the redirect straight after login -- left that tab
    // with no socket at all and no path back to one. The only symptom is chat
    // running on the 120s poll, which is exactly what this feature replaced,
    // so it would not be reported as broken.
    clearToken();
    render();
    expect(FakeWebSocket.instances).toHaveLength(0);

    document.cookie = '_token=a-jwt';
    runEveryRetry();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.latest().protocols).toBe('a-jwt');
  });

  it('stops after the retry budget rather than reading the cookie forever', () => {
    // A genuinely logged-out tab must not spin for the rest of its life.
    clearToken();
    render();
    runEveryRetry();

    document.cookie = '_token=a-jwt';
    runEveryRetry();

    expect(FakeWebSocket.instances).toHaveLength(0);
  });
});

describe('useWebSocket — frame routing', () => {
  it('applies a Teams message to the chat cache', () => {
    qc.setQueryData(CHAT_KEY(), { success: true, message: '', result: [] });
    render();

    act(() => {
      FakeWebSocket.latest().receive(teamsFrame());
    });

    const cached = qc.getQueryData<ApiResponse<TeamsChatMessage[]>>(CHAT_KEY());
    expect(cached?.result.map((m) => m.id)).toEqual(['m1']);
  });

  it('never toasts or refetches notifications for a Teams message', () => {
    qc.setQueryData(CHAT_KEY(), { success: true, message: '', result: [] });
    render();

    act(() => {
      FakeWebSocket.latest().receive(teamsFrame());
    });

    expect(toast.custom).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('drops a malformed Teams frame instead of passing it on as a notification', () => {
    // `{"type":"TEAMS_MESSAGE"}` with no message used to be handed downstream
    // typed as a complete event; it must not fall through to the toast path
    // either, or a broken contract becomes a blank toast.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render();

    act(() => {
      FakeWebSocket.latest().receive({ type: 'TEAMS_MESSAGE', changeType: 'created' });
    });

    expect(toast.custom).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['notifications'] });
    warn.mockRestore();
  });

  it('drops a Teams frame with a malformed sender instead of throwing out of the handler', () => {
    // Without validation at the boundary this reaches `toCached`, which reads
    // `message.from.id` and throws a TypeError straight out of onmessage.
    // There is no try/catch around the routing any more (only around the JSON
    // parse), so an unhandled rejection here is what a schema drift on one
    // field would actually look like.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    qc.setQueryData(CHAT_KEY(), { success: true, message: '', result: [] });
    render();

    expect(() =>
      act(() => {
        FakeWebSocket.latest().receive(teamsFrame({ from: null }));
      }),
    ).not.toThrow();

    expect(qc.getQueryData<ApiResponse<TeamsChatMessage[]>>(CHAT_KEY())?.result).toHaveLength(0);
    warn.mockRestore();
  });

  it('ignores the CONNECTED handshake', () => {
    render();

    act(() => {
      FakeWebSocket.latest().receive({ type: 'CONNECTED', userId: '7' });
    });

    expect(toast.custom).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('ignores a frame that carries no notification text at all', () => {
    // The moment the backend adds a second event type -- a read receipt, a
    // presence update, TEAMS_REACTION -- every user got a toast reading
    // "New notification" (NotificationToast's fallback when it has neither a
    // title nor a message) plus a spurious refetch.
    render();

    act(() => {
      FakeWebSocket.latest().receive({ type: 'TEAMS_REACTION', messageId: 'm1' });
      FakeWebSocket.latest().receive({ type: 'PRESENCE', status: 'Away' });
      FakeWebSocket.latest().receive({ userId: '7' });
    });

    expect(toast.custom).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('ignores a realtime frame even when it carries displayable text', () => {
    // The TEAMS_* namespace belongs to the chat cache. Whatever fields those
    // frames grow, they must never reach the notification queries or the
    // toast -- a typing indicator is not a notification.
    render();

    act(() => {
      FakeWebSocket.latest().receive({ type: 'TEAMS_TYPING', message: 'Priya is typing' });
    });

    expect(toast.custom).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('toasts a notification and refetches the notification queries', () => {
    render();

    act(() => {
      FakeWebSocket.latest().receive({
        type: 'TASK_ASSIGNED',
        title: 'New task',
        message: 'Ship the thing',
      });
    });

    expect(toast.custom).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('toasts notification types the frontend has no icon config for', () => {
    // The notification type enum is defined on the backend and is well ahead
    // of NOTIFICATION_CONFIG/PRIORITY_MAP here: INVOICE_SENT, CREDIT_NOTE_ISSUED
    // and TASK_REVIEW_READY are all real, deliverable types with no entry in
    // either map. Gating the toast on those maps would silently swallow them.
    render();

    act(() => {
      FakeWebSocket.latest().receive({
        type: 'CREDIT_NOTE_ISSUED',
        message: 'A credit note was issued',
      });
    });

    expect(toast.custom).toHaveBeenCalledTimes(1);
  });

  it('survives a frame that is not JSON at all', () => {
    render();

    expect(() =>
      act(() => {
        FakeWebSocket.latest().onmessage?.({ data: 'not json' });
      }),
    ).not.toThrow();
    expect(toast.custom).not.toHaveBeenCalled();
  });
});
