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
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
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
}: TeamsChatMessageProps) {
  if (message.messageType !== 'message') return null;

  const senderName = message.from?.user?.displayName || 'Unknown';
  const time = dayjs(message.createdDateTime).format('h:mm A');
  const showHeader = !isSameSenderGroup(message, previousMessage);

  // Look up quoted reply
  const replyMessage = useMemo(() => {
    if (!message.replyToId || !allMessages) return null;
    return allMessages.find((m) => m.id === message.replyToId) || null;
  }, [message.replyToId, allMessages]);

  // Render message body
  const bodyHtml = useMemo(() => {
    if (message.body.contentType === 'html') {
      return sanitizeRichText(message.body.content);
    }
    return null;
  }, [message.body]);

  const plainText = message.body.contentType === 'text' ? message.body.content : null;

  // Skip empty messages
  const textContent = message.body.content.replace(/<[^>]*>/g, '').trim();
  if (!textContent && (!message.attachments || message.attachments.length === 0)) return null;

  return (
    <div className="group/message relative flex gap-3 px-4 py-1 hover:bg-[#FAFAFA] rounded-lg transition-colors">
      {/* Avatar column */}
      <div className="w-9 shrink-0 pt-0.5">
        {showHeader && (
          <div className="w-9 h-9 rounded-full bg-[#E3F2FD] text-[#2F80ED] flex items-center justify-center text-xs font-semibold select-none">
            {getInitials(senderName)}
          </div>
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {/* Sender name + time */}
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-[#111111]">{senderName}</span>
            <span className="text-xs text-[#999999]">{time}</span>
          </div>
        )}

        {/* Quoted reply */}
        {replyMessage && (
          <div className="border-l-2 border-[#CCCCCC] pl-3 mb-1.5 py-1">
            <span className="text-xs font-medium text-[#999999]">
              {replyMessage.from?.user?.displayName || 'Unknown'}
            </span>
            <p className="text-xs text-[#666666] truncate">
              {replyMessage.body.content.replace(/<[^>]*>/g, '').substring(0, 80)}
            </p>
          </div>
        )}

        {/* Message body */}
        {bodyHtml ? (
          <div
            className="teams-message-body text-sm text-[#111111] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : plainText ? (
          <div className="text-sm text-[#111111] leading-relaxed">
            <Linkify>{plainText}</Linkify>
          </div>
        ) : null}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col gap-1">
            {message.attachments.map((att) => (
              <TeamsAttachmentCard key={att.id} attachment={att} />
            ))}
          </div>
        )}

        {/* Reactions */}
        <ReactionPills reactions={message.reactions} />
      </div>

      {/* Hover actions toolbar */}
      <div className="absolute -top-3 right-4 invisible group-hover/message:visible z-10">
        <TeamsMessageActions message={message} onReply={onReply} />
      </div>
    </div>
  );
}
