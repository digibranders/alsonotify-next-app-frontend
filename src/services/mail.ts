// src/services/mail.ts
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
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  ccRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
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

// Outgoing attachment from UI
export type OutgoingAttachment = File;

/* -------------------------------------------
   Base APIs
-------------------------------------------- */

export const getMailFolders = async (): Promise<ApiResponse<MailFolder[]>> => {
  const { data } = await axiosApi.get<ApiResponse<MailFolder[]>>("/mail/folders");
  return data;
};

export const getMailMessages = async (
  folder: string,
  top = 25,
  unreadOnly = false,
  nextLink?: string,
  search?: string,
  receivedAfter?: string,
  receivedBefore?: string
): Promise<ApiResponse<{ items: MailMessage[]; nextLink?: string }>> => {
  const { data } = await axiosApi.get<ApiResponse<{ items: MailMessage[]; nextLink?: string }>>(
    "/mail/messages",
    { params: { folder, top, unreadOnly, nextLink, search, receivedAfter, receivedBefore } }
  );
  return data;
};

export const getMailMessage = async (
  id: string,
  bodyType?: "text" | "html"
): Promise<ApiResponse<MailMessageDetail>> => {
  const { data } = await axiosApi.get<ApiResponse<MailMessageDetail>>("/mail/message", {
    params: { id, bodyType },
  });
  return data;
};

export const getMailAttachments = async (id: string): Promise<ApiResponse<MailAttachment[]>> => {
  const { data } = await axiosApi.get<ApiResponse<MailAttachment[]>>("/mail/attachments", {
    params: { id },
  });
  return data;
};

export const downloadAttachment = async (messageId: string, attId: string) => {
  const res = await axiosApi.get("/mail/attachment/download", {
    params: { id: messageId, attId },
    responseType: "blob",
  });
  return res.data as Blob;
};

/* -------------------------------------------
   Multipart helpers
-------------------------------------------- */

function buildMailMultipart(payload: unknown, files?: File[]) {
  const fd = new FormData();
  fd.append("payload", JSON.stringify(payload));
  (files || []).forEach((f) => fd.append("files", f, f.name));
  return fd;
}

async function postSmart<T = any>(
  url: string,
  payload: unknown,
  files?: File[],
  axiosConfig?: any
) {
  if (!files || files.length === 0) {
    return axiosApi.post<T>(url, payload, axiosConfig);
  }
  const fd = buildMailMultipart(payload, files);
  // Don't set Content-Type manually; browser adds boundary.
  return axiosApi.post<T>(url, fd, axiosConfig);
}

/* -------------------------------------------
   Send / Reply / Forward (UPDATED)
-------------------------------------------- */

export type SendMailPayload = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyType?: "HTML" | "Text";
  attachments?: OutgoingAttachment[]; // NEW
};

export const sendMail = async (payload: SendMailPayload) => {
  const { attachments, ...rest } = payload;
  const res = await postSmart("/mail/send", rest, attachments);
  return res.data;
};

export type ReplyPayload = {
  comment: string;
  bodyType?: "HTML" | "Text";
  attachments?: OutgoingAttachment[]; // NEW
};

// Backward compatible: replyMail(id, "text") OR replyMail(id, {comment, attachments})
function normalizeReplyPayload(input: string | ReplyPayload): ReplyPayload {
  if (typeof input === "string") return { comment: input };
  return input;
}

export const replyMail = async (id: string, payload: string | ReplyPayload) => {
  const p = normalizeReplyPayload(payload);
  const { attachments, ...rest } = p;

  const res = await postSmart("/mail/message/reply", rest, attachments, { params: { id } });
  return res.data;
};

export const replyAllMail = async (id: string, payload: string | ReplyPayload) => {
  const p = normalizeReplyPayload(payload);
  const { attachments, ...rest } = p;

  const res = await postSmart("/mail/message/replyAll", rest, attachments, { params: { id } });
  return res.data;
};

export type ForwardPayload = {
  to: string[];
  comment?: string;
  bodyType?: "HTML" | "Text";
  attachments?: OutgoingAttachment[]; // NEW
};

export const forwardMail = async (id: string, payload: ForwardPayload) => {
  const { attachments, ...rest } = payload;

  const res = await postSmart("/mail/message/forward", rest, attachments, { params: { id } });
  return res.data;
};

/* -------------------------------------------
   Patch / Delete
-------------------------------------------- */

export const patchMail = async (id: string, updates: any) => {
  const { data } = await axiosApi.patch("/mail/message", updates, { params: { id } });
  return data;
};

export const deleteMail = async (id: string) => {
  const { data } = await axiosApi.delete("/mail/message", { params: { id } });
  return data;
};
