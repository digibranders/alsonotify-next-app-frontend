import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSendTeamsChatMessage, useChannelMessages, useTeamsChatMessages } from './useTeams';
import { queryKeys } from '../lib/queryKeys';
import * as TeamsService from '../services/teams';
import type { ApiResponse } from '../types/api';
import type { TeamsChatMessage } from '../services/teams';

vi.mock('../services/teams');

/**
 * `azure_oid` is nullable on the backend User model and is not written by any
 * code path today, so tests must be able to run both states.
 */
let mockUser: Record<string, unknown> | null = { id: 7, azure_oid: 'azure-me' };
vi.mock('./useCurrentUser', async () => {
  const actual = await vi.importActual<typeof import('./useCurrentUser')>('./useCurrentUser');
  return {
    ...actual,
    useCurrentUser: () => ({ user: mockUser, isLoading: false, error: null }),
  };
});

const CHAT_ID = '19:abc';
const KEY = () => queryKeys.teams.chatMessages(CHAT_ID);

type LocalRow = TeamsChatMessage & { __status?: 'pending' | 'failed'; __tempId?: string };

const wrap = (result: Partial<TeamsChatMessage>[]): ApiResponse<TeamsChatMessage[]> => ({
  success: true,
  message: '',
  result: result as TeamsChatMessage[],
});

let qc: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: 7, azure_oid: 'azure-me' };
  qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  qc.setQueryData(KEY(), wrap([]));
});

describe('useSendTeamsChatMessage — contentType', () => {
  it('sends the composer\'s contentType to the API instead of always saying html', async () => {
    // TeamsMessageInput reports 'text' for a plain message and 'html' only
    // when the contenteditable actually produced markup. Discarding that and
    // letting the service default to "html" means every plain message is
    // posted to Graph as HTML.
    const send = vi.mocked(TeamsService.sendTeamsChatMessage);
    send.mockResolvedValue(wrap([]) as unknown as ApiResponse<TeamsChatMessage>);

    const { result } = renderHook(() => useSendTeamsChatMessage(), { wrapper });
    act(() => {
      result.current.mutate({ chatId: CHAT_ID, content: 'plain text', contentType: 'text' });
    });

    await waitFor(() => expect(send).toHaveBeenCalledWith(CHAT_ID, 'plain text', 'text'));
  });

  it('renders the optimistic bubble with the same contentType that was sent', () => {
    // Hardcoding 'text' on the pending row showed the user the literal
    // `<div>second line</div>` of their own multi-line message. It
    // self-corrects on reconcile, but a FAILED send keeps showing raw markup
    // for as long as the row is on screen.
    vi.mocked(TeamsService.sendTeamsChatMessage).mockResolvedValue(
      wrap([]) as unknown as ApiResponse<TeamsChatMessage>,
    );

    const { result } = renderHook(() => useSendTeamsChatMessage(), { wrapper });
    act(() => {
      result.current.mutate({
        chatId: CHAT_ID,
        content: 'line one<div>line two</div>',
        contentType: 'html',
      });
    });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.body).toEqual({
      content: 'line one<div>line two</div>',
      contentType: 'html',
    });
  });

  it('renders a plain-text optimistic bubble as text', () => {
    vi.mocked(TeamsService.sendTeamsChatMessage).mockResolvedValue(
      wrap([]) as unknown as ApiResponse<TeamsChatMessage>,
    );

    const { result } = renderHook(() => useSendTeamsChatMessage(), { wrapper });
    act(() => {
      result.current.mutate({ chatId: CHAT_ID, content: 'a < b', contentType: 'text' });
    });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.body.contentType).toBe('text');
  });

  it('falls back to html when the caller does not say, matching the service default', async () => {
    // Not every call site has been threaded through yet; the fallback must
    // keep the wire behaviour those callers already have.
    const send = vi.mocked(TeamsService.sendTeamsChatMessage);
    send.mockResolvedValue(wrap([]) as unknown as ApiResponse<TeamsChatMessage>);

    const { result } = renderHook(() => useSendTeamsChatMessage(), { wrapper });
    act(() => {
      result.current.mutate({ chatId: CHAT_ID, content: 'no contentType given' });
    });

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(CHAT_ID, 'no contentType given', 'html'),
    );
    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.body.contentType).toBe('html');
  });

  it('uses the Azure object id as the optimistic author, not the internal user id', () => {
    vi.mocked(TeamsService.sendTeamsChatMessage).mockResolvedValue(
      wrap([]) as unknown as ApiResponse<TeamsChatMessage>,
    );

    const { result } = renderHook(() => useSendTeamsChatMessage(), { wrapper });
    act(() => {
      result.current.mutate({ chatId: CHAT_ID, content: 'hi', contentType: 'text' });
    });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.from?.user?.id).toBe('azure-me');
  });

  it('writes a null author, not an empty string, when we have no azure_oid', () => {
    // azure_oid is nullable and no backend code path writes it today, so this
    // is the state every user is actually in. `?? ""` claimed the sender's
    // Graph id IS the empty string, which then compares false against every
    // real id -- so the row is neither identifiably the user's own nor
    // honestly unknown. null is what we actually know.
    mockUser = { id: 7 };
    vi.mocked(TeamsService.sendTeamsChatMessage).mockResolvedValue(
      wrap([]) as unknown as ApiResponse<TeamsChatMessage>,
    );

    const { result } = renderHook(() => useSendTeamsChatMessage(), { wrapper });
    act(() => {
      result.current.mutate({ chatId: CHAT_ID, content: 'hi', contentType: 'text' });
    });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.from?.user?.id).toBeNull();
  });

  it('treats a blank azure_oid the same as a missing one', () => {
    mockUser = { id: 7, azure_oid: '' };
    vi.mocked(TeamsService.sendTeamsChatMessage).mockResolvedValue(
      wrap([]) as unknown as ApiResponse<TeamsChatMessage>,
    );

    const { result } = renderHook(() => useSendTeamsChatMessage(), { wrapper });
    act(() => {
      result.current.mutate({ chatId: CHAT_ID, content: 'hi', contentType: 'text' });
    });

    const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
    expect(row.from?.user?.id).toBeNull();
  });

  it('marks the row failed when the send rejects, keeping the text on screen', async () => {
    vi.mocked(TeamsService.sendTeamsChatMessage).mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useSendTeamsChatMessage(), { wrapper });
    act(() => {
      result.current.mutate({ chatId: CHAT_ID, content: 'will fail', contentType: 'text' });
    });

    await waitFor(() => {
      const [row] = qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result;
      expect(row.__status).toBe('failed');
    });
    expect(qc.getQueryData<ApiResponse<LocalRow[]>>(KEY())!.result[0].body.content).toBe(
      'will fail',
    );
  });
});

describe('query keys while no conversation is selected', () => {
  // The non-null assertions ran at runtime whether or not the value was there,
  // so an unselected chat still registered `['teams','chats',null,'messages']`
  // in the cache. `enabled` stops the fetch, so nothing breaks -- but the
  // devtools cache fills with entries that look like real conversations, and
  // the `!` was asserting something the signature says is false.
  const keysIn = (client: QueryClient) =>
    client.getQueryCache().getAll().map((q) => q.queryKey as unknown[]);

  it('registers no chat-message key containing a literal null', () => {
    renderHook(() => useTeamsChatMessages(null), { wrapper });

    expect(keysIn(qc).some((key) => key.includes(null))).toBe(false);
  });

  it('registers no channel-message key containing a literal null', () => {
    renderHook(() => useChannelMessages(null, null), { wrapper });

    expect(keysIn(qc).some((key) => key.includes(null))).toBe(false);
  });

  it('still uses the real chat id once one is selected', () => {
    // So the fix cannot be "never use the id".
    renderHook(() => useTeamsChatMessages(CHAT_ID), { wrapper });

    expect(keysIn(qc).some((key) => key.includes(CHAT_ID))).toBe(true);
  });
});

describe('message polling cadence', () => {
  // Channel realtime is dead code today. The backend creates exactly one
  // subscription per user -- `/users/{azureOid}/chats/getAllMessages`, kind
  // USER_CHATS -- and there is no channel subscription anywhere, so
  // applyTeamsEvent's channel branch never executes and the poll is the ONLY
  // way a channel message ever appears. Chat can afford a slow safety net
  // because it genuinely has the socket; channels cannot.
  const CHANNEL_STEP = 31_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(TeamsService.getChannelMessages).mockResolvedValue(wrap([]));
    vi.mocked(TeamsService.getTeamsChatMessages).mockResolvedValue(wrap([]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-fetches a channel within 30s, not once every two minutes', async () => {
    const fetchChannel = vi.mocked(TeamsService.getChannelMessages);
    renderHook(() => useChannelMessages('team-1', 'chan-1'), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchChannel).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANNEL_STEP);
    });
    expect(fetchChannel).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANNEL_STEP);
    });
    expect(fetchChannel).toHaveBeenCalledTimes(3);
  });

  it('leaves chat on its slow safety net, since the socket is the real path there', async () => {
    const fetchChat = vi.mocked(TeamsService.getTeamsChatMessages);
    // A chat the outer beforeEach has not already seeded, so the hook does
    // its initial fetch here rather than serving fresh cache.
    renderHook(() => useTeamsChatMessages('19:polling'), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchChat).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHANNEL_STEP);
    });
    expect(fetchChat).toHaveBeenCalledTimes(1);
  });
});
