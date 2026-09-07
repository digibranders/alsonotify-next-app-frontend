import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamsChannelView } from './TeamsChannelView';
import { useChannelMessages, useSendChannelMessage } from '@/hooks/useTeams';
import type { ChannelMessage } from '@/services/teams';
import type { ApiResponse } from '@/types/api';

vi.mock('@/hooks/useTeams');

const TEAM_ID = 'team-1';
const CHANNEL_ID = 'chan-1';

const message = (id: string, content: string, createdDateTime: string): ChannelMessage =>
  ({
    id,
    messageType: 'message',
    createdDateTime,
    from: { user: { id: `oid-${id}`, displayName: 'Priya Sharma' } },
    body: { contentType: 'text', content },
  }) as ChannelMessage;

const seed = (messages: ChannelMessage[]) => {
  vi.mocked(useChannelMessages).mockReturnValue({
    data: { success: true, message: '', result: messages } as ApiResponse<ChannelMessage[]>,
    isLoading: false,
  } as unknown as ReturnType<typeof useChannelMessages>);
};

const draw = () => render(<TeamsChannelView teamId={TEAM_ID} channelId={CHANNEL_ID} />);

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

beforeEach(() => {
  vi.clearAllMocks();
  seed([]);
  vi.mocked(useSendChannelMessage).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useSendChannelMessage>);
});

describe('TeamsChannelView — ordering', () => {
  it('renders oldest first, like the chat view does', () => {
    // Graph returns messages newest-first. TeamsChatView reverses; this view
    // did not, so the channel rendered newest at the top and oldest at the
    // bottom -- then scrolled the bottom sentinel into view, landing the user
    // on the OLDEST message with no cue that the order was inverted.
    seed([
      message('m3', 'newest', '2026-08-19T12:00:00Z'),
      message('m2', 'middle', '2026-08-19T11:00:00Z'),
      message('m1', 'oldest', '2026-08-19T10:00:00Z'),
    ]);

    draw();

    const rendered = screen.getAllByText(/oldest|middle|newest/).map((el) => el.textContent);
    expect(rendered).toEqual(['oldest', 'middle', 'newest']);
  });
});

describe('TeamsChannelView — auto-scroll', () => {
  it('follows a new message when the user is at the bottom', () => {
    seed([message('m1', 'first', '2026-08-19T10:00:00Z')]);
    const { rerender } = draw();
    layOut(pane(), { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    seed([
      message('m2', 'second', '2026-08-19T11:00:00Z'),
      message('m1', 'first', '2026-08-19T10:00:00Z'),
    ]);
    rerender(<TeamsChannelView teamId={TEAM_ID} channelId={CHANNEL_ID} />);

    expect(pane().scrollTop).toBe(1000);
  });

  it('leaves the view alone when the user has scrolled up', () => {
    seed([message('m1', 'first', '2026-08-19T10:00:00Z')]);
    const { rerender } = draw();
    layOut(pane(), { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 });

    seed([
      message('m2', 'second', '2026-08-19T11:00:00Z'),
      message('m1', 'first', '2026-08-19T10:00:00Z'),
    ]);
    rerender(<TeamsChannelView teamId={TEAM_ID} channelId={CHANNEL_ID} />);

    expect(pane().scrollTop).toBe(0);
  });
});
