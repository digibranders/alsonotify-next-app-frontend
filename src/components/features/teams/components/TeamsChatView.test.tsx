import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from 'antd';
import { TeamsChatView } from './TeamsChatView';
import { useTeamsChatMessages, useSendTeamsChatMessage, useTeamsChats } from '@/hooks/useTeams';
import type { TeamsChatMessage as TChatMessage } from '@/services/teams';
import type { ApiResponse } from '@/types/api';

vi.mock('@/hooks/useTeams');
vi.mock('@/hooks/useCurrentUser', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useCurrentUser')>(
    '@/hooks/useCurrentUser',
  );
  return { ...actual, useCurrentUser: () => ({ user: { id: 7 }, isLoading: false, error: null }) };
});

const CHAT_ID = '19:abc';

const mutate = vi.fn();

const message = (over: Partial<TChatMessage> = {}): TChatMessage =>
  ({
    id: 'm1',
    messageType: 'message',
    createdDateTime: '2026-08-19T10:00:00Z',
    from: { user: { id: 'oid-them', displayName: 'Priya Sharma' } },
    body: { contentType: 'text', content: 'hello' },
    ...over,
  }) as TChatMessage;

const seed = (messages: TChatMessage[]) => {
  vi.mocked(useTeamsChatMessages).mockReturnValue({
    data: { success: true, message: '', result: messages } as ApiResponse<TChatMessage[]>,
    isLoading: false,
  } as unknown as ReturnType<typeof useTeamsChatMessages>);
};

const draw = (chatId: string | null = CHAT_ID) =>
  render(
    <App>
      <TeamsChatView chatId={chatId} />
    </App>,
  );

/**
 * jsdom lays nothing out, so the scroll heuristic has no geometry to read
 * unless the test supplies it. These are the three numbers it uses.
 */
const pane = () => screen.getByRole('log');
const layOut = (
  el: HTMLElement,
  geometry: { scrollHeight: number; clientHeight: number; scrollTop: number },
) => {
  Object.defineProperty(el, 'scrollHeight', { value: geometry.scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: geometry.clientHeight, configurable: true });
  el.scrollTop = geometry.scrollTop;
  fireEvent.scroll(el);
};

const AT_BOTTOM = { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 };
const SCROLLED_UP = { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 };

/** Type into the contenteditable composer and press Enter. */
const compose = (html: string, text = html) => {
  const editor = document.querySelector('.teams-input-editor') as HTMLElement;
  editor.innerHTML = html;
  // textContent is derived from innerHTML by jsdom, but a plain-text case
  // needs the two to differ from each other exactly as a real editor's would.
  fireEvent.input(editor);
  expect(editor.textContent).toBe(text);
  fireEvent.keyDown(editor, { key: 'Enter' });
};

beforeEach(() => {
  vi.clearAllMocks();
  seed([]);
  vi.mocked(useTeamsChats).mockReturnValue({ data: undefined } as unknown as ReturnType<
    typeof useTeamsChats
  >);
  vi.mocked(useSendTeamsChatMessage).mockReturnValue({
    mutate,
    isPending: false,
  } as unknown as ReturnType<typeof useSendTeamsChatMessage>);
});

describe('TeamsChatView — contentType reaches the mutation', () => {
  it('sends plain text as text', () => {
    // The composer already works out whether it produced markup;
    // handleSend discarded the answer and let the service default to "html",
    // so every plain-text message was posted to Graph as HTML.
    draw();

    compose('hello there');

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: CHAT_ID, content: 'hello there', contentType: 'text' }),
      expect.anything(),
    );
  });

  it('sends markup as html', () => {
    draw();

    compose('line one<div>line two</div>', 'line oneline two');

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'html' }),
      expect.anything(),
    );
  });

});

describe('TeamsChatView — auto-scroll', () => {
  // Under the old 15s poll a length change was rare. Under realtime it happens
  // on every inbound message, so an unconditional scrollIntoView slides the
  // view away from whatever the user was reading, mid-sentence.
  it('follows a new message when the user is already at the bottom', () => {
    seed([message({ id: 'm1' })]);
    const { rerender } = draw();
    layOut(pane(), AT_BOTTOM);

    seed([message({ id: 'm1' }), message({ id: 'm2', body: { contentType: 'text', content: 'new' } })]);
    rerender(
      <App>
        <TeamsChatView chatId={CHAT_ID} />
      </App>,
    );

    expect(pane().scrollTop).toBe(1000);
  });

  it('leaves the view alone when the user has scrolled up to read history', () => {
    seed([message({ id: 'm1' })]);
    const { rerender } = draw();
    layOut(pane(), SCROLLED_UP);

    seed([message({ id: 'm1' }), message({ id: 'm2', body: { contentType: 'text', content: 'new' } })]);
    rerender(
      <App>
        <TeamsChatView chatId={CHAT_ID} />
      </App>,
    );

    expect(pane().scrollTop).toBe(0);
  });

  it('always follows the user\'s own send, even from up in the history', () => {
    // Sending is an explicit request to be at the bottom. Not following it
    // would put the user's own message somewhere they cannot see.
    seed([message({ id: 'm1' })]);
    const { rerender } = draw();
    layOut(pane(), SCROLLED_UP);

    compose('mine');
    seed([message({ id: 'm1' }), message({ id: 'm2', body: { contentType: 'text', content: 'mine' } })]);
    rerender(
      <App>
        <TeamsChatView chatId={CHAT_ID} />
      </App>,
    );

    expect(pane().scrollTop).toBe(1000);
  });
});

describe('TeamsChatView — retrying a failed send', () => {
  const failed = (tempId: string, content: string, contentType: 'html' | 'text' = 'text') =>
    message({ id: tempId, __tempId: tempId, __status: 'failed', body: { contentType, content } });

  it('retries with the contentType the message was written in', () => {
    // retryTempId skips addPendingMessage, so the optimistic row is already
    // right -- but the mutation still puts this on the wire, and without it a
    // retried `a < b` is posted to Graph as HTML and arrives mangled.
    seed([failed('t1', 'a < b')]);
    draw();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ retryTempId: 't1', content: 'a < b', contentType: 'text' }),
      expect.anything(),
    );
  });

  it('cannot be double-submitted by two fast clicks', () => {
    // Load-bearing: a second send does not produce a rendering glitch, it
    // creates a second real message in the user's actual Teams conversation.
    // The guard has to be synchronous -- both clicks in one tick read the same
    // pre-update React state, so a state-based check lets the second through.
    seed([failed('t1', 'once')]);
    draw();
    const retry = screen.getByRole('button', { name: 'Retry' });

    // Both dispatched inside one act() batch, so React has not re-rendered
    // the button as disabled in between and the handler's own guard is the
    // only thing standing there. fireEvent.click twice would not test that:
    // React flushes discrete events one at a time, so the second click sees
    // the updated state and even a state-based guard passes.
    act(() => {
      retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('leaves every other row\'s Retry usable while one is in flight', () => {
    // isSending was the single shared mutation flag, so retrying one failed
    // message greyed out Retry on every other one until the round trip
    // finished.
    seed([failed('t1', 'first'), failed('t2', 'second')]);
    draw();
    const [first, second] = screen.getAllByRole('button', { name: 'Retry' });

    fireEvent.click(first);

    expect(first).toBeDisabled();
    expect(second).toBeEnabled();
  });

  it('re-enables Retry once the attempt settles, so a row is not stuck', () => {
    // Without the onSettled cleanup the tempId never leaves the in-flight set
    // and that message can never be retried again -- worse than the shared
    // flag it replaced, which at least cleared itself.
    seed([failed('t1', 'first')]);
    draw();
    const retry = screen.getByRole('button', { name: 'Retry' });

    fireEvent.click(retry);
    expect(retry).toBeDisabled();

    const options = mutate.mock.calls[0][1] as { onSettled: () => void };
    act(() => options.onSettled());

    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('keeps the composer usable while a send is in flight', () => {
    // The whole point of the optimistic row is that the message is already on
    // screen. Disabling the composer for the round trip after that is the one
    // part of the interaction that still waits for the server.
    vi.mocked(useSendTeamsChatMessage).mockReturnValue({
      mutate,
      isPending: true,
    } as unknown as ReturnType<typeof useSendTeamsChatMessage>);
    seed([message({ id: 'm1' })]);
    draw();

    const editor = document.querySelector('.teams-input-editor') as HTMLElement;
    editor.innerHTML = 'next one';
    fireEvent.input(editor);

    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });
});

describe('TeamsChatView — quoted replies', () => {
  it('resolves the replied-to message for the row that quotes it', () => {
    // The lookup moved out of each row and into the list, so that a fresh
    // `messages` array on every realtime write no longer changes a prop on
    // every row. The feature has to survive the move.
    seed([
      message({ id: 'm1', body: { contentType: 'text', content: 'the original' } }),
      message({
        id: 'm2',
        replyToId: 'm1',
        body: { contentType: 'text', content: 'the reply' },
      }),
    ]);

    draw();

    // Twice: once as its own message, once quoted above the reply. Without
    // the lookup it appears only once.
    expect(screen.getAllByText('the original')).toHaveLength(2);
  });
});
