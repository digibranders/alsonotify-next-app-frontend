import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from 'antd';
import { TeamsPage } from './TeamsPage';
import {
  useTeamsChatMessages,
  useSendTeamsChatMessage,
  useTeamsChats,
  useTeamsPeopleSearch,
  useCreateTeamsChat,
} from '@/hooks/useTeams';
import type { TeamsChat, TeamsChatMessage as TChatMessage } from '@/services/teams';
import type { ApiResponse } from '@/types/api';

vi.mock('@/hooks/useTeams');
vi.mock('@/hooks/useCurrentUser', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useCurrentUser')>(
    '@/hooks/useCurrentUser',
  );
  return { ...actual, useCurrentUser: () => ({ user: { id: 7 }, isLoading: false, error: null }) };
});
vi.mock('../../layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const chat = (id: string, topic: string): TeamsChat =>
  ({ id, topic, chatType: 'group', createdDateTime: '', lastUpdatedDateTime: '' }) as TeamsChat;

const message = (id: string, sender: string): TChatMessage =>
  ({
    id,
    messageType: 'message',
    createdDateTime: '2026-08-19T10:00:00Z',
    from: { user: { id: `oid-${id}`, displayName: sender } },
    body: { contentType: 'text', content: `from ${sender}` },
  }) as TChatMessage;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useTeamsChats).mockReturnValue({
    data: {
      success: true,
      message: '',
      result: [chat('19:a', 'Chat A'), chat('19:b', 'Chat B')],
    } as ApiResponse<TeamsChat[]>,
    isLoading: false,
  } as unknown as ReturnType<typeof useTeamsChats>);
  vi.mocked(useTeamsPeopleSearch).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useTeamsPeopleSearch>);
  vi.mocked(useCreateTeamsChat).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateTeamsChat>);
  vi.mocked(useSendTeamsChatMessage).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useSendTeamsChatMessage>);
  vi.mocked(useTeamsChatMessages).mockImplementation(
    (chatId) =>
      ({
        data: {
          success: true,
          message: '',
          result: chatId === '19:a' ? [message('ma', 'Alice')] : [message('mb', 'Bob')],
        },
        isLoading: false,
      }) as unknown as ReturnType<typeof useTeamsChatMessages>,
  );
});

describe('TeamsPage — switching chats', () => {
  it('does not carry a reply target from one conversation into another', () => {
    // TeamsChatView held replyingTo in its own state and was rendered unkeyed,
    // so selecting chat A, clicking Reply and switching to chat B left the
    // composer saying "Replying to <someone in A>" -- and sending would have
    // attached that reply to the wrong conversation. The scroll position came
    // along too, because the effect keys on messages.length and two chats of
    // the same length never fire it.
    render(
      <App>
        <TeamsPage />
      </App>,
    );

    fireEvent.click(screen.getByText('Chat A'));
    fireEvent.click(screen.getByTitle('Reply'));
    expect(screen.getByText(/Replying to/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Chat B'));

    expect(screen.queryByText(/Replying to/)).not.toBeInTheDocument();
  });
});
