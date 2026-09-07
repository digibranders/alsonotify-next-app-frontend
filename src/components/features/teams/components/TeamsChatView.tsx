'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Skeleton } from 'antd';
import { MessageCircle } from 'lucide-react';
import { useTeamsChatMessages, useSendTeamsChatMessage, useTeamsChats } from '@/hooks/useTeams';
import { getAzureOid, useCurrentUser } from '@/hooks/useCurrentUser';
import { useMessagePaneScroll } from '@/hooks/useMessagePaneScroll';
import { TeamsChatMessage as TChatMessage } from '@/services/teams';
import { TeamsChatHeader } from './TeamsChatHeader';
import { TeamsChatMessage } from './TeamsChatMessage';
import { TeamsDateSeparator } from './TeamsDateSeparator';
import { TeamsMessageInput } from './TeamsMessageInput';
import dayjs from 'dayjs';

interface TeamsChatViewProps {
  chatId: string | null;
}

type MessageGroup =
  | { type: 'separator'; date: string }
  | { type: 'message'; message: TChatMessage; index: number };

function groupMessagesByDate(messages: TChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let lastDate = '';
  messages.forEach((msg, index) => {
    const msgDate = dayjs(msg.createdDateTime).format('YYYY-MM-DD');
    if (msgDate !== lastDate) {
      groups.push({ type: 'separator', date: msg.createdDateTime });
      lastDate = msgDate;
    }
    groups.push({ type: 'message', message: msg, index });
  });
  return groups;
}

export function TeamsChatView({ chatId }: TeamsChatViewProps) {
  const [replyingTo, setReplyingTo] = useState<TChatMessage | null>(null);
  /**
   * Which failed rows have a retry in flight right now.
   *
   * `sendMessage.isPending` is one flag shared by every row, so retrying a
   * single failed message greyed out the Retry button on all the others and
   * disabled the composer for the whole round trip -- which is exactly what
   * the optimistic row exists to avoid. Tracked per tempId instead.
   *
   * The ref is the source of truth because the guard in handleRetry must be
   * synchronous; the state copy exists only so the buttons re-render.
   */
  const inFlightRetriesRef = useRef<Set<string>>(new Set());
  const [retryingTempIds, setRetryingTempIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const publishRetries = useCallback(() => {
    setRetryingTempIds(new Set(inFlightRetriesRef.current));
  }, []);
  const { data: messagesData, isLoading } = useTeamsChatMessages(chatId);
  const { data: chatsData } = useTeamsChats();
  const sendMessage = useSendTeamsChatMessage();
  const { user: currentUser } = useCurrentUser();
  const currentUserAzureId = getAzureOid(currentUser);

  // Find the current chat object for the header
  const currentChat = useMemo(() => {
    if (!chatId || !chatsData?.result) return null;
    return chatsData.result.find((c) => c.id === chatId) || null;
  }, [chatId, chatsData]);

  // Messages come in reverse chronological from API — reverse for display
  const messages = useMemo(() => {
    return [...(messagesData?.result || [])].reverse();
  }, [messagesData]);

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  // Resolved once for the whole list rather than by each row scanning the
  // array: `messages` is a fresh array on every realtime cache write, so
  // handing it to every row as a prop defeated their memoisation outright.
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const { paneRef, onScroll, followNextUpdate } = useMessagePaneScroll(messages.length);

  const handleSend = (content: string, contentType: 'html' | 'text') => {
    if (!chatId || !content.trim()) return;
    // Sending is an explicit request to be at the bottom, wherever the user
    // happens to be reading.
    followNextUpdate();
    // TeamsMessageInput has already worked out whether what it produced is
    // markup or plain text -- a contenteditable wraps every line after the
    // first in a <div>, so any two-line message is html. Discarding that
    // answer let sendTeamsChatMessage fall back to its "html" default, which
    // posted every plain-text message to Graph as HTML.
    sendMessage.mutate(
      { chatId, content: content.trim(), contentType },
      {
        onSuccess: () => {
          setReplyingTo(null);
        },
      }
    );
  };

  // Stable identities, so an untouched TeamsChatMessage row is genuinely
  // skipped by its memo. `sendMessage` is read through a ref because
  // useMutation returns a new object whenever its own state changes, which
  // would otherwise rebuild handleRetry on every send and re-render all ~50
  // rows with it.
  const handleReply = useCallback((message: TChatMessage) => {
    setReplyingTo(message);
  }, []);

  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const handleRetry = useCallback((message: TChatMessage) => {
    // Only failed, locally-generated rows carry a __tempId; a real server
    // message can never be retried this way.
    const tempId = message.__tempId;
    if (!chatId || !tempId) return;

    // Double-submit guard, per row. A second send is not a rendering glitch:
    // it creates a second real message in the user's actual Teams
    // conversation. It has to be a ref, not state -- two clicks in the same
    // tick both read the same pre-update state value, so a state-based check
    // lets the second one straight through, and so did the previous
    // `sendMessage.isPending` for the same reason (mutate sets it
    // asynchronously; only the re-rendered disabled attribute stopped a slow
    // second click).
    if (inFlightRetriesRef.current.has(tempId)) return;
    inFlightRetriesRef.current.add(tempId);
    publishRetries();

    sendMessageRef.current.mutate(
      {
        chatId,
        content: message.body.content,
        // retryTempId skips addPendingMessage, so this is not needed for the
        // optimistic row -- but it is still needed for the wire, or a retried
        // plain-text message gets posted to Graph as HTML and `a < b` arrives
        // mangled.
        contentType: message.body.contentType,
        retryTempId: tempId,
      },
      {
        onSettled: () => {
          inFlightRetriesRef.current.delete(tempId);
          publishRetries();
        },
      },
    );
  }, [chatId, publishRetries]);

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#999999] gap-3 border border-[#EEEEEE] rounded-2xl bg-white">
        <MessageCircle size={48} strokeWidth={1} />
        <p className="text-sm">Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col border border-[#EEEEEE] rounded-2xl bg-white overflow-hidden">
      {/* Chat header */}
      <TeamsChatHeader chat={currentChat} />

      {/* Messages area */}
      <div
        ref={paneRef}
        onScroll={onScroll}
        role="log"
        aria-label="Chat messages"
        className="flex-1 overflow-y-auto"
      >
        {isLoading ? (
          <div className="flex flex-col gap-4 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton.Avatar active size={36} />
                <Skeleton active paragraph={{ rows: 1, width: ['60%'] }} title={{ width: '30%' }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#999999] gap-2">
            <MessageCircle size={32} strokeWidth={1.5} />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="py-2">
            {messageGroups.map((group, i) => {
              if (group.type === 'separator') {
                return <TeamsDateSeparator key={`sep-${i}`} date={group.date} />;
              }
              const prevGroup = messageGroups[i - 1];
              const prevMessage =
                prevGroup?.type === 'message' ? prevGroup.message : undefined;
              return (
                <TeamsChatMessage
                  // A message that started as an optimistic row keeps its
                  // __tempId after reconciliation specifically so the key
                  // stays stable here: without this, `id` swapping from the
                  // temp id to the real Graph id at reconcile time would
                  // read as a different row to React and remount it instead
                  // of patching in place.
                  key={group.message.__tempId ?? group.message.id}
                  message={group.message}
                  previousMessage={prevMessage}
                  replyMessage={
                    group.message.replyToId ? byId.get(group.message.replyToId) ?? null : null
                  }
                  onReply={handleReply}
                  onRetry={handleRetry}
                  isRetrying={
                    !!group.message.__tempId && retryingTempIds.has(group.message.__tempId)
                  }
                  currentUserAzureId={currentUserAzureId}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Message input */}
      {/*
        No isSending: the message is already on screen as an optimistic row
        the instant this fires, so blocking the composer until the server
        answers is the one part of the interaction still waiting on the round
        trip. Double-sending the composer is prevented by the editor clearing
        itself synchronously, which makes handleSend's isEmpty check true.
      */}
      <TeamsMessageInput
        onSend={handleSend}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
