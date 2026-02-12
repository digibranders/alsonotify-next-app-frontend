import axiosApi from "../config/axios";
import { ApiResponse } from "../constants/constants";

export interface Notification {
  id: number;
  type?: string;
  title: string;
  message: string;
  icon?: string;
  is_read: boolean;
  created_at: string;
  reference_id?: number;
  reference_type?: string;
  link?: string;
  metadata?: {
    requirement_id?: number;
    actions?: string[];
    sender_company_id?: number;
    // adding index signature to allow flexible metadata without 'any'
    [key: string]: unknown;
  };
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

