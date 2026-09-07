'use client';

import { useState, useMemo } from 'react';
import { Input, Button, Skeleton } from 'antd';
import { Send, Hash } from 'lucide-react';
import { useChannelMessages, useSendChannelMessage } from '@/hooks/useTeams';
import { useMessagePaneScroll } from '@/hooks/useMessagePaneScroll';
import { ChannelMessage } from '@/services/teams';
import dayjs from 'dayjs';

interface TeamsChannelViewProps {
  teamId: string | null;
  channelId: string | null;
}

function ChannelMessageBubble({ message }: { message: ChannelMessage }) {
  const senderName = message.from?.user?.displayName || 'Unknown';
  const time = dayjs(message.createdDateTime).format('h:mm A');
  const textContent = (message.body?.content || '').replace(/<[^>]*>/g, '').trim();
  if (!textContent) return null;

  return (
    <div className="flex flex-col gap-1 px-4 py-2 hover:bg-[#F7F7F7] rounded-lg transition-colors">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-[#111111]">{senderName}</span>
        <span className="text-xs text-[#999999]">{time}</span>
      </div>
      <p className="text-sm text-[#444444] leading-relaxed break-words">{textContent}</p>
    </div>
  );
}

export function TeamsChannelView({ teamId, channelId }: TeamsChannelViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const { data: messagesData, isLoading } = useChannelMessages(teamId, channelId);
  const sendMessage = useSendChannelMessage();

  // Graph returns messages newest-first, exactly as it does for chats. This
  // view had no reverse, so the channel rendered newest at the top and oldest
  // at the bottom -- and then scrolled to the bottom, landing the user on the
  // OLDEST message with no cue that the order was inverted.
  const messages = useMemo(
    () => [...(messagesData?.result || [])].reverse(),
    [messagesData],
  );

  const { paneRef, onScroll, followNextUpdate } = useMessagePaneScroll(messages.length);

  const handleSend = () => {
    if (!teamId || !channelId || !newMessage.trim()) return;
    // Sending is an explicit request to be at the bottom.
    followNextUpdate();
    sendMessage.mutate(
      { teamId, channelId, content: newMessage.trim() },
      { onSuccess: () => setNewMessage('') }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!teamId || !channelId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#999999] gap-3 border border-[#EEEEEE] rounded-2xl bg-white">
        <Hash size={48} strokeWidth={1} />
        <p className="text-sm">Select a channel to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col border border-[#EEEEEE] rounded-2xl bg-white overflow-hidden">
      {/* Messages area */}
      <div
        ref={paneRef}
        onScroll={onScroll}
        role="log"
        aria-label="Channel messages"
        className="flex-1 overflow-y-auto p-2"
      >
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} active paragraph={{ rows: 1 }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#999999] gap-2">
            <Hash size={32} strokeWidth={1.5} />
            <p className="text-sm">No messages in this channel</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChannelMessageBubble key={msg.id} message={msg} />
            ))}
          </>
        )}
      </div>

      {/* Message input */}
      <div className="border-t border-[#EEEEEE] p-3 flex items-center gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="rounded-full"
          size="large"
        />
        <Button
          type="primary"
          icon={<Send size={16} />}
          onClick={handleSend}
          loading={sendMessage.isPending}
          disabled={!newMessage.trim()}
          shape="circle"
          size="large"
          style={{ backgroundColor: '#ff3b3b', borderColor: '#ff3b3b' }}
        />
      </div>
    </div>
  );
}
