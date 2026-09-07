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
import { getAzureOid, useCurrentUser } from "./useCurrentUser";
import {
  addPendingMessage,
  markMessageFailed,
  markMessagePending,
  preservePendingMessages,
  reconcilePendingMessage,
} from "./useTeamsRealtime";

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
    // Never poll in a hidden tab: a backgrounded dashboard otherwise hits
    // the API on this interval indefinitely, for data nobody is looking at.
    refetchIntervalInBackground: false,
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
    // Never poll in a hidden tab: a backgrounded dashboard otherwise hits
    // the API on this interval indefinitely, for data nobody is looking at.
    refetchIntervalInBackground: false,
  });
};

/**
 * Stand-in id for a hook rendered with nothing selected.
 *
 * React Query needs a key even for a query `enabled` has switched off, and
 * `chatId!` used to hand it the literal value — registering
 * `['teams','chats',null,'messages']` in the cache, which reads in the
 * devtools exactly like a real conversation. Named so it plainly is not a
 * Graph id, and never used for a fetch: `enabled` gates every call site below.
 */
const NO_CONVERSATION = "__none__";

export const useTeamsChatMessages = (chatId: string | null) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.teams.chatMessages(chatId ?? NO_CONVERSATION);
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!chatId) throw new Error("useTeamsChatMessages: fetched with no chat selected");
      const fetched = await getTeamsChatMessages(chatId);
      // Poll-vs-push race: this 120s poll's response is server data only, so
      // writing it straight to the cache would silently erase any
      // pending/failed optimistic row added by useSendTeamsChatMessage below.
      return preservePendingMessages(queryClient, queryKey, fetched);
    },
    enabled: !!chatId,
    staleTime: 15_000,
    // Messages now arrive over the WebSocket (see useWebSocket.ts ->
    // applyTeamsEvent), so this is a slow safety net, not the primary
    // update path. Keep it rather than deleting it: if the socket drops
    // (network blip, backend restart), chat degrades to slightly-stale
    // instead of going silent until the user reloads.
    refetchInterval: 120_000,
    // Never poll in a hidden tab: a backgrounded dashboard otherwise hits
    // the API on this interval indefinitely, for data nobody is looking at.
    refetchIntervalInBackground: false,
  });
};

/**
 * What the API is told when the caller does not say, and what the optimistic
 * row is rendered as in that case.
 *
 * Matches `sendTeamsChatMessage`'s own default, so a call site that has not
 * been threaded through yet keeps exactly the wire behaviour it has today —
 * and the optimistic bubble now renders the way the server copy will come
 * back, instead of contradicting it.
 */
const DEFAULT_SEND_CONTENT_TYPE = "html" as const;

interface SendTeamsChatMessageVariables {
  chatId: string;
  content: string;
  /**
   * What `content` actually is. TeamsMessageInput reports 'html' whenever the
   * contenteditable produced markup — which covers any bold/italic/list AND
   * any two-line message, since later lines are wrapped in `<div>` — and
   * 'text' otherwise. It must reach both the API (or plain text is posted to
   * Graph as HTML) and the optimistic row (or the user reads the literal
   * `<div>second line</div>` in their own bubble; harmless for the ~200-800ms
   * before reconcile, permanent on a failed send).
   */
  contentType?: "html" | "text";
  /**
   * Present when retrying a previously failed send: reuses that row's
   * tempId so the retry flips it back to pending IN PLACE, instead of
   * inserting a second, duplicate row for the same text.
   */
  retryTempId?: string;
}

export const useSendTeamsChatMessage = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const currentUserAzureId = getAzureOid(currentUser);

  return useMutation({
    mutationFn: ({ chatId, content, contentType }: SendTeamsChatMessageVariables) =>
      sendTeamsChatMessage(chatId, content, contentType ?? DEFAULT_SEND_CONTENT_TYPE),

    // Show it immediately. `tempId` is returned as mutation context so the
    // later callbacks can find this exact entry again. The author id must be
    // the Graph/Azure AD id (`azure_oid`), the same id TeamsChatMessage
    // compares against `currentUserAzureId` to decide "own message" styling
    // -- not `useUserDetails`'s internal numeric user id, which would render
    // the optimistic bubble as someone else's until it reconciles.
    //
    // It is genuinely null for everyone today (no backend code path writes
    // azure_oid), so it is passed through as null rather than coerced to "".
    // An empty-string id is not a weaker claim than null, it is a false one:
    // it compares unequal to every real sender id just the same, while
    // looking like a value. TeamsChatMessage gets its own-message answer from
    // __tempId for exactly this reason.
    onMutate: async ({
      chatId,
      content,
      contentType,
      retryTempId,
    }: SendTeamsChatMessageVariables) => {
      const tempId = retryTempId ?? `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (retryTempId) {
        markMessagePending(queryClient, chatId, retryTempId);
      } else {
        addPendingMessage(queryClient, chatId, {
          tempId,
          body: content,
          contentType: contentType ?? DEFAULT_SEND_CONTENT_TYPE,
          authorId: currentUserAzureId,
        });
      }
      return { tempId, chatId };
    },

    onSuccess: (response, _vars, context) => {
      if (!context) return;
      reconcilePendingMessage(queryClient, context.chatId, context.tempId, response.result);
      // Deliberately NOT invalidating the message list: refetching would
      // discard the optimistic update just reconciled above, and the
      // realtime event will also arrive over the socket (applyTeamsEvent),
      // which is a no-op once the id already matches.
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.chats() });
    },

    onError: (_err, _vars, context) => {
      if (!context) return;
      markMessageFailed(queryClient, context.chatId, context.tempId);
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
    queryKey: queryKeys.teams.channels(teamId ?? NO_CONVERSATION),
    queryFn: () => {
      if (!teamId) throw new Error("useTeamChannels: fetched with no team selected");
      return listChannels(teamId);
    },
    enabled: !!teamId,
    staleTime: 2 * 60_000,
  });
};

export const useChannelMessages = (
  teamId: string | null,
  channelId: string | null
) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.teams.channelMessages(
    teamId ?? NO_CONVERSATION,
    channelId ?? NO_CONVERSATION,
  );
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!teamId || !channelId) {
        throw new Error("useChannelMessages: fetched with no channel selected");
      }
      const fetched = await getChannelMessages(teamId, channelId);
      // Same poll-vs-push guard as useTeamsChatMessages: don't let a
      // server-only poll response silently erase a local pending/failed row.
      return preservePendingMessages(queryClient, queryKey, fetched);
    },
    enabled: !!teamId && !!channelId,
    staleTime: 15_000,
    // Channels have NO realtime path. The backend creates exactly one
    // subscription per user -- `/users/{azureOid}/chats/getAllMessages`,
    // kind USER_CHATS -- and no channel subscription anywhere, so
    // applyTeamsEvent's channel branch never executes and this poll is the
    // only way a channel message ever appears. It was dropped to 120s
    // alongside chat, where the socket justifies it; here that just made
    // channel messages 8x staler than before the feature. Restore it until
    // channel subscriptions ship.
    refetchInterval: 30_000,
    // Never poll in a hidden tab: a backgrounded dashboard otherwise hits
    // the API on this interval indefinitely, for data nobody is looking at.
    refetchIntervalInBackground: false,
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
    queryKey: queryKeys.teams.meetingAttendance(meetingId ?? NO_CONVERSATION),
    queryFn: () => {
      if (!meetingId) throw new Error("useMeetingAttendance: fetched with no meeting selected");
      return getMeetingAttendance(meetingId);
    },
    enabled: !!meetingId,
    staleTime: 60_000,
  });
};
