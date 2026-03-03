'use client';

import { useMemo, useState } from 'react';
import { Drawer, message } from 'antd';
import Cookies from 'universal-cookie';
import {
  BellOff,
  Bell,
  Info,
  X,
  Check,
  UserCheck,
  UserPlus,
  UserMinus,
  AtSign,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  RotateCcw,
  PlayCircle,
  Timer,
  CheckSquare,
  Link2Off,
  Inbox,
  FileText,
  XCircle,
  Eye,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useNotification';
import axiosApi from '@/config/axios';
import { useIsNarrow } from '@/hooks/useBreakpoint';
import { queryKeys } from '@/lib/queryKeys';
import type { NotificationTypeValue, NotificationMetadata } from '@/services/notification';
import type { LucideIcon } from 'lucide-react';

export type { NotificationTypeValue };

interface NotificationConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

const NOTIFICATION_CONFIG: Record<string, NotificationConfig> = {
  TASK_ASSIGNED:           { icon: UserCheck,    color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  TASK_COMMENT:            { icon: MessageSquare, color: '#555555', bgColor: '#f5f5f5', borderColor: '#e0e0e0' },
  TASK_MENTIONED:          { icon: AtSign,        color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  TASK_DUE_SOON:           { icon: Clock,         color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  TASK_OVERDUE:            { icon: AlertTriangle, color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  TASK_DELETED:            { icon: Trash2,        color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  TASK_STATUS_UPDATED:     { icon: RefreshCw,     color: '#7b1fa2', bgColor: '#f3e5f5', borderColor: '#e1bee7' },
  TASK_REVISION:           { icon: RotateCcw,     color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  TASK_COMPLETED:          { icon: CheckCircle2,  color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  TASK_YOUR_TURN:          { icon: PlayCircle,    color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  TASK_ESTIMATE_REQUESTED: { icon: Timer,         color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  TASK_ESTIMATE_PROVIDED:  { icon: CheckSquare,   color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  TASK_DEPENDENCY_CLEARED: { icon: Link2Off,      color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  TASK_MEMBER_ADDED:       { icon: UserPlus,      color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  TASK_MEMBER_REMOVED:     { icon: UserMinus,     color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  REQUIREMENT_RECEIVED:    { icon: Inbox,         color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  REQUIREMENT_SUBMITTED:   { icon: FileText,      color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  REQUIREMENT_ACCEPTED:    { icon: CheckCircle2,  color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  REQUIREMENT_REJECTED:    { icon: XCircle,       color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  REQUIREMENT_REVIEW:      { icon: Eye,           color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  REQUIREMENT_COMPLETED:   { icon: BadgeCheck,    color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  REQUIREMENT_REVISION:    { icon: RotateCcw,     color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  REQUIREMENT_APPROVED:    { icon: ShieldCheck,   color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  REQUIREMENT_MENTIONED:   { icon: AtSign,        color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  TODO_REMINDER:           { icon: Bell,          color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  PARTNER_INVITE:          { icon: UserPlus,      color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  GENERAL:                 { icon: Info,          color: '#555555', bgColor: '#f5f5f5', borderColor: '#e0e0e0' },
};

const DEFAULT_CONFIG: NotificationConfig = { icon: Info, color: '#555555', bgColor: '#f5f5f5', borderColor: '#e0e0e0' };

export interface NotificationItem {
  id: number;
  type: NotificationTypeValue | string;
  title: string | null;
  message: string;
  time: string;
  unread: boolean;
  icon?: string | null;
  actionLink?: string | null;
  metadata?: NotificationMetadata | null;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
  onMarkAsRead: (id: number) => void;
  onMarkAllRead: () => void;
}

function EmptyState({ message = 'No notifications' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[#F7F7F7] flex items-center justify-center mb-3">
        <BellOff className="w-5 h-5 text-[#999999]" />
      </div>
      <p className="font-semibold text-sm text-[#111111] mb-1">All caught up!</p>
      <p className="font-normal text-xs text-[#999999]">{message}</p>
    </div>
  );
}

function ActionButtons({
  notification,
  markAsRead,
  navigate,
}: {
  notification: NotificationItem;
  markAsRead: (id: number) => void;
  navigate: (path: string) => void;
}) {
  const queryClient = useQueryClient();
  const actions = notification.metadata?.actions ?? [];
  if (actions.length === 0) return null;

  const requirementId = notification.metadata?.requirementId as number | undefined;

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requirementId) return;
    try {
      await axiosApi.post('/requirement/approve', { requirement_id: requirementId, status: 'Assigned' });
      markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      if (notification.actionLink) navigate(notification.actionLink);
    } catch { message.error('Network error. Please try again.'); }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requirementId) return;
    try {
      await axiosApi.post('/requirement/approve', { requirement_id: requirementId, status: 'Rejected' });
      markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    } catch { message.error('Network error. Please try again.'); }
  };

  const handleNavigate = (e: React.MouseEvent, path?: string | null) => {
    e.stopPropagation();
    markAsRead(notification.id);
    if (path) navigate(path);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.includes('accept') && (
        <button
          onClick={handleApprove}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0F9D58] text-white hover:bg-[#0B8043] transition-colors shadow-sm"
          title="Accept"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
      {actions.includes('reject') && (
        <button
          onClick={handleReject}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#ff3b3b] text-white hover:bg-[#d32f2f] transition-colors shadow-sm"
          title="Reject"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {actions.includes('view_task') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full border border-[#EEEEEE] bg-white text-[#111111] hover:bg-[#F7F7F7] transition-colors text-xs font-medium"
        >
          View Task
        </button>
      )}
      {actions.includes('view_feedback') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full border border-[#EEEEEE] bg-white text-[#111111] hover:bg-[#F7F7F7] transition-colors text-xs font-medium"
        >
          View Feedback
        </button>
      )}
      {actions.includes('give_estimate') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full border border-[#1976d2] bg-[#e3f2fd] text-[#1976d2] hover:bg-[#bbdefb] transition-colors text-xs font-medium"
        >
          Give Estimate
        </button>
      )}
      {actions.includes('reply') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full border border-[#EEEEEE] bg-white text-[#111111] hover:bg-[#F7F7F7] transition-colors text-xs font-medium"
        >
          Reply
        </button>
      )}
      {actions.includes('revise_quote') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full bg-[#FF9800] text-white hover:bg-[#F57C00] transition-colors text-xs font-medium"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Revise Quote
        </button>
      )}
      {actions.includes('view_requirement') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full border border-[#EEEEEE] bg-white text-[#111111] hover:bg-[#F7F7F7] transition-colors text-xs font-medium"
        >
          View Requirement
        </button>
      )}
      {actions.includes('start_work') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full bg-[#0F9D58] text-white hover:bg-[#0B8043] transition-colors text-xs font-medium"
        >
          Start Work
        </button>
      )}
      {actions.includes('edit_resend') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full border border-[#1976d2] bg-[#e3f2fd] text-[#1976d2] hover:bg-[#bbdefb] transition-colors text-xs font-medium"
        >
          Edit &amp; Resend
        </button>
      )}
      {actions.includes('approve') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full bg-[#0F9D58] text-white hover:bg-[#0B8043] transition-colors text-xs font-medium"
        >
          Approve
        </button>
      )}
      {actions.includes('request_revision') && (
        <button
          onClick={(e) => handleNavigate(e, notification.actionLink)}
          className="h-7 px-3 flex items-center justify-center rounded-full border border-[#EEEEEE] bg-white text-[#111111] hover:bg-[#F7F7F7] transition-colors text-xs font-medium"
        >
          Request Revision
        </button>
      )}
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Just now';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch { return 'Just now'; }
}

function NotificationItemComponent({
  notification,
  markAsRead,
  navigate,
}: {
  notification: NotificationItem;
  markAsRead: (id: number) => void;
  navigate: (path: string) => void;
}) {
  const config = NOTIFICATION_CONFIG[notification.type] ?? DEFAULT_CONFIG;
  const IconComponent = config.icon;

  const handleClick = () => {
    markAsRead(notification.id);
    if (notification.actionLink) navigate(notification.actionLink);
  };

  const displayTitle = notification.title || notification.message;

  return (
    <div
      onClick={handleClick}
      className={`group relative px-5 py-4 border-b border-[#EEEEEE] cursor-pointer transition-all duration-200 hover:bg-[#F9F9F9] ${
        notification.unread ? 'bg-[#ff3b3b]/[0.04]' : 'bg-white'
      }`}
    >
      {notification.unread && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ff3b3b] rounded-r-full" />
      )}

      <div className="flex gap-3">
        <div
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border"
          style={{
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
            color: config.color,
          }}
        >
          <IconComponent className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h4
              className={`text-sm leading-snug ${
                notification.unread ? 'font-semibold text-[#111111]' : 'font-medium text-[#444444]'
              }`}
            >
              {displayTitle}
            </h4>
            <span className="text-[0.6875rem] text-[#999999] whitespace-nowrap font-normal shrink-0 mt-0.5">
              {notification.time}
            </span>
          </div>

          {notification.title && (
            <p className="text-[0.8125rem] text-[#666666] font-normal leading-relaxed mb-2 line-clamp-2">
              {notification.message}
            </p>
          )}

          <ActionButtons
            notification={notification}
            markAsRead={markAsRead}
            navigate={navigate}
          />
        </div>
      </div>
    </div>
  );
}

export function NotificationPanel({
  open,
  onClose,
  isLoading: initialLoading,
  onMarkAsRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const isMobile = useIsNarrow('md');

  const { data: notificationsData, isLoading: isHookLoading } = useNotifications(activeTab);

  const notifications = useMemo<NotificationItem[]>(() => {
    if (!notificationsData?.result) return [];
    return notificationsData.result.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      time: getRelativeTime(n.created_at),
      unread: !n.is_read,
      icon: n.icon,
      actionLink: n.link,
      metadata: n.metadata,
    }));
  }, [notificationsData]);

  const isLoading = initialLoading || isHookLoading;
  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'dues', label: 'Dues' },
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
        wrapper: { width: isMobile ? '100%' : 460 },
        body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
        header: { display: 'none' },
      }}
      className="notification-drawer"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EEEEEE] flex flex-row items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-[#111111]">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#ff3b3b] text-white text-[0.6875rem] font-bold">
              {unreadCount} New
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {notifications.length > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs font-semibold text-[#999999] hover:text-[#ff3b3b] transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 -mr-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 py-3 bg-[#FAFAFA] border-b border-[#EEEEEE] shrink-0">
        <div className="bg-[#EEEEEE]/50 h-9 p-1 rounded-lg flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.key
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
          <div className="px-5 py-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F3F4F6] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-[#F3F4F6] rounded-full" />
                  <div className="h-3 w-1/2 bg-[#F3F4F6] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            message={
              activeTab === 'mentions'
                ? 'No mentions yet'
                : activeTab === 'dues'
                ? 'No upcoming dues'
                : 'No notifications yet'
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
