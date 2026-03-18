import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPresences,
  createOnlineMeeting,
  deleteOnlineMeeting,
  listTeamsChats,
  createTeamsChat,
  getTeamsChatMessages,
  sendTeamsChatMessage,
  listJoinedTeams,
  listChannels,
  getChannelMessages,
  sendChannelMessage,
  getMeetingAttendance,
  searchTeamsPeople,
  CreateOnlineMeetingPayload,
} from "../services/teams";
import { queryKeys } from "../lib/queryKeys";

// ─── People Search ───────────────────────────────────────────────────

export const useTeamsPeopleSearch = (query: string) => {
  return useQuery({
    queryKey: ['teams', 'people', query],
    queryFn: () => searchTeamsPeople(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
};

// ─── Presence ────────────────────────────────────────────────────────

export const usePresences = (azureUserIds: string[]) => {
  return useQuery({
    queryKey: queryKeys.teams.presences(azureUserIds),
    queryFn: () => getPresences(azureUserIds),
    enabled: azureUserIds.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
};

// ─── Online Meetings ─────────────────────────────────────────────────

export const useCreateOnlineMeeting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOnlineMeetingPayload) =>
      createOnlineMeeting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
};

export const useDeleteOnlineMeeting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => deleteOnlineMeeting(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
};

// ─── Chat ────────────────────────────────────────────────────────────

export const useTeamsChats = () => {
  return useQuery({
    queryKey: queryKeys.teams.chats(),
    queryFn: () => listTeamsChats(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
};

export const useTeamsChatMessages = (chatId: string | null) => {
  return useQuery({
    queryKey: queryKeys.teams.chatMessages(chatId!),
    queryFn: () => getTeamsChatMessages(chatId!),
    enabled: !!chatId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
};

export const useSendTeamsChatMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      sendTeamsChatMessage(chatId, content),
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.chatMessages(chatId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.chats() });
    },
  });
};

export const useCreateTeamsChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantIds: string[]) => createTeamsChat(participantIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.chats() });
    },
  });
};

// ─── Teams & Channels ────────────────────────────────────────────────

export const useJoinedTeams = () => {
  return useQuery({
    queryKey: queryKeys.teams.joinedTeams(),
    queryFn: () => listJoinedTeams(),
    staleTime: 5 * 60_000,
  });
};

export const useTeamChannels = (teamId: string | null) => {
  return useQuery({
    queryKey: queryKeys.teams.channels(teamId!),
    queryFn: () => listChannels(teamId!),
    enabled: !!teamId,
    staleTime: 2 * 60_000,
  });
};

export const useChannelMessages = (
  teamId: string | null,
  channelId: string | null
) => {
  return useQuery({
    queryKey: queryKeys.teams.channelMessages(teamId!, channelId!),
    queryFn: () => getChannelMessages(teamId!, channelId!),
    enabled: !!teamId && !!channelId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
};

export const useSendChannelMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      channelId,
      content,
    }: {
      teamId: string;
      channelId: string;
      content: string;
    }) => sendChannelMessage(teamId, channelId, content),
    onSuccess: (_, { teamId, channelId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teams.channelMessages(teamId, channelId),
      });
    },
  });
};

// ─── Meeting Attendance ──────────────────────────────────────────────

export const useMeetingAttendance = (meetingId: string | null) => {
  return useQuery({
    queryKey: queryKeys.teams.meetingAttendance(meetingId!),
    queryFn: () => getMeetingAttendance(meetingId!),
    enabled: !!meetingId,
    staleTime: 60_000,
  });
};
