'use client';

import { Video, Phone } from 'lucide-react';
import { Tooltip } from 'antd';
import { PresenceIndicator } from '@/components/ui/PresenceIndicator';
import type { TeamsChat } from '@/services/teams';
import type { PresenceAvailability } from '@/components/ui/PresenceIndicator';

interface TeamsChatHeaderProps {
  chat: TeamsChat | null;
  presenceMap?: Map<string, PresenceAvailability>;
}

function getChatDisplayName(chat: TeamsChat): string {
  if (chat.topic) return chat.topic;
  if (chat.members && chat.members.length > 0) {
    return chat.members.map((m) => m.displayName || 'Unknown').join(', ');
  }
  return chat.chatType === 'oneOnOne' ? 'Direct Message' : 'Group Chat';
}

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0]?.toUpperCase() || 'U';
}

export function TeamsChatHeader({ chat, presenceMap }: TeamsChatHeaderProps) {
  if (!chat) return null;

  const chatName = getChatDisplayName(chat);
  const memberCount = chat.members?.length || 0;
  const isOneOnOne = chat.chatType === 'oneOnOne';

  // Get presence for the other user in 1:1 chats
  const otherMember = isOneOnOne ? chat.members?.[0] : null;
  const otherPresence = otherMember?.userId
    ? presenceMap?.get(otherMember.userId)
    : undefined;

  const handleVideoCall = () => {
    window.open(`https://teams.microsoft.com/l/chat/${chat.id}`, '_blank');
  };

  const handleAudioCall = () => {
    window.open(`https://teams.microsoft.com/l/chat/${chat.id}`, '_blank');
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEEEE] shrink-0">
      {/* Left: Chat info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#E3F2FD] text-[#2F80ED] flex items-center justify-center text-xs font-semibold">
            {getInitials(otherMember?.displayName || chatName)}
          </div>
          {otherPresence && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <PresenceIndicator availability={otherPresence} size="sm" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#111111] truncate">{chatName}</h3>
          {!isOneOnOne && memberCount > 0 && (
            <p className="text-xs text-[#999999]">{memberCount} members</p>
          )}
          {isOneOnOne && otherPresence && (
            <p className="text-xs text-[#999999] capitalize">
              {otherPresence === 'Available' ? 'Online' : otherPresence}
            </p>
          )}
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1">
        <Tooltip title="Video call (opens Teams)">
          <button
            onClick={handleVideoCall}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors text-[#666666] cursor-pointer"
          >
            <Video size={18} />
          </button>
        </Tooltip>
        <Tooltip title="Audio call (opens Teams)">
          <button
            onClick={handleAudioCall}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors text-[#666666] cursor-pointer"
          >
            <Phone size={18} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
