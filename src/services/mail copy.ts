import axiosApi from "../config/axios";
import { ApiResponse } from "../constants/constants";

export type MailFolder = {
  id: string;
  displayName: string;
  parentFolderId?: string | null;
  childFolderCount?: number;
  totalItemCount?: number;
  unreadItemCount?: number;
};

export type MailMessage = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  isRead?: boolean;
  hasAttachments?: boolean;
  importance?: "low" | "normal" | "high";
  webLink?: string;
};

export type MailMessageDetail = MailMessage & {
  body?: { contentType?: string; content?: string };
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  ccRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  bccRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
};

export type MailAttachment = {
  id: string;
  name?: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  "@odata.type"?: string;
};

export const getMailFolders = async (): Promise<ApiResponse<MailFolder[]>> => {
  const { data } = await axiosApi.get<ApiResponse<MailFolder[]>>("/mail/folders");
  return data;
};

export const getMailMessages = async (
  folder: string,
  top = 25,
  unreadOnly = false,
  nextLink?: string
): Promise<ApiResponse<{ items: MailMessage[]; nextLink?: string }>> => {
  const { data } = await axiosApi.get<ApiResponse<{ items: MailMessage[]; nextLink?: string }>>(
    "/mail/messages",
    { params: { folder, top, unreadOnly, nextLink } }
  );
  return data;
};

/**
 * ✅ Query-safe message detail endpoint
 * Backend: GET /mail/message?id=...
 */
export const getMailMessage = async (
  id: string,
  bodyType?: "text" | "html"
): Promise<ApiResponse<MailMessageDetail>> => {
  const { data } = await axiosApi.get<ApiResponse<MailMessageDetail>>("/mail/message", {
    params: { id, bodyType },
  });
  return data;
};

/**
 * ✅ Query-safe attachments list endpoint
 * Backend: GET /mail/attachments?id=...
 */
export const getMailAttachments = async (id: string): Promise<ApiResponse<MailAttachment[]>> => {
  const { data } = await axiosApi.get<ApiResponse<MailAttachment[]>>("/mail/attachments", {
    params: { id },
  });
  return data;
};

/**
 * ✅ Query-safe download endpoint
 * Backend: GET /mail/attachment/download?id=...&attId=...
 */
export const downloadAttachment = async (messageId: string, attId: string) => {
  const res = await axiosApi.get("/mail/attachment/download", {
    params: { id: messageId, attId },
    responseType: "blob",
  });
  return res.data as Blob;
};

export const sendMail = async (payload: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyType?: "HTML" | "Text";
}) => {
  const { data } = await axiosApi.post("/mail/send", payload);
  return data;
};

/**
 * ✅ Query-safe actions
 * Backend:
 *  POST /mail/message/reply?id=...
 *  POST /mail/message/replyAll?id=...
 *  POST /mail/message/forward?id=...
 */
export const replyMail = async (id: string, comment: string) => {
  const { data } = await axiosApi.post("/mail/message/reply", { comment }, { params: { id } });
  return data;
};

export const replyAllMail = async (id: string, comment: string) => {
  const { data } = await axiosApi.post("/mail/message/replyAll", { comment }, { params: { id } });
  return data;
};

export const forwardMail = async (id: string, payload: { to: string[]; comment?: string }) => {
  const { data } = await axiosApi.post("/mail/message/forward", payload, { params: { id } });
  return data;
};

/**
 * ✅ Query-safe patch/delete
 * Backend:
 *  PATCH /mail/message?id=...
 *  DELETE /mail/message?id=...
 */
export const patchMail = async (id: string, updates: any) => {
  const { data } = await axiosApi.patch("/mail/message", updates, { params: { id } });
  return data;
};

export const deleteMail = async (id: string) => {
  const { data } = await axiosApi.delete("/mail/message", { params: { id } });
  return data;
};
