'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Skeleton } from 'antd';
import { MessageCircle } from 'lucide-react';
import { useTeamsChatMessages, useSendTeamsChatMessage, useTeamsChats } from '@/hooks/useTeams';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: messagesData, isLoading } = useTeamsChatMessages(chatId);
  const { data: chatsData } = useTeamsChats();
  const sendMessage = useSendTeamsChatMessage();
  const { user: currentUser } = useCurrentUser();
  const currentUserAzureId = (currentUser as Record<string, unknown>)?.azure_oid as string | undefined;

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (content: string, contentType: 'html' | 'text') => {
    if (!chatId || !content.trim()) return;
    sendMessage.mutate(
      { chatId, content: content.trim() },
      {
        onSuccess: () => {
          setReplyingTo(null);
        },
      }
    );
  };

  const handleReply = (message: TChatMessage) => {
    setReplyingTo(message);
  };

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
      <div className="flex-1 overflow-y-auto">
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
                  key={group.message.id}
                  message={group.message}
                  previousMessage={prevMessage}
                  allMessages={messages}
                  onReply={handleReply}
                  currentUserAzureId={currentUserAzureId}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <TeamsMessageInput
        onSend={handleSend}
        isSending={sendMessage.isPending}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
