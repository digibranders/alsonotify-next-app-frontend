import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TeamsChatMessage } from './TeamsChatMessage';
import type { TeamsChatMessage as TChatMessage } from '@/services/teams';

/**
 * Stands in for the hover toolbar so this file can count renders of the row.
 * TeamsChatMessage renders exactly one of these, so calls to it ARE its
 * render count -- and it drops the antd App context the real one needs.
 */
const renders = vi.fn();
vi.mock('./TeamsMessageActions', () => ({
  TeamsMessageActions: () => {
    renders();
    return null;
  },
}));

const message = (over: Partial<TChatMessage> = {}): TChatMessage =>
  ({
    id: 'm1',
    messageType: 'message',
    createdDateTime: '2026-08-19T10:00:00Z',
    from: { user: { id: 'oid-them', displayName: 'Priya Sharma' } },
    body: { contentType: 'text', content: 'hello' },
    ...over,
  }) as TChatMessage;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TeamsChatMessage — re-render cost', () => {
  // Every setQueryData from the realtime channel hands the list component a
  // fresh array. Unmemoised, that re-rendered all ~50 rows -- each parsing a
  // dayjs date and running a regex strip -- and a 50-message burst arrives as
  // 50 separate macrotasks, so ~2,500 renders.
  it('does not re-render a row whose props have not changed', () => {
    const row = message();
    const { rerender } = render(<TeamsChatMessage message={row} currentUserAzureId={null} />);
    expect(renders).toHaveBeenCalledTimes(1);

    rerender(<TeamsChatMessage message={row} currentUserAzureId={null} />);

    expect(renders).toHaveBeenCalledTimes(1);
  });

  it('still re-renders when the message itself changes', () => {
    // So the memo cannot degenerate into never updating.
    const { rerender } = render(<TeamsChatMessage message={message()} currentUserAzureId={null} />);

    rerender(
      <TeamsChatMessage
        message={message({ body: { contentType: 'text', content: 'edited' } })}
        currentUserAzureId={null}
      />,
    );

    expect(renders).toHaveBeenCalledTimes(2);
  });

  it('still re-renders when this row starts retrying', () => {
    const row = message({ __tempId: 't1', __status: 'failed' });
    const { rerender } = render(
      <TeamsChatMessage message={row} currentUserAzureId={null} isRetrying={false} />,
    );

    rerender(<TeamsChatMessage message={row} currentUserAzureId={null} isRetrying />);

    expect(renders).toHaveBeenCalledTimes(2);
  });
});
