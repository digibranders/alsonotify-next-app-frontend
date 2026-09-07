
import axiosApi from "../config/axios";
import { ApiResponse } from "../constants/constants";

export interface TeamsConnectionStatus {
  connected: boolean;
}

export interface GraphEvent {
  id: string;
  subject: string;
  isOrganizer?: boolean;
  isCancelled?: boolean;
  showAs?: string;
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  onlineMeetingProvider?: "teamsForBusiness" | "skypeForBusiness" | "unknown";
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  organizer?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  attendees?: Array<{
    type?: "required" | "optional" | "resource";
    status?: {
      response?: "none" | "accepted" | "declined" | "tentativelyAccepted";
      time?: string;
    };
    emailAddress: {
      name?: string;
      address: string;
    };
  }>;
  onlineMeeting?: {
    joinUrl?: string;
  };
  webLink?: string;
  body?: {
    contentType?: string;
    content?: string;
  };
  [key: string]: unknown;
}

// Get calendar events (meetings)
export const getCalendarEvents = async (
  startISO: string,
  endISO: string
): Promise<ApiResponse<GraphEvent[]>> => {
  const { data } = await axiosApi.get<ApiResponse<GraphEvent[]>>(
    "/calendar/events",
    { params: { start: startISO, end: endISO } }
  );
  return data;
};

// Get Teams connection status
export const getTeamsConnectionStatus = async (): Promise<ApiResponse<TeamsConnectionStatus>> => {
  const { data } = await axiosApi.get<ApiResponse<TeamsConnectionStatus>>("/calendar/connection-status");
  return data;
};

const ALLOWED_OAUTH_HOSTS = [
  "login.microsoftonline.com",
  "login.microsoft.com",
];

function isAllowedOAuthUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_OAUTH_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

// Connect to Microsoft Teams (OAuth)
export const MicrosoftUserOAuth = async (): Promise<ApiResponse<string>> => {
  const { data } = await axiosApi.get<ApiResponse<string>>("/microsoft/auth/login");
  if (data.result && !isAllowedOAuthUrl(data.result)) {
    throw new Error("Unexpected OAuth redirect URL");
  }
  return data;
};

// Disconnect from Microsoft Teams
export const disconnectMicrosoft = async (): Promise<ApiResponse<void>> => {
  const { data } = await axiosApi.delete<ApiResponse<void>>("/calendar/connection");
  return data;
};

// Create Event Payload Interface
export interface CreateEventPayload {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  body?: { contentType: "HTML" | "Text"; content: string };
  attendees?: Array<{ emailAddress: { address: string; name?: string }; type?: "required" | "optional" }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: "teamsForBusiness";
}

// Create calendar event
export const createCalendarEvent = async (
  payload: CreateEventPayload
): Promise<ApiResponse<GraphEvent>> => {
  const { data } = await axiosApi.post<ApiResponse<GraphEvent>>("/calendar/events", payload);
  return data;
};
