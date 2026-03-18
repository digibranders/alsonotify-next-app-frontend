'use client';

import { Dropdown, App } from 'antd';
import { Reply, MoreHorizontal, Copy, Forward, Pin } from 'lucide-react';
import { ReactionPicker } from './TeamsReactions';
import type { TeamsChatMessage } from '@/services/teams';

interface TeamsMessageActionsProps {
  message: TeamsChatMessage;
  onReply?: (message: TeamsChatMessage) => void;
}

export function TeamsMessageActions({ message, onReply }: TeamsMessageActionsProps) {
  const { message: toast } = App.useApp();

  const handleCopy = () => {
    const plainText = message.body.content.replace(/<[^>]*>/g, '').trim();
    navigator.clipboard.writeText(plainText);
    toast.success('Message copied');
  };

  const handleReaction = () => {
    toast.info('Reactions coming soon');
  };

  const menuItems = [
    {
      key: 'reply',
      label: 'Reply',
      icon: <Reply size={14} />,
      onClick: () => onReply?.(message),
    },
    {
      key: 'copy',
      label: 'Copy message',
      icon: <Copy size={14} />,
      onClick: handleCopy,
    },
    { type: 'divider' as const },
    {
      key: 'forward',
      label: 'Forward',
      icon: <Forward size={14} />,
      disabled: true,
      onClick: () => toast.info('Forward coming soon'),
    },
    {
      key: 'pin',
      label: 'Pin message',
      icon: <Pin size={14} />,
      disabled: true,
      onClick: () => toast.info('Pin coming soon'),
    },
  ];

  return (
    <div className="flex items-center bg-white border border-[#EEEEEE] rounded-lg shadow-sm overflow-hidden">
      {/* Quick reactions */}
      <ReactionPicker onSelect={handleReaction}>
        <button className="w-7 h-7 flex items-center justify-center hover:bg-[#F7F7F7] transition-colors text-sm cursor-pointer">
          {'\uD83D\uDC4D'}
        </button>
      </ReactionPicker>
      <button
        onClick={handleReaction}
        className="w-7 h-7 flex items-center justify-center hover:bg-[#F7F7F7] transition-colors text-sm cursor-pointer"
      >
        {'\u2764\uFE0F'}
      </button>
      <button
        onClick={handleReaction}
        className="w-7 h-7 flex items-center justify-center hover:bg-[#F7F7F7] transition-colors text-sm cursor-pointer"
      >
        {'\uD83D\uDE02'}
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-[#EEEEEE]" />

      {/* Reply */}
      <button
        onClick={() => onReply?.(message)}
        className="w-7 h-7 flex items-center justify-center hover:bg-[#F7F7F7] transition-colors text-[#666666] cursor-pointer"
        title="Reply"
      >
        <Reply size={14} />
      </button>

      {/* More options */}
      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <button className="w-7 h-7 flex items-center justify-center hover:bg-[#F7F7F7] transition-colors text-[#666666] cursor-pointer">
          <MoreHorizontal size={14} />
        </button>
      </Dropdown>
    </div>
  );
}
