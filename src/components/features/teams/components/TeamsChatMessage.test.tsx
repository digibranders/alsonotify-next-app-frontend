import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from 'antd';
import { TeamsChatMessage } from './TeamsChatMessage';
import type { TeamsChatMessage as TChatMessage } from '@/services/teams';

/** TeamsMessageActions calls App.useApp(), which needs antd's App context. */
const draw = (ui: React.ReactElement) => render(<App>{ui}</App>);

const message = (over: Partial<TChatMessage> = {}): TChatMessage =>
  ({
    id: 'm1',
    messageType: 'message',
    createdDateTime: '2026-08-19T10:00:00Z',
    from: { user: { id: 'oid-them', displayName: 'Priya Sharma' } },
    body: { contentType: 'text', content: 'hello' },
    ...over,
  }) as TChatMessage;

describe('TeamsChatMessage — whose message is it', () => {
  it('reads a message as the user\'s own when the sender id matches', () => {
    draw(<TeamsChatMessage message={message({ from: { user: { id: 'oid-me', displayName: 'Me' } } })} currentUserAzureId="oid-me" />);

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('reads a message from anyone else as theirs', () => {
    draw(<TeamsChatMessage message={message()} currentUserAzureId="oid-me" />);

    expect(screen.queryByText('You')).not.toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
  });

  it('still reads a message this client just sent as the user\'s own with no azure_oid', () => {
    // azure_oid is nullable and no backend path writes it today, so this is
    // the state every user is in: the id comparison can never succeed, and
    // the user's own messages rendered left-aligned under an "Unknown"
    // avatar. A row carrying __tempId came out of this tab's own composer, so
    // its authorship is known regardless of what the id says.
    draw(
      <TeamsChatMessage
        message={message({
          id: 'pending-1',
          __tempId: 'pending-1',
          __status: 'pending',
          from: { user: { id: null, displayName: null } },
        })}
        currentUserAzureId={null}
      />,
    );

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('keeps reading it as the user\'s own after it reconciles to a real id', () => {
    // reconcilePendingMessage keeps __tempId deliberately, so the row must
    // not flip sides the instant the server copy lands.
    draw(
      <TeamsChatMessage
        message={message({
          id: 'real-1',
          __tempId: 'pending-1',
          from: { user: { id: 'oid-me', displayName: 'Me' } },
        })}
        currentUserAzureId={null}
      />,
    );

    expect(screen.getByText('You')).toBeInTheDocument();
  });
});

describe('TeamsChatMessage — attachments Graph told us little about', () => {
  it('renders an attachment with no name or contentType instead of throwing', () => {
    // getFileIcon called .split on the name and isLinkPreview called .includes
    // on the contentType, both declared non-nullable while Graph promises
    // neither. A hero-card attachment has no name.
    expect(() =>
      draw(
        <TeamsChatMessage
          message={message({
            body: { contentType: 'html', content: '<attachment id="a1"></attachment>' },
            attachments: [
              { id: null, name: null, contentType: null, contentUrl: null, content: null, thumbnailUrl: null },
              { id: null, name: null, contentType: null, contentUrl: null, content: null, thumbnailUrl: null },
            ],
          })}
          currentUserAzureId={null}
        />,
      ),
    ).not.toThrow();
  });
});
