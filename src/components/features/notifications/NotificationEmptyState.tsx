'use client';

import { BellOff } from 'lucide-react';

interface EmptyStateProps {
  tab?: string;
}

const TAB_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  all: { title: 'All caught up!', subtitle: 'No notifications to show' },
  mentions: { title: 'No mentions yet', subtitle: 'When someone mentions you, it will appear here' },
  dues: { title: 'No upcoming dues', subtitle: 'Due dates and deadlines will appear here' },
};

export function NotificationEmptyState({ tab = 'all' }: EmptyStateProps) {
  const content = TAB_MESSAGES[tab] ?? TAB_MESSAGES.all;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-[#F7F7F7] flex items-center justify-center mb-4">
        <BellOff className="w-6 h-6 text-[#999999]" />
      </div>
      <p className="font-semibold text-sm text-[#111111] mb-1">{content.title}</p>
      <p className="font-medium text-xs text-[#999999] max-w-[220px]">{content.subtitle}</p>
    </div>
  );
}
