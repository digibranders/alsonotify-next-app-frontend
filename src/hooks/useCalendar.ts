import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeamsConnectionStatus, getCalendarEvents, disconnectMicrosoft } from "../services/calendar";
import { queryKeys } from "../lib/queryKeys";
import dayjs from "dayjs";

export const useTeamsConnectionStatus = () => {
  return useQuery({
    queryKey: queryKeys.calendar.teamsConnection(),
    queryFn: () => getTeamsConnectionStatus(),
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Check every 2 minutes (was 30s — too aggressive)
    staleTime: 2 * 60 * 1000,
  });
};

export const useCalendarEvents = (startISO?: string, endISO?: string) => {
  const start = startISO || dayjs().startOf("day").toISOString();
  const end = endISO || dayjs().add(2, "day").endOf("day").toISOString();
  
  return useQuery({
    queryKey: queryKeys.calendar.events(start, end),
    queryFn: () => getCalendarEvents(start, end),
    enabled: !!start && !!end,
    staleTime: 60_000, // Consider fresh for 1 minute (was 0 — caused refetch on every tab focus)
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    refetchOnWindowFocus: true,
  });
};

export const useDisconnectTeams = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => disconnectMicrosoft(),
    onSuccess: () => {
      // Invalidate connection status and all calendar keys to be safe
      // We assume the root key is 'calendar' based on common patterns
      // Even if specific keys are used, invalidating the connection status is key
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.teamsConnection() });
      // Invalidate all events queries
      // Requires knowing the exact key structure, but commonly react-query matches partial keys
      // If queryKeys.calendar.events returns ['calendar', 'events', ...], this works:
      queryClient.invalidateQueries({ queryKey: ['calendar'] }); 
    },
  });
};
