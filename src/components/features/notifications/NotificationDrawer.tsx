'use client';

import { useMemo, useState, useCallback } from 'react';
import { Drawer, App } from 'antd';
import { X, MoreVertical, CheckCheck, Trash2, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/useNotification';
import { useIsNarrow } from '@/hooks/useBreakpoint';
import { deleteNotification, clearAllNotifications } from '@/services/notification';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { NotificationTabs } from './NotificationTabs';
import { NotificationFilterChips } from './NotificationFilterChips';
import { NotificationGroupHeader } from './NotificationGroupHeader';
import { NotificationCard } from './NotificationCard';
import { NotificationEmptyState } from './NotificationEmptyState';
import { FILTER_CHIPS } from './constants';
import { enrichNotification, groupByTime, getRelativeTime } from './utils';
import type { NotificationDrawerProps, EnrichedNotification } from './types';

export function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useIsNarrow('md');
  const { message, modal } = App.useApp();

  const [activeTab, setActiveTab] = useState('all');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Data hooks
  const { data: notificationsData, isLoading } = useNotifications(activeTab);
  const markAllReadMutation = useMarkAllNotificationsRead();
  const markReadMutation = useMarkNotificationRead();

  // Enrich notifications with priority, time group, etc.
  const enrichedNotifications = useMemo<EnrichedNotification[]>(() => {
    if (!notificationsData?.result) return [];
    return notificationsData.result.map((n) =>
      enrichNotification({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        time: getRelativeTime(n.created_at),
        unread: !n.is_read,
        icon: n.icon,
        actionLink: n.link,
        metadata: n.metadata,
        createdAt: n.created_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isArchived: (n as any).is_archived ?? false,
      })
    );
  }, [notificationsData]);

  // Apply chip filter (single select)
  const filteredNotifications = useMemo(() => {
    if (!activeFilter) return enrichedNotifications;
    const chips = FILTER_CHIPS[activeTab] ?? [];
    const chip = chips.find(c => c.key === activeFilter);
    if (!chip) return enrichedNotifications;

    return enrichedNotifications.filter(n => chip.filter(n));
  }, [enrichedNotifications, activeFilter, activeTab]);

  // Group by time
  const groupedNotifications = useMemo(
    () => groupByTime(filteredNotifications),
    [filteredNotifications]
  );

  // Unread counts per tab
  const unreadCounts = useMemo(() => {
    const all = enrichedNotifications.filter(n => n.unread).length;
    return { all, mentions: 0, dues: 0 };
  }, [enrichedNotifications]);

  const totalUnread = unreadCounts.all;

  // ── Handlers ─────────────────────────────────────────────────────

  const navigate = useCallback((path: string) => {
    router.push(path);
    onClose();
  }, [router, onClose]);

  const handleMarkAsRead = useCallback((id: number) => {
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const handleMarkAsUnread = useCallback((id: number) => {
    import('@/config/axios').then(({ default: axiosApi }) => {
      axiosApi.post(`/notifications/${id}/unread`).then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      });
    });
  }, [queryClient]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleDismiss = useCallback(async (id: number) => {
    try {
      await deleteNotification(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    } catch {
      message.error('Failed to dismiss notification');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const handleClearAll = useCallback(() => {
    modal.confirm({
      title: 'Clear all notifications',
      content: 'Clear all notifications? This cannot be undone.',
      okText: 'Clear All',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await clearAllNotifications();
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
          message.success('All notifications cleared');
        } catch {
          message.error('Failed to clear notifications');
        }
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setActiveFilter(null);
  }, []);

  const handleToggleFilter = useCallback((filterKey: string) => {
    setActiveFilter(prev => prev === filterKey ? null : filterKey);
  }, []);

  // ── Header 3-dot menu ────────────────────────────────────────────

  const hasNotifications = enrichedNotifications.length > 0;
  const hasUnread = totalUnread > 0;

  const headerMenuItems: MenuProps['items'] = [
    {
      key: 'mark-all',
      icon: <CheckCheck className="w-4 h-4" />,
      label: 'Mark all as read',
      onClick: handleMarkAllRead,
      disabled: !hasUnread,
    },
    { type: 'divider' },
    {
      key: 'clear-all',
      icon: <Trash2 className="w-4 h-4 text-[#ff3b3b]" />,
      label: <span className={hasNotifications ? 'text-[#ff3b3b]' : 'text-[#CCCCCC]'}>Clear all notifications</span>,
      onClick: handleClearAll,
      disabled: !hasNotifications,
    },
    { type: 'divider' },
    {
      key: 'settings',
      icon: <Settings className="w-4 h-4" />,
      label: 'Notification settings',
      onClick: () => { navigate('/dashboard/settings?tab=notifications'); },
    },
  ];

  // ── Drawer width ─────────────────────────────────────────────────

  const getDrawerWidth = () => {
    if (isMobile) return '100%';
    return 480;
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      styles={{
        wrapper: { width: getDrawerWidth() },
        body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
        header: { display: 'none' },
      }}
      className="notification-drawer"
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="px-4 md:px-5 py-3.5 border-b border-[#EEEEEE] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <h3 className="font-bold text-lg text-[#111111]">Notifications</h3>
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#ff3b3b] text-white text-xs font-bold">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {enrichedNotifications.length > 0 && !isMobile && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-[#999999] hover:text-[#ff3b3b] transition-colors"
            >
              Mark all read
            </button>
          )}
          <Dropdown menu={{ items: headerMenuItems }} trigger={['click']} placement="bottomRight">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] text-[#666666] transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </Dropdown>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] text-[#666666] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <NotificationTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCounts={unreadCounts}
      />

      {/* ── Filter chips ─────────────────────────────────────────── */}
      <NotificationFilterChips
        activeTab={activeTab}
        activeFilter={activeFilter}
        onToggleFilter={handleToggleFilter}
      />

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {isLoading ? (
          <div className="px-4 md:px-5 py-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-[#F3F4F6] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 bg-[#F3F4F6] rounded-full" />
                  <div className="h-3 w-1/2 bg-[#F3F4F6] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <NotificationEmptyState tab={activeTab} />
        ) : (
          <div className="flex flex-col">
            {groupedNotifications.map((group) => (
              <div key={group.group}>
                <NotificationGroupHeader label={group.label} count={group.items.length} />
                {group.items.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAsUnread={handleMarkAsUnread}
                    onDismiss={handleDismiss}
                    onNavigate={navigate}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
