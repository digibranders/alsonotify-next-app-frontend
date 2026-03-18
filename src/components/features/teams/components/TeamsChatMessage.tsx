'use client';

import { useMemo } from 'react';
import { sanitizeRichText } from '@/utils/security/sanitizeHtml';
import { Linkify } from '@/components/common/Linkify';
import { TeamsAttachmentCard } from './TeamsAttachmentCard';
import { ReactionPills } from './TeamsReactions';
import { TeamsMessageActions } from './TeamsMessageActions';
import type { TeamsChatMessage as TChatMessage } from '@/services/teams';
import dayjs from 'dayjs';

interface TeamsChatMessageProps {
  message: TChatMessage;
  previousMessage?: TChatMessage;
  allMessages?: TChatMessage[];
  onReply?: (message: TChatMessage) => void;
  currentUserAzureId?: string | null;
}

const AVATAR_COLORS = [
  { bg: '#E3F2FD', text: '#2F80ED' },
  { bg: '#E8F5E9', text: '#0F9D58' },
  { bg: '#FFF3E0', text: '#E65100' },
  { bg: '#F3E5F5', text: '#7B1FA2' },
  { bg: '#E0F2F1', text: '#00695C' },
  { bg: '#FBE9E7', text: '#BF360C' },
  { bg: '#E8EAF6', text: '#283593' },
  { bg: '#FFF8E1', text: '#F57F17' },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0]?.toUpperCase() || 'U';
}

function isSameSenderGroup(current: TChatMessage, previous?: TChatMessage): boolean {
  if (!previous) return false;
  if (previous.messageType !== 'message') return false;
  if (current.from?.user?.id !== previous.from?.user?.id) return false;
  // Group if within 5 minutes
  const diff = dayjs(current.createdDateTime).diff(dayjs(previous.createdDateTime), 'minute');
  return Math.abs(diff) < 5;
}

export function TeamsChatMessage({
  message,
  previousMessage,
  allMessages,
  onReply,
  currentUserAzureId,
}: TeamsChatMessageProps) {
  // All hooks must be called before any early return
  const replyMessage = useMemo(() => {
    if (!message.replyToId || !allMessages) return null;
    return allMessages.find((m) => m.id === message.replyToId) || null;
  }, [message.replyToId, allMessages]);

  const bodyHtml = useMemo(() => {
    if (message.body?.contentType === 'html' && message.body?.content) {
      return sanitizeRichText(message.body.content);
    }
    return null;
  }, [message.body]);

  if (message.messageType !== 'message') return null;

  const senderName = message.from?.user?.displayName || 'Unknown';
  const senderId = message.from?.user?.id;
  const isOwnMessage = !!(currentUserAzureId && senderId && currentUserAzureId === senderId);
  const time = dayjs(message.createdDateTime).format('h:mm A');
  const showHeader = !isSameSenderGroup(message, previousMessage);
  const avatarColor = getAvatarColor(senderName);
  const plainText = message.body?.contentType === 'text' ? message.body.content : null;

  // Skip empty messages
  const textContent = (message.body?.content || '').replace(/<[^>]*>/g, '').trim();
  if (!textContent && (!message.attachments || message.attachments.length === 0)) return null;

  return (
    <div
      className={`group/message relative flex gap-3 px-4 py-1 rounded-lg transition-colors ${
        isOwnMessage
          ? 'flex-row-reverse hover:bg-[#E8F4FD]'
          : 'hover:bg-[#FAFAFA]'
      }`}
    >
      {/* Avatar column */}
      <div className="w-9 shrink-0 pt-0.5">
        {showHeader && !isOwnMessage && (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold select-none"
            style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
          >
            {getInitials(senderName)}
          </div>
        )}
      </div>

      {/* Content column */}
      <div className={`flex-1 min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
        {/* Sender name + time */}
        {showHeader && (
          <div className={`flex items-baseline gap-2 mb-0.5 ${isOwnMessage ? 'justify-end' : ''}`}>
            {!isOwnMessage && (
              <span className="text-sm font-semibold text-[#111111]">{senderName}</span>
            )}
            <span className="text-xs text-[#999999]">{time}</span>
            {isOwnMessage && (
              <span className="text-sm font-semibold text-[#111111]">You</span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2 ${
            isOwnMessage
              ? 'bg-[#E8F4FD] text-[#111111] ml-auto'
              : 'bg-[#F7F7F7] text-[#111111]'
          }`}
        >
          {/* Quoted reply */}
          {replyMessage && (
            <div className="border-l-2 border-[#CCCCCC] pl-3 mb-1.5 py-1 text-left">
              <span className="text-xs font-medium text-[#999999]">
                {replyMessage.from?.user?.displayName || 'Unknown'}
              </span>
              <p className="text-xs text-[#666666] truncate">
                {(replyMessage.body?.content || '').replace(/<[^>]*>/g, '').substring(0, 80)}
              </p>
            </div>
          )}

          {/* Message body */}
          {bodyHtml ? (
            <div
              className="teams-message-body text-sm text-[#111111] leading-relaxed text-left"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : plainText ? (
            <div className="text-sm text-[#111111] leading-relaxed text-left">
              <Linkify>{plainText}</Linkify>
            </div>
          ) : null}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-col gap-1 text-left">
              {message.attachments.map((att) => (
                <TeamsAttachmentCard key={att.id} attachment={att} />
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        <div className={isOwnMessage ? 'text-left' : ''}>
          <ReactionPills reactions={message.reactions} />
        </div>
      </div>

      {/* Hover actions toolbar */}
      <div className={`absolute -top-3 ${isOwnMessage ? 'left-4' : 'right-4'} invisible group-hover/message:visible z-20`}>
        <TeamsMessageActions message={message} onReply={onReply} />
      </div>
    </div>
  );
}
