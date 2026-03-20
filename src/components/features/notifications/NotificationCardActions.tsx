'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import axiosApi from '@/config/axios';
import { queryKeys } from '@/lib/queryKeys';
import { removeActionsFromCache, isStaleActionError } from '@/utils/notificationCacheUtils';
import type { NotificationItem } from './types';

interface ActionButtonsProps {
  notification: NotificationItem;
  onMarkAsRead: (id: number) => void;
  onNavigate: (path: string) => void;
}

export function NotificationCardActions({ notification, onMarkAsRead, onNavigate }: ActionButtonsProps) {
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const [isActioning, setIsActioning] = useState(false);
  const actions = notification.metadata?.actions ?? [];
  if (actions.length === 0) return null;

  const requirementId = notification.metadata?.requirementId as number | undefined;

  const handleStaleError = (error: unknown, fallbackMsg: string) => {
    if (isStaleActionError(error)) {
      message.info('This action has already been completed.');
      removeActionsFromCache(queryClient, notification.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    } else {
      message.error(fallbackMsg);
    }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requirementId || isActioning) return;
    setIsActioning(true);
    try {
      await axiosApi.post('/requirement/approve', { requirement_id: requirementId, status: 'Assigned' });
      onMarkAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      if (notification.actionLink) onNavigate(notification.actionLink);
    } catch (error) {
      handleStaleError(error, 'Failed to accept. Please try again.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requirementId || isActioning) return;

    modal.confirm({
      title: 'Reject Requirement',
      content: `Are you sure you want to reject "${notification.metadata?.requirementName || 'this requirement'}"? The sender will be notified.`,
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setIsActioning(true);
        try {
          await axiosApi.post('/requirement/approve', { requirement_id: requirementId, status: 'Rejected' });
          onMarkAsRead(notification.id);
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
        } catch (error) {
          handleStaleError(error, 'Failed to reject. Please try again.');
        } finally {
          setIsActioning(false);
        }
      },
    });
  };

  const handleNavigate = (e: React.MouseEvent, path?: string | null) => {
    e.stopPropagation();
    try { onMarkAsRead(notification.id); } catch { /* swallow if notification already gone */ }
    if (path) onNavigate(path);
  };

  const disabled = isActioning;
  const disabledClass = disabled ? ' opacity-50 cursor-not-allowed pointer-events-none' : '';

  // Consistent text pill style for all CTAs
  const primaryBtn = `h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors bg-[#0F9D58] text-white hover:bg-[#0B8043]${disabledClass}`;
  const dangerBtn = `h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors bg-white text-[#ff3b3b] border border-[#ff3b3b]/30 hover:bg-[#FFF5F5]${disabledClass}`;
  const outlineBtn = `h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors border border-[#EEEEEE] bg-white text-[#111111] hover:bg-[#F7F7F7]${disabledClass}`;
  const accentBtn = `h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors border border-[#1976d2] bg-[#e3f2fd] text-[#1976d2] hover:bg-[#bbdefb]${disabledClass}`;
  const warningBtn = `h-6 px-2.5 flex items-center justify-center rounded-full text-2xs font-medium transition-colors bg-[#FF9800] text-white hover:bg-[#F57C00]${disabledClass}`;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {actions.includes('accept') && (
        <button onClick={handleApprove} disabled={disabled} className={primaryBtn}>Accept</button>
      )}
      {actions.includes('reject') && (
        <button onClick={handleReject} disabled={disabled} className={dangerBtn}>Reject</button>
      )}
      {actions.includes('approve') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} disabled={disabled} className={primaryBtn}>Approve</button>
      )}
      {actions.includes('request_revision') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} disabled={disabled} className={outlineBtn}>Request Revision</button>
      )}
      {actions.includes('start_work') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} disabled={disabled} className={primaryBtn}>Start Work</button>
      )}
      {actions.includes('give_estimate') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} disabled={disabled} className={accentBtn}>Give Estimate</button>
      )}
      {actions.includes('revise_quote') && (
        <button onClick={(e) => handleNavigate(e, notification.actionLink)} disabled={disabled} className={warningBtn}>
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
