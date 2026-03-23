'use client';

import { X, MoreHorizontal, Eye, EyeOff } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Linkify } from '@/components/common/Linkify';
import { NOTIFICATION_CONFIG, DEFAULT_CONFIG } from './constants';
import { PRIORITY_STYLES } from './utils';
import { NotificationCardActions } from './NotificationCardActions';
import type { EnrichedNotification } from './types';

/** Renders text with @mentions highlighted as styled pills */
function MentionText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    const regex = /@([\w\s]+?)(?=\s@|\s*$|[.,!?;:])/g;
    const result: { text: string; isMention: boolean }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ text: text.slice(lastIndex, match.index), isMention: false });
      }
      result.push({ text: `@${match[1]}`, isMention: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), isMention: false });
    }
    return result;
  }, [text]);

  if (parts.length <= 1 && !parts[0]?.isMention) {
    return <Linkify className={className}>{text}</Linkify>;
  }

  return (
    <div className={className}>
      {parts.map((part, i) =>
        part.isMention ? (
          <span key={i} className="inline-flex items-center px-1 py-px rounded bg-[#e3f2fd] text-[#1976d2] font-semibold text-inherit">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </div>
  );
}

interface NotificationCardProps {
  notification: EnrichedNotification;
  onMarkAsRead: (id: number) => void;
  onMarkAsUnread: (id: number) => void;
  onDismiss: (id: number) => void;
  onNavigate: (path: string) => void;
  isMobile?: boolean;
}

export const NotificationCard = React.memo(function NotificationCard({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDismiss,
  onNavigate,
  isMobile,
}: NotificationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const config = NOTIFICATION_CONFIG[notification.type] ?? DEFAULT_CONFIG;
  const IconComponent = config.icon;
  const priorityStyle = PRIORITY_STYLES[notification.priority];

  const handleClick = () => {
    try { onMarkAsRead(notification.id); } catch { /* swallow if notification already gone */ }
    if (notification.actionLink) onNavigate(notification.actionLink);
  };

  const displayTitle = notification.title || notification.message;

  // Metadata chips
  const chips: { label: string; color?: string }[] = [];
  if (notification.metadata?.newStatus) {
    chips.push({ label: notification.metadata.newStatus as string });
  }
  if (notification.metadata?.endDate) {
    const d = new Date(notification.metadata.endDate as string);
    if (!isNaN(d.getTime())) {
      chips.push({ label: `Due: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` });
    }
  }
  if (notification.metadata?.quotedPrice && notification.metadata?.currency) {
    chips.push({ label: `${notification.metadata.currency}${Number(notification.metadata.quotedPrice).toLocaleString()}` });
  }
  if (notification.metadata?.estimatedHours) {
    chips.push({ label: `${notification.metadata.estimatedHours}h estimate` });
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'read',
      icon: notification.unread ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />,
      label: notification.unread ? 'Mark as read' : 'Mark as unread',
      onClick: (info) => { info.domEvent.stopPropagation(); if (notification.unread) { onMarkAsRead(notification.id); } else { onMarkAsUnread(notification.id); } },
    },
    { type: 'divider' },
    {
      key: 'dismiss',
      icon: <X className="w-3.5 h-3.5 text-[#999999]" />,
      label: 'Dismiss',
      onClick: (info) => { info.domEvent.stopPropagation(); onDismiss(notification.id); },
    },
  ];

  return (
    <div
      onClick={handleClick}
      className="group/card relative px-4 md:px-5 py-2.5 border-b border-[#F0F0F0] cursor-pointer transition-all duration-150 hover:bg-[#FAFAFA]"
      style={{
        backgroundColor: notification.unread ? priorityStyle.unreadBg : undefined,
      }}
    >
      {/* Priority stripe */}
      {notification.unread && notification.priority !== 'info' && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
          style={{ backgroundColor: priorityStyle.stripeColor }}
        />
      )}
      {/* Unread dot for info priority */}
      {notification.unread && notification.priority === 'info' && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff3b3b] rounded-r-full" />
      )}

      <div className="flex gap-2.5">
        {/* Icon */}
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border mt-0.5"
          style={{
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
            color: config.color,
          }}
        >
          <IconComponent className="w-3.5 h-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className={`text-sm leading-snug ${notification.unread ? 'font-semibold text-[#111111]' : 'font-medium text-[#555555]'}`}>
              <MentionText text={displayTitle} />
            </div>
            <div className="flex items-center gap-1 shrink-0 mt-px">
              <span className="text-2xs text-[#999999] whitespace-nowrap font-medium">
                {notification.time}
              </span>
              {/* Hover actions — desktop only */}
              {!isMobile && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[#EEEEEE] text-[#999999] hover:text-[#666666] transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight" onOpenChange={setMenuOpen}>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={`w-5 h-5 flex items-center justify-center rounded-full hover:bg-[#EEEEEE] text-[#999999] hover:text-[#666666] transition-colors ${menuOpen ? 'opacity-100 bg-[#EEEEEE]' : ''}`}
                      title="More"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </Dropdown>
                </div>
              )}
              {/* Mobile — always visible 3-dot */}
              {isMobile && (
                <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-[#999999] hover:bg-[#EEEEEE] transition-colors"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </Dropdown>
              )}
            </div>
          </div>

          {/* Message preview */}
          {notification.title && (
            <MentionText
              text={notification.message}
              className="text-xs text-[#666666] font-medium leading-snug line-clamp-2 mt-0.5"
            />
          )}

          {/* Metadata chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {chips.map((chip, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-px rounded-full bg-[#F7F7F7] text-[#666666] text-2xs font-medium"
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <NotificationCardActions
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
});
