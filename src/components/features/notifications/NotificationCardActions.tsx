'use client';

import { RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import axiosApi from '@/config/axios';
import { queryKeys } from '@/lib/queryKeys';
import type { NotificationItem } from './types';

interface ActionButtonsProps {
  notification: NotificationItem;
  onMarkAsRead: (id: number) => void;
  onNavigate: (path: string) => void;
}

export function NotificationCardActions({ notification, onMarkAsRead, onNavigate }: ActionButtonsProps) {
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const actions = notification.metadata?.actions ?? [];
  if (actions.length === 0) return null;

  const requirementId = notification.metadata?.requirementId as number | undefined;

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requirementId) return;
    try {
      await axiosApi.post('/requirement/approve', { requirement_id: requirementId, status: 'Assigned' });
      onMarkAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      if (notification.actionLink) onNavigate(notification.actionLink);
    } catch { message.error('Network error. Please try again.'); }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requirementId) return;

    modal.confirm({
      title: 'Reject Requirement',
      content: `Are you sure you want to reject "${notification.metadata?.requirementName || 'this requirement'}"? The sender will be notified.`,
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axiosApi.post('/requirement/approve', { requirement_id: requirementId, status: 'Rejected' });
          onMarkAsRead(notification.id);
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
        } catch { message.error('Network error. Please try again.'); }
      },
    });
  };

  const handleNavigate = (e: React.MouseEvent, path?: string | null) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
    if (path) onNavigate(path);
  };

  // Consistent text pill style for all CTAs
  const primaryBtn = 'h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors bg-[#0F9D58] text-white hover:bg-[#0B8043]';
  const dangerBtn = 'h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors bg-white text-[#ff3b3b] border border-[#ff3b3b]/30 hover:bg-[#FFF5F5]';
  const outlineBtn = 'h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors border border-[#EEEEEE] bg-white text-[#111111] hover:bg-[#F7F7F7]';
  const accentBtn = 'h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors border border-[#1976d2] bg-[#e3f2fd] text-[#1976d2] hover:bg-[#bbdefb]';
  const warningBtn = 'h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors bg-[#FF9800] text-white hover:bg-[#F57C00]';

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {actions.includes('accept') && (
        <button onClick={handleApprove} className={primaryBtn}>Accept</button>
      )}
      {actions.includes('reject') && (
        <button onClick={handleReject} className={dangerBtn}>Reject</button>
      )}
      {actions.includes('approve') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={primaryBtn}>Approve</button>
      )}
      {actions.includes('request_revision') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={outlineBtn}>Request Revision</button>
      )}
      {actions.includes('start_work') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={primaryBtn}>Start Work</button>
      )}
      {actions.includes('give_estimate') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={accentBtn}>Give Estimate</button>
      )}
      {actions.includes('revise_quote') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={warningBtn}>
          <RotateCcw className="w-2.5 h-2.5 mr-1" />
          Revise Quote
        </button>
      )}
      {actions.includes('view_task') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={outlineBtn}>View Task</button>
      )}
      {actions.includes('view_requirement') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={outlineBtn}>View Requirement</button>
      )}
      {actions.includes('view_feedback') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={outlineBtn}>View Feedback</button>
      )}
      {actions.includes('reply') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={outlineBtn}>Reply</button>
      )}
      {actions.includes('edit_resend') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={accentBtn}>Edit &amp; Resend</button>
      )}
      {actions.includes('view_invoice') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} className={outlineBtn}>View Invoice</button>
      )}
    </div>
  );
}
