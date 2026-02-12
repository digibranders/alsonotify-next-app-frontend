import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification";
import { queryKeys } from "../lib/queryKeys";

export const useNotifications = (activeTab: string = 'all') => {
  return useQuery({
    queryKey: queryKeys.notifications.all(activeTab),
    queryFn: () => fetchNotifications(activeTab),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 5000, // Poll every 5 seconds for real-time feel
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
};

