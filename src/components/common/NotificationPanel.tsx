'use client';

import { useMemo, useState } from 'react';
import { Drawer } from 'antd';
import {
  BellOff, FileText, AlertCircle, CheckSquare, Info, X, Check, Users,
  Inbox, CheckCircle2, XCircle, ClipboardList, BadgeCheck, RotateCcw,
  UserPlus, UserCheck, UserX, Bell
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotification';

// All notification types from backend NotificationType enum + legacy types
export type NotificationTypeValue =
  // Database NotificationType enum values
  | 'GENERAL' | 'TODO_REMINDER' | 'PARTNER_INVITE'
  | 'REQUIREMENT_RECEIVED' | 'REQUIREMENT_ACCEPTED' | 'REQUIREMENT_REJECTED'
  | 'REQUIREMENT_REVIEW' | 'REQUIREMENT_COMPLETED' | 'REQUIREMENT_REVISION'
  // Legacy/frontend types
  | 'requirement' | 'task' | 'delivery' | 'workspace' | 'alert' | 'general' | 'partner_invite';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type?: NotificationTypeValue;
  icon?: string; // Backend icon field: 'info_icon', 'warning_icon', 'bell', 'check', 'x', 'users', etc.
  actionLink?: string;
  actionLabel?: string;
  metadata?: {
    requirement_id?: number;
    actions?: string[];
    sender_company_id?: number;
  };
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
  onMarkAsRead: (id: number) => void;
  onMarkAllRead: () => void;
}

function EmptyState({ message = "No notifications" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[#F7F7F7] flex items-center justify-center mb-3">
        <BellOff className="w-5 h-5 text-[#999999]" />
      </div>
      <p className="font-['Manrope:SemiBold',sans-serif] text-[14px] text-[#111111] mb-1">
        All caught up!
      </p>
      <p className="font-['Inter:Regular',sans-serif] text-[12px] text-[#999999]">
        {message}
      </p>
    </div>
  );
}

function NotificationItemComponent({
  notification,
  markAsRead,
  navigate
}: {
  notification: NotificationItem;
  markAsRead: (id: number) => void;
  navigate: (path: string) => void;
}) {
  // Get icon based on type AND backend icon field
  const getIcon = (type?: string, iconField?: string) => {
    // First check backend icon field for granular control
    if (iconField) {
      switch (iconField) {
        case 'bell': return <Bell className="w-5 h-5" />;
        case 'check': return <UserCheck className="w-5 h-5" />;
        case 'x': return <UserX className="w-5 h-5" />;
        case 'users': return <Users className="w-5 h-5" />;
        case 'warning_icon': return <AlertCircle className="w-5 h-5" />;
        case 'info_icon': return <Info className="w-5 h-5" />;
        case 'inbox': return <Inbox className="w-5 h-5" />;
      }
    }

    // Then check type for category-based icons
    switch (type) {
      // Requirements
      case 'requirement': return <FileText className="w-5 h-5" />;
      case 'REQUIREMENT_RECEIVED': return <Inbox className="w-5 h-5" />;
      case 'REQUIREMENT_ACCEPTED': return <CheckCircle2 className="w-5 h-5" />;
      case 'REQUIREMENT_REJECTED': return <XCircle className="w-5 h-5" />;
      case 'REQUIREMENT_REVIEW': return <ClipboardList className="w-5 h-5" />;
      case 'REQUIREMENT_COMPLETED': return <BadgeCheck className="w-5 h-5" />;
      case 'REQUIREMENT_REVISION': return <RotateCcw className="w-5 h-5" />;
      // Partners
      case 'partner_invite':
      case 'PARTNER_INVITE': return <UserPlus className="w-5 h-5" />;
      // Tasks & Reminders
      case 'task': return <CheckSquare className="w-5 h-5" />;
      case 'TODO_REMINDER': return <Bell className="w-5 h-5" />;
      // Alerts
      case 'alert': return <AlertCircle className="w-5 h-5" />;
      // Others
      case 'delivery': return <Info className="w-5 h-5" />;
      case 'workspace': return <Info className="w-5 h-5" />;
      case 'GENERAL':
      case 'general':
      default: return <Info className="w-5 h-5" />;
    }
  };

  // Get color based on type
  const getColorClasses = (type?: string) => {
    switch (type) {
      case 'REQUIREMENT_RECEIVED': return 'bg-blue-50 border-blue-100 text-blue-600';
      case 'REQUIREMENT_ACCEPTED': return 'bg-green-50 border-green-100 text-green-600';
      case 'REQUIREMENT_REJECTED': return 'bg-red-50 border-red-100 text-red-600';
      case 'REQUIREMENT_REVIEW': return 'bg-yellow-50 border-yellow-100 text-yellow-600';
      case 'REQUIREMENT_COMPLETED': return 'bg-emerald-50 border-emerald-100 text-emerald-600';
      case 'REQUIREMENT_REVISION': return 'bg-orange-50 border-orange-100 text-orange-600';
      case 'requirement': return 'bg-blue-50 border-blue-100 text-blue-600';
      case 'partner_invite':
      case 'PARTNER_INVITE': return 'bg-purple-50 border-purple-100 text-purple-600';
      case 'task':
      case 'TODO_REMINDER': return 'bg-orange-50 border-orange-100 text-orange-600';
      case 'alert': return 'bg-red-50 border-red-100 text-red-600';
      default: return 'bg-gray-50 border-gray-100 text-gray-600';
    }
  };

  const handleClick = () => {
    markAsRead(notification.id);
    if (notification.actionLink) {
      navigate(notification.actionLink);
    } else {
      if (notification.type === 'requirement') navigate('/dashboard/requirements');
      if (notification.type === 'task') navigate('/dashboard/tasks');
      if (notification.type === 'alert') navigate('/dashboard/tasks');
      if (notification.type === 'partner_invite') navigate('/dashboard/partners');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative px-5 py-4 border-b border-[#EEEEEE] cursor-pointer transition-all duration-200 hover:bg-[#F9F9F9] ${notification.unread ? 'bg-[#ff3b3b]/[0.02]' : 'bg-white'
        }`}
    >
      {notification.unread && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff3b3b]" />
      )}

      <div className="flex gap-4">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${getColorClasses(notification.type)}`}>
          {getIcon(notification.type, notification.icon)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-[14px] leading-tight truncate ${notification.unread ? "font-['Manrope:Bold',sans-serif] text-[#111111]" : "font-['Manrope:Medium',sans-serif] text-[#666666]"}`}>
              {notification.title}
            </h4>
            <span className="text-[11px] text-[#999999] whitespace-nowrap font-['Inter:Regular',sans-serif] shrink-0">
              {notification.time}
            </span>
          </div>

          <p className="text-[13px] text-[#666666] font-['Inter:Regular',sans-serif] leading-relaxed mb-3 line-clamp-2">
            {notification.message}
          </p>

          {/* Show action buttons for incoming requirement notifications */}
          {(notification.type === 'REQUIREMENT_RECEIVED' && notification.metadata?.actions?.includes('accept')) && (
            <div className="flex justify-start gap-2 mt-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (notification.metadata?.requirement_id) {
                    try {
                      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
                      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/requirement/approve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ requirement_id: notification.metadata.requirement_id, status: 'Rejected' })
                      });
                      const data = await resp.json();
                      if (!resp.ok) {
                        alert(data?.message || 'Failed to reject requirement. It may have already been processed.');
                        return;
                      }
                      markAsRead(notification.id);
                    } catch (err) {
                      console.error('Reject failed:', err);
                      alert('Network error. Please try again.');
                    }
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#ff3b3b] text-white hover:bg-[#d32f2f] transition-colors shadow-sm ring-1 ring-[#ff3b3b]/10"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (notification.metadata?.requirement_id) {
                    try {
                      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
                      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/requirement/approve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ requirement_id: notification.metadata.requirement_id, status: 'Assigned' })
                      });
                      const data = await resp.json();
                      if (!resp.ok) {
                        alert(data?.message || 'Failed to accept requirement. It may have already been processed.');
                        return;
                      }
                      markAsRead(notification.id);
                      if (notification.actionLink) navigate(notification.actionLink);
                    } catch (err) {
                      console.error('Accept failed:', err);
                      alert('Network error. Please try again.');
                    }
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0F9D58] text-white hover:bg-[#0B8043] transition-colors shadow-sm ring-1 ring-[#0F9D58]/10"
                title="Accept"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Show action button for rejected requirements (Revision) */}
          {(notification.type === 'REQUIREMENT_REJECTED' && notification.metadata?.actions?.includes('revise')) && (
            <div className="flex justify-start gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notification.id);
                  if (notification.actionLink) navigate(notification.actionLink);
                }}
                className="h-8 px-4 flex items-center justify-center rounded-full bg-[#FF9800] text-white hover:bg-[#F57C00] transition-colors shadow-sm ring-1 ring-[#FF9800]/10 text-xs font-semibold"
                title="Revise Quote"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Revise Quote
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationPanel({
  open,
  onClose,
  // notifications prop is now ignored in favor of internal hook for data consistency
  isLoading: initialLoading,
  onMarkAsRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');

  // Use the hook internally to get filtered data
  const { data: notificationsData, isLoading: isHookLoading } = useNotifications(activeTab);

  // Map API data to UI format
  const notifications = useMemo(() => {
    if (!notificationsData?.result) return [];
    return notificationsData.result.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      time: new Date(n.created_at).toLocaleDateString(), // Basic formatting, consider date-fns for "2 hours ago"
      unread: !n.is_read,
      type: (n.type as NotificationTypeValue) || 'general',
      icon: n.icon,
      actionLink: n.link,
      metadata: n.metadata as NotificationItem['metadata']
    }));
  }, [notificationsData]);

  const isLoading = initialLoading || isHookLoading;

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const tabItems = [
    {
      key: 'all',
      label: 'All',
    },
    {
      key: 'mentions',
      label: 'Mentions',
    },
    {
      key: 'dues',
      label: 'Dues',
    },
  ];

  const navigate = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      styles={{
        wrapper: {
          width: 500,
        },
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
        header: {
          display: 'none',
        },
      }}
      className="notification-drawer"
    >
      {/* Header */}
      <div className="p-5 border-b border-[#EEEEEE] flex flex-row items-center justify-between bg-white shrink-0 z-10">
        <div className="flex items-center gap-3">
          <h3 className="font-['Manrope:Bold',sans-serif] text-[18px] text-[#111111]">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#ff3b3b] text-white text-[11px] font-['Manrope:Bold',sans-serif]">
              {unreadCount} New
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-[12px] font-['Manrope:SemiBold',sans-serif] text-[#999999] hover:text-[#ff3b3b] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-5 py-3 bg-[#FAFAFA] border-b border-[#EEEEEE] shrink-0">
        <div className="bg-[#EEEEEE]/50 h-9 p-1 rounded-lg w-full flex justify-start gap-1">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md text-[12px] font-['Inter:Medium',sans-serif] transition-all ${activeTab === tab.key
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 space-y-3">
            <div className="h-3 w-24 bg-[#F3F4F6] rounded-full" />
            <div className="h-3 w-56 bg-[#F3F4F6] rounded-full" />
            <div className="h-3 w-40 bg-[#F3F4F6] rounded-full" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            message={
              activeTab === 'mentions'
                ? 'No mentions yet'
                : activeTab === 'dues'
                  ? 'No upcoming dues'
                  : 'No notifications'
            }
          />
        ) : (
          <div className="flex flex-col">
            {notifications.map((notification) => (
              <NotificationItemComponent
                key={notification.id}
                notification={notification}
                markAsRead={onMarkAsRead}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
