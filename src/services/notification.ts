import axiosApi from "../config/axios";
import { ApiResponse } from "../constants/constants";

export type NotificationTypeValue =
  // Task notifications
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENT'
  | 'TASK_MENTIONED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_DELETED'
  | 'TASK_STATUS_UPDATED'
  | 'TASK_REVISION'
  | 'TASK_COMPLETED'
  | 'TASK_YOUR_TURN'
  | 'TASK_ESTIMATE_REQUESTED'
  | 'TASK_ESTIMATE_PROVIDED'
  | 'TASK_DEPENDENCY_CLEARED'
  | 'TASK_MEMBER_ADDED'
  | 'TASK_MEMBER_REMOVED'
  // Requirement notifications
  | 'REQUIREMENT_RECEIVED'
  | 'REQUIREMENT_SUBMITTED'
  | 'REQUIREMENT_ACCEPTED'
  | 'REQUIREMENT_REJECTED'
  | 'REQUIREMENT_REVIEW'
  | 'REQUIREMENT_COMPLETED'
  | 'REQUIREMENT_REVISION'
  | 'REQUIREMENT_APPROVED'
  | 'REQUIREMENT_MENTIONED'
  // General
  | 'TODO_REMINDER'
  | 'PARTNER_INVITE'
  | 'GENERAL';

export interface NotificationMetadata {
  // Task fields
  taskId?: number;
  taskName?: string;
  workspaceId?: number;
  actorName?: string;
  priority?: string;
  endDate?: string;
  oldStatus?: string;
  newStatus?: string;
  memberName?: string;
  feedbackPreview?: string;
  parentTaskName?: string;
  estimatedHours?: number;
  timeRemaining?: string;
  // Requirement fields
  requirementId?: number;
  requirementName?: string;
  senderCompanyName?: string;
  receiverCompanyName?: string;
  quotedPrice?: number;
  currency?: string;
  pricingModel?: string;
  rejectionReason?: string;
  revisionRemark?: string;
  approvalRating?: number;
  approvalRemark?: string;
  submissionRemark?: string;
  isRevision?: boolean;
  // UI actions
  actions?: string[];
  messagePreview?: string;
  // Allow additional fields
  [key: string]: unknown;
}

export interface Notification {
  id: number;
  type: NotificationTypeValue | string;
  title: string | null;
  message: string;
  icon?: string | null;
  is_read: boolean;
  created_at: string;
  link?: string | null;
  metadata?: NotificationMetadata | null;
}

// Fetch notifications
export const fetchNotifications = async (tab: string = 'all'): Promise<ApiResponse<Notification[]>> => {
  const { data } = await axiosApi.get<ApiResponse<Notification[]>>("/notifications", {
    params: { tab }
  });
  return data;
};

// Mark all notifications as read
export const markAllNotificationsRead = async (): Promise<ApiResponse<void>> => {
  const { data } = await axiosApi.post<ApiResponse<void>>("/notifications/mark-read");
  return data;
};

// Mark notification as read
export const markNotificationRead = async (id: number): Promise<ApiResponse<void>> => {
  const { data } = await axiosApi.post<ApiResponse<void>>(`/notifications/${id}/read`);
  return data;
};
