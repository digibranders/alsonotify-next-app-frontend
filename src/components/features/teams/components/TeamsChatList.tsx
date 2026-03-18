'use client';

import { useState, useMemo } from 'react';
import { Input, Skeleton } from 'antd';
import { Search, MessageCircle, Users as UsersIcon } from 'lucide-react';
import { useTeamsChats } from '@/hooks/useTeams';
import { TeamsChat } from '@/services/teams';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface TeamsChatListProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

function getChatDisplayName(chat: TeamsChat): string {
  if (chat.topic) return chat.topic;
  if (chat.members && chat.members.length > 0) {
    return chat.members
      .slice(0, 3)
      .map((m) => m.displayName?.split(' ')[0] || 'Unknown')
      .join(', ');
  }
  return chat.chatType === 'oneOnOne' ? 'Direct Message' : 'Group Chat';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0]?.toUpperCase() || 'U';
}

function getLastMessagePreview(chat: TeamsChat): string {
  if (!chat.lastMessagePreview?.body?.content) return '';
  const text = chat.lastMessagePreview.body.content.replace(/<[^>]*>/g, '').trim();
  const sender = chat.lastMessagePreview.from?.user?.displayName?.split(' ')[0];
  if (sender && chat.chatType !== 'oneOnOne') {
    return `${sender}: ${text}`;
  }
  return text;
}

function formatChatTime(dateStr: string): string {
  const d = dayjs(dateStr);
  const now = dayjs();
  if (d.isSame(now, 'day')) return d.format('h:mm A');
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Yesterday';
  if (d.isAfter(now.subtract(7, 'day'))) return d.format('ddd');
  return d.format('M/D');
}

export function TeamsChatList({ selectedChatId, onSelectChat }: TeamsChatListProps) {
  const [search, setSearch] = useState('');
  const { data: chatsData, isLoading } = useTeamsChats();

  const chats = chatsData?.result || [];

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter((chat) => {
      const name = getChatDisplayName(chat).toLowerCase();
      return name.includes(q);
    });
  }, [chats, search]);

  return (
    <div className="w-[300px] shrink-0 flex flex-col border border-[#EEEEEE] rounded-2xl bg-white overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-[#EEEEEE]">
        <Input
          prefix={<Search size={14} className="text-[#999999]" />}
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-full"
          allowClear
        />
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton.Avatar active size={40} />
                <div className="flex-1">
                  <Skeleton.Input active block style={{ height: 14, marginBottom: 4 }} />
                  <Skeleton.Input active block style={{ height: 12, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#999999] gap-2 p-6">
            <MessageCircle size={32} strokeWidth={1.5} />
            <p className="text-sm text-center">
              {chats.length === 0
                ? 'No Teams chats found. Connect Microsoft 365 to see your chats.'
                : 'No chats match your search.'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isOneOnOne = chat.chatType === 'oneOnOne';
            const displayName = getChatDisplayName(chat);
            const preview = getLastMessagePreview(chat);
            const otherMember = isOneOnOne ? chat.members?.[0] : null;

            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors border-b border-[#F7F7F7] cursor-pointer ${
                  selectedChatId === chat.id
                    ? 'bg-[#FEF3F2]'
                    : 'hover:bg-[#F7F7F7]'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {isOneOnOne ? (
                    <div className="w-10 h-10 rounded-full bg-[#E3F2FD] text-[#2F80ED] flex items-center justify-center text-sm font-semibold">
                      {getInitials(otherMember?.displayName || displayName)}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#0F9D58] flex items-center justify-center">
                      <UsersIcon size={18} />
                    </div>
                  )}
                </div>

                {/* Chat info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#111111] truncate">
                      {displayName}
                    </p>
                    <span className="text-xs text-[#999999] whitespace-nowrap shrink-0">
                      {formatChatTime(chat.lastUpdatedDateTime)}
                    </span>
                  </div>
                  {preview && (
                    <p className="text-xs text-[#666666] truncate mt-0.5">
                      {preview.substring(0, 60)}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
