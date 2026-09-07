import axiosApi from "../config/axios";
import { ApiResponse } from "../constants/constants";

// ─── Types ───────────────────────────────────────────────────────────

export type PresenceAvailability =
  | "Available"
  | "AvailableIdle"
  | "Busy"
  | "BusyIdle"
  | "DoNotDisturb"
  | "BeRightBack"
  | "Away"
  | "Offline"
  | "PresenceUnknown";

export interface PresenceInfo {
  id: string; // Azure AD user ID
  availability: PresenceAvailability;
  activity: string;
}

export interface CreateOnlineMeetingPayload {
  subject: string;
  startDateTime: string;
  endDateTime: string;
  participants?: {
    attendees: Array<{ upn: string; role: "attendee" | "presenter" }>;
  };
}

export interface OnlineMeeting {
  id: string;
  joinUrl: string;
  joinWebUrl: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
}

export interface TeamsChat {
  id: string;
  topic: string | null;
  chatType: "oneOnOne" | "group" | "meeting";
  createdDateTime: string;
  lastUpdatedDateTime: string;
  lastMessagePreview?: {
    body: { content: string; contentType: string };
    from?: { user?: { displayName: string } };
  };
  members?: Array<{
    displayName: string;
    userId: string;
    email: string;
  }>;
}

/**
 * Every field is nullable because Graph makes no promise about any of them:
 * a hero-card attachment has no `name`, a file attachment no `content`. The
 * realtime path normalises a missing or non-string field to null rather than
 * inventing a value (see toTeamsEvent), and TeamsAttachmentCard renders around
 * the gaps. Declaring these `string` was a claim, not a check.
 */
export interface TeamsChatMessageAttachment {
  id: string | null;
  name: string | null;
  contentType: string | null;
  contentUrl: string | null;
  content?: string | null;
  thumbnailUrl?: string | null;
}

/** Nullable for the same reason as TeamsChatMessageAttachment above. */
export interface TeamsChatMessageReaction {
  reactionType: string | null;
  user: { id?: string | null; displayName: string | null };
  createdDateTime: string | null;
}

export interface TeamsChatMessage {
  id: string;
  /**
   * 'message' | 'systemEventMessage' | anything Graph adds later. A plain
   * string on purpose: the UI already renders nothing for anything that is
   * not 'message', and narrowing here would turn an unrecognised value into a
   * type error at the boundary rather than data to skip.
   */
  messageType: string;
  createdDateTime: string;
  /**
   * Nullable throughout, deliberately. Graph omits `from.user` entirely on
   * system event messages, the realtime event maps a missing sender to `null`
   * (see toTeamsEvent / toCached), and an optimistic row has no sender id at
   * all until `azure_oid` is populated. Typing these `string` said none of
   * that could happen while the code wrote it anyway; every render site
   * already guards with `?.` and a fallback.
   */
  from?: {
    user?: { displayName: string | null; id: string | null } | null;
  } | null;
  body: { contentType: "html" | "text"; content: string };
  attachments?: TeamsChatMessageAttachment[];
  reactions?: TeamsChatMessageReaction[];
  replyToId?: string | null;
  /** Local-only: set while an optimistic send is in flight or has failed (see useTeamsRealtime.ts). Never present on server data. */
  __status?: "pending" | "failed";
  /** Local-only: correlates an optimistic message with its eventual server copy. Never present on server data. */
  __tempId?: string;
}

export interface Team {
  id: string;
  displayName: string;
  description?: string;
}

export interface Channel {
  id: string;
  displayName: string;
  description?: string;
  membershipType: "standard" | "private" | "shared";
}

export interface ChannelMessage {
  id: string;
  messageType: string;
  createdDateTime: string;
  /** Nullable for the same reasons as TeamsChatMessage.from above. */
  from?: { user?: { displayName: string | null; id: string | null } | null } | null;
  body: { contentType: "html" | "text"; content: string };
  /** Local-only: set while an optimistic send is in flight or has failed (see useTeamsRealtime.ts). Never present on server data. */
  __status?: "pending" | "failed";
  /** Local-only: correlates an optimistic message with its eventual server copy. Never present on server data. */
  __tempId?: string;
}

export interface AttendanceReport {
  id: string;
  totalParticipantCount: number;
  meetingStartDateTime: string;
  meetingEndDateTime: string;
  attendanceRecords?: Array<{
    id: string;
    emailAddress: string;
    identity: { displayName: string };
    role: string;
    totalAttendanceInSeconds: number;
    attendanceIntervals: Array<{
      joinDateTime: string;
      leaveDateTime: string;
      durationInSeconds: number;
    }>;
  }>;
}

// ─── People Search ───────────────────────────────────────────────────

export interface GraphPerson {
  id: string;
  displayName: string;
  mail?: string;
}

export const searchTeamsPeople = async (
  query: string,
  top: number = 20
): Promise<ApiResponse<GraphPerson[]>> => {
  const { data } = await axiosApi.get<ApiResponse<GraphPerson[]>>(
    "/teams/people",
    { params: { q: query, top } }
  );
  return data;
};

// ─── Presence ────────────────────────────────────────────────────────

export const getPresences = async (
  userIds: string[]
): Promise<ApiResponse<PresenceInfo[]>> => {
  const { data } = await axiosApi.get<ApiResponse<PresenceInfo[]>>(
    "/teams/presence",
    { params: { userIds: userIds.join(",") } }
  );
  return data;
};

// ─── Online Meetings ─────────────────────────────────────────────────

export const createOnlineMeeting = async (
  payload: CreateOnlineMeetingPayload
): Promise<ApiResponse<OnlineMeeting>> => {
  const { data } = await axiosApi.post<ApiResponse<OnlineMeeting>>(
    "/teams/meetings",
    payload
  );
  return data;
};

export const getOnlineMeeting = async (
  meetingId: string
): Promise<ApiResponse<OnlineMeeting>> => {
  const { data } = await axiosApi.get<ApiResponse<OnlineMeeting>>(
    `/teams/meetings/${meetingId}`
  );
  return data;
};

export const deleteOnlineMeeting = async (
  meetingId: string
): Promise<ApiResponse<void>> => {
  const { data } = await axiosApi.delete<ApiResponse<void>>(
    `/teams/meetings/${meetingId}`
  );
  return data;
};

// ─── Chat ────────────────────────────────────────────────────────────

export const listTeamsChats = async (): Promise<ApiResponse<TeamsChat[]>> => {
  const { data } = await axiosApi.get<ApiResponse<TeamsChat[]>>(
    "/teams/chats"
  );
  return data;
};

export const createTeamsChat = async (
  participantIds: string[]
): Promise<ApiResponse<TeamsChat>> => {
  const { data } = await axiosApi.post<ApiResponse<TeamsChat>>(
    "/teams/chats",
    { participantIds }
  );
  return data;
};

export const getTeamsChatMessages = async (
  chatId: string,
  top?: number
): Promise<ApiResponse<TeamsChatMessage[]>> => {
  const { data } = await axiosApi.get<ApiResponse<TeamsChatMessage[]>>(
    `/teams/chats/${chatId}/messages`,
    { params: top ? { top } : undefined }
  );
  return data;
};

export const sendTeamsChatMessage = async (
  chatId: string,
  content: string,
  contentType: "html" | "text" = "html"
): Promise<ApiResponse<TeamsChatMessage>> => {
  const { data } = await axiosApi.post<ApiResponse<TeamsChatMessage>>(
    `/teams/chats/${chatId}/messages`,
    { content, contentType }
  );
  return data;
};

// ─── Teams & Channels ────────────────────────────────────────────────

export const listJoinedTeams = async (): Promise<ApiResponse<Team[]>> => {
  const { data } = await axiosApi.get<ApiResponse<Team[]>>(
    "/teams/joined-teams"
  );
  return data;
};

export const listChannels = async (
  teamId: string
): Promise<ApiResponse<Channel[]>> => {
  const { data } = await axiosApi.get<ApiResponse<Channel[]>>(
    `/teams/teams/${teamId}/channels`
  );
  return data;
};

export const getChannelMessages = async (
  teamId: string,
  channelId: string,
  top?: number
): Promise<ApiResponse<ChannelMessage[]>> => {
  const { data } = await axiosApi.get<ApiResponse<ChannelMessage[]>>(
    `/teams/teams/${teamId}/channels/${channelId}/messages`,
    { params: top ? { top } : undefined }
  );
  return data;
};

export const sendChannelMessage = async (
  teamId: string,
  channelId: string,
  content: string,
  contentType: "html" | "text" = "html"
): Promise<ApiResponse<ChannelMessage>> => {
  const { data } = await axiosApi.post<ApiResponse<ChannelMessage>>(
    `/teams/teams/${teamId}/channels/${channelId}/messages`,
    { content, contentType }
  );
  return data;
};

// ─── Meeting Attendance ──────────────────────────────────────────────

export const getMeetingAttendance = async (
  meetingId: string
): Promise<ApiResponse<AttendanceReport[]>> => {
  const { data } = await axiosApi.get<ApiResponse<AttendanceReport[]>>(
    `/teams/meetings/${meetingId}/attendance`
  );
  return data;
};

export const getAttendanceDetails = async (
  meetingId: string,
  reportId: string
): Promise<ApiResponse<AttendanceReport>> => {
  const { data } = await axiosApi.get<ApiResponse<AttendanceReport>>(
    `/teams/meetings/${meetingId}/attendance/${reportId}`
  );
  return data;
};
