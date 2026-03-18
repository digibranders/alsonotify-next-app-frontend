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

export interface TeamsChatMessageAttachment {
  id: string;
  name: string;
  contentType: string;
  contentUrl: string;
  content?: string;
  thumbnailUrl?: string;
}

export interface TeamsChatMessageReaction {
  reactionType: string;
  user: { displayName: string };
  createdDateTime: string;
}

export interface TeamsChatMessage {
  id: string;
  messageType: "message" | "systemEventMessage";
  createdDateTime: string;
  from?: {
    user?: { displayName: string; id: string };
  };
  body: { contentType: "html" | "text"; content: string };
  attachments?: TeamsChatMessageAttachment[];
  reactions?: TeamsChatMessageReaction[];
  replyToId?: string;
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
  from?: { user?: { displayName: string; id: string } };
  body: { contentType: "html" | "text"; content: string };
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
