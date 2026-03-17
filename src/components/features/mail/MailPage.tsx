"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  Divider,
  Drawer,
  Input,
  Layout,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  Tooltip,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { fileService } from "@/services/file.service";
import { determineFileType, safeFilename } from "@/utils/fileTypeUtils";
import {
  X,
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  FileWarning,
  Code,
  Paperclip,
  Send,
  Mail,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import dayjs from "dayjs";

import { PageLayout } from "../../layout/PageLayout";
import { DocumentPreviewModal } from "../../ui/DocumentPreviewModal";
import { UserDocument } from "@/types/domain";
import { useMailAttachments, useMailFolders, useMailMessage, useMailMessages } from "@/hooks/useMail";
import { useIsNarrow } from "@/hooks/useBreakpoint";
import { trimStr } from "@/utils/trim";
import { sanitizeEmailHtml } from "@/utils/security/sanitizeHtml";
import {
  deleteMail,
  downloadAttachment,
  forwardMail,
  patchMail,
  replyAllMail,
  replyMail,
  sendMail,
} from "@/services/mail";

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

// -------------------- helpers --------------------

function formatFrom(m: any) {
  const from = m?.from?.emailAddress;
  return from?.name || from?.address || "Unknown";
}

function formatRecipients(arr?: any[]) {
  const list = (arr || [])
    .map((r) => r?.emailAddress?.name || r?.emailAddress?.address)
    .filter(Boolean);
  return list.length ? list.join(", ") : "";
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const v = bytes / Math.pow(k, i);
  return `${v.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

const emailLike = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());


// ---- Folder helpers ----
const normalize = (s?: string) => (s || "").trim().toLowerCase();
const WELL_KNOWN_DISPLAY: Record<string, string[]> = {
  inbox: ["inbox"],
  sentitems: ["sent items", "sent"],
  drafts: ["drafts"],
  deleteditems: ["deleted items", "deleted"],
  junkemail: ["junk email", "junk", "spam"],
  archive: ["archive"],
};
const RESERVED_NAMES = new Set(Object.values(WELL_KNOWN_DISPLAY).flat());

function findGraphFolderForWellKnownId(wellKnownId: string, graphFolders: any[]) {
  const names = WELL_KNOWN_DISPLAY[wellKnownId] || [];
  if (!names.length) return undefined;
  return graphFolders.find((f: any) => names.includes(normalize(f?.displayName)));
}

function collapseList(text: string, max = 90) {
  if (!text) return { head: "", tail: "", isLong: false };
  if (text.length <= max) return { head: text, tail: "", isLong: false };
  return { head: text.slice(0, max).trimEnd(), tail: text.slice(max).trimStart(), isLong: true };
}

function filesFromUploadList(list: UploadFile[]) {
  return list.map((f) => f.originFileObj).filter(Boolean) as File[];
}

function isUnderMB(file: File, mb: number) {
  return file.size <= mb * 1024 * 1024;
}

// -------------------- component --------------------

export function MailPage() {
  const { message, modal } = App.useApp();
  const isNarrow = useIsNarrow("lg");

  const [folder, setFolder] = useState<string>("inbox");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // view controls
  const [loadImages, setLoadImages] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false); // HTML default

  // compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [showComposeCc, setShowComposeCc] = useState(false);
  const [composeTo, setComposeTo] = useState<string[]>([]);
  const [composeCc, setComposeCc] = useState<string[]>([]);
  const [composeBcc, setComposeBcc] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingCompose, setSendingCompose] = useState(false);
  const [composeFiles, setComposeFiles] = useState<UploadFile[]>([]);

  // quick reply
  const [replyOpen, setReplyOpen] = useState<"reply" | "replyAll" | "forward" | null>(null);
  const [replyText, setReplyText] = useState("");
  const [forwardTo, setForwardTo] = useState<string[]>([]);
  const [sendingQuick, setSendingQuick] = useState(false);
  const [quickFiles, setQuickFiles] = useState<UploadFile[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [previewingIds, setPreviewingIds] = useState<Set<string>>(new Set());

  // preview
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);

  // keyboard nav for list
  const [focusIndex, setFocusIndex] = useState(0);
  const listWrapRef = useRef<HTMLDivElement | null>(null);

  const foldersQ = useMailFolders();
  const messagesQ = useMailMessages(folder, unreadOnly, 25);

  const msgs = useMemo(() => {
    return (messagesQ.data?.pages || []).flatMap((p) => p.result?.items || []);
  }, [messagesQ.data]);

  const graphFolders = (foldersQ.data?.result || []) as any[];

  const folderItems = useMemo(() => {
    const defaults = [
      { id: "inbox", displayName: "Inbox" },
      { id: "sentitems", displayName: "Sent" },
      { id: "drafts", displayName: "Drafts" },
      { id: "deleteditems", displayName: "Deleted" },
      { id: "junkemail", displayName: "Junk" },
    ].map((d) => {
      const match = findGraphFolderForWellKnownId(d.id, graphFolders);
      return {
        ...d,
        unreadItemCount: match?.unreadItemCount ?? 0,
        totalItemCount: match?.totalItemCount ?? undefined,
      };
    });

    const others = graphFolders.filter((f: any) => !RESERVED_NAMES.has(normalize(f?.displayName)));
    return [...defaults, ...others];
  }, [graphFolders]);

  const currentFolderTotals = useMemo(() => {
    if (!folder) return { total: undefined as number | undefined, unread: undefined as number | undefined };
    if (WELL_KNOWN_DISPLAY[folder]) {
      const match = findGraphFolderForWellKnownId(folder, graphFolders);
      return {
        total: typeof match?.totalItemCount === "number" ? match.totalItemCount : undefined,
        unread: typeof match?.unreadItemCount === "number" ? match.unreadItemCount : undefined,
      };
    }
    const match = graphFolders.find((f: any) => f?.id === folder);
    return {
      total: typeof match?.totalItemCount === "number" ? match.totalItemCount : undefined,
      unread: typeof match?.unreadItemCount === "number" ? match.unreadItemCount : undefined,
    };
  }, [folder, graphFolders]);

  const loadedCount = msgs.length;
  const totalCount = currentFolderTotals.total;
  const remainingCount = typeof totalCount === "number" ? Math.max(totalCount - loadedCount, 0) : undefined;

  // HTML default; “text” only when fallback enabled
  const bodyType = showTextFallback ? "text" : "html";
  const msgQ = useMailMessage(selectedId, bodyType);
  const attsQ = useMailAttachments(selectedId);
  const current = msgQ.data?.result;

  useEffect(() => {
    setLoadImages(false);
    setShowTextFallback(false);
  }, [selectedId]);

  // reset focus on folder change
  useEffect(() => {
    setFocusIndex(0);
  }, [folder, unreadOnly]);

  // reset quick modal state when open changes
  useEffect(() => {
    if (!replyOpen) {
      setReplyText("");
      setForwardTo([]);
      setQuickFiles([]);
    }
  }, [replyOpen]);

  // reset compose state when close
  useEffect(() => {
    if (!composeOpen) {
      setComposeFiles([]);
    }
  }, [composeOpen]);

  const onSelect = async (id: string, isRead?: boolean) => {
    setSelectedId(id);

    if (isRead === false) {
      try {
        await patchMail(id, { isRead: true });
        messagesQ.refetch();
        foldersQ.refetch();
      } catch {
        // ignore
      }
    }
  };

  const refresh = async () => {
    await foldersQ.refetch();
    await messagesQ.refetch();
    if (selectedId) {
      await msgQ.refetch();
      await attsQ.refetch();
    }
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh();
    }, 60_000); // 1 min

    return () => window.clearInterval(id);
  }, [selectedId, folder, unreadOnly]);


  const confirmDelete = () => {
    if (!selectedId) return;
    modal.confirm({
      title: "Delete message?",
      content: "This will move the message to Deleted items.",
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteMail(selectedId);
        message.success("Deleted");
        setSelectedId(undefined);
        await messagesQ.refetch();
        await foldersQ.refetch();
      },
    });
  };

  const doDownload = async (attId: string, name?: string) => {
    if (!selectedId || downloadingIds.has(attId)) return;
    setDownloadingIds(prev => new Set(prev).add(attId));
    try {
      const blob = await downloadAttachment(selectedId, attId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeFilename(name);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      // Delay revocation to ensure browser captures the URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 150);
    } catch (err) {
      console.error('Download error:', err);
      message.error("Failed to download attachment");
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(attId);
        return next;
      });
    }
  };

  const doPreview = async (attId: string, name: string, contentType: string, size: number) => {
    if (!selectedId || previewingIds.has(attId)) return;
    setPreviewingIds(prev => new Set(prev).add(attId));
    try {
      const blob = await downloadAttachment(selectedId, attId);
      const url = window.URL.createObjectURL(blob);

      const fileType = determineFileType(name, contentType);

      setPreviewDoc({
        id: attId,
        documentTypeId: "mail-attachment",
        documentTypeName: "Mail Attachment",
        fileName: name,
        fileSize: size,
        fileUrl: url,
        uploadedDate: new Date().toISOString(),
        fileType,
        isRequired: false,
      });
    } catch (err) {
      console.error('Preview error:', err);
      message.error("Failed to load preview");
    } finally {
      setPreviewingIds(prev => {
        const next = new Set(prev);
        next.delete(attId);
        return next;
      });
    }
  };

  // ---- validations ----
  const composeToValid = composeTo.map((s) => s.trim()).filter(Boolean);
  const composeToHasInvalid = composeToValid.some((e) => !emailLike(e));
  const canSendCompose = composeToValid.length > 0 && !composeToHasInvalid && !sendingCompose;

  const forwardToValid = forwardTo.map((s) => s.trim()).filter(Boolean);
  const forwardToHasInvalid = forwardToValid.some((e) => !emailLike(e));

  const canSendQuick =
    !sendingQuick &&
    !!selectedId &&
    !!replyOpen &&
    (replyOpen === "forward"
      ? forwardToValid.length > 0 && !forwardToHasInvalid && replyText.trim().length > 0
      : replyText.trim().length > 0);

  // ---- Upload config ----
  const MAX_MB = 20; // you can change
  const commonBeforeUpload = (file: File) => {
    if (!isUnderMB(file, MAX_MB)) {
      message.error(`File too large: ${file.name} (max ${MAX_MB} MB)`);
      return Upload.LIST_IGNORE;
    }
    return false; // prevent auto upload
  };

  const doSend = async () => {
    if (!canSendCompose) return;

    setSendingCompose(true);
    try {
      await sendMail({
        to: composeToValid,
        cc: composeCc.map((s) => s.trim()).filter(Boolean) || undefined,
        bcc: composeBcc.map((s) => s.trim()).filter(Boolean) || undefined,
        subject: trimStr(composeSubject) || "(no subject)",
        body: trimStr(composeBody) || "",
        bodyType: "Text",
        attachments: filesFromUploadList(composeFiles),
      });

      message.success("Mail sent");
      setComposeOpen(false);
      setComposeTo([]);
      setComposeCc([]);
      setComposeBcc([]);
      setComposeSubject("");
      setComposeBody("");
      setShowComposeCc(false);
      setComposeFiles([]);

      await messagesQ.refetch();
      await foldersQ.refetch();
    } catch (e: any) {
      message.error(e?.message || "Failed to send");
    } finally {
      setSendingCompose(false);
    }
  };

  const doQuickAction = async () => {
    if (!canSendQuick) return;

    setSendingQuick(true);
    try {
      const attachments = filesFromUploadList(quickFiles);

      const comment = trimStr(replyText);
      if (replyOpen === "reply") {
        await replyMail(selectedId!, { comment, bodyType: "Text", attachments });
        message.success("Replied");
      } else if (replyOpen === "replyAll") {
        await replyAllMail(selectedId!, { comment, bodyType: "Text", attachments });
        message.success("Replied all");
      } else if (replyOpen === "forward") {
        await forwardMail(selectedId!, { to: forwardToValid, comment, bodyType: "Text", attachments });
        message.success("Forwarded");
      }

      setReplyOpen(null);
      setReplyText("");
      setForwardTo([]);
      setQuickFiles([]);

      await messagesQ.refetch();
      await foldersQ.refetch();
    } catch (e: any) {
      message.error(e?.message || "Failed");
    } finally {
      setSendingQuick(false);
    }
  };

  const htmlBody = useMemo(() => {
    if (current?.body?.contentType !== "html") return "";
    return sanitizeEmailHtml(current?.body?.content || "", loadImages);
  }, [current?.body?.content, current?.body?.contentType, loadImages]);

  const textBody = useMemo(() => {
    if (current?.body?.contentType === "html") return "";
    return current?.body?.content || "";
  }, [current?.body?.content, current?.body?.contentType]);

  // Collapse recipients in header
  const toLine = formatRecipients(current?.toRecipients);
  const ccLine = formatRecipients(current?.ccRecipients);
  const [toCollapsed, setToCollapsed] = useState(true);
  const [ccCollapsed, setCcCollapsed] = useState(true);
  useEffect(() => {
    setToCollapsed(true);
    setCcCollapsed(true);
  }, [selectedId]);

  const toParts = collapseList(toLine, 95);
  const ccParts = collapseList(ccLine, 95);

  // keyboard navigation (up/down/enter)
  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (!msgs.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, msgs.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const m = msgs[focusIndex];
      if (m?.id) onSelect(m.id, m.isRead);
    } else if (e.key === "Delete") {
      if (selectedId) confirmDelete();
    }
  };

  const ReadingPane = (
    <div className="bg-[#F7F7F7] rounded-[16px] p-4 overflow-auto min-h-0 h-full">
      {!selectedId ? (
        <div className="h-full flex items-center justify-center text-[#999]">Select a message</div>
      ) : msgQ.isLoading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#F7F7F7] pt-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Title level={5} style={{ margin: 0 }} className="truncate">
                  {current?.subject || "(no subject)"}
                </Title>

                <div className="mt-2 text-xs text-[#666] space-y-1">
                  <div className="truncate">
                    <Text type="secondary">From:</Text>{" "}
                    <span className="text-[#444]">{formatFrom(current)}</span>
                  </div>

                  {!!toLine && (
                    <div className="leading-5">
                      <Text type="secondary">To:</Text>{" "}
                      <span className="text-[#444]">
                        {toParts.isLong && toCollapsed ? (
                          <>
                            {toParts.head}
                            <button
                              type="button"
                              className="ml-1 text-[#1677ff] hover:underline"
                              onClick={() => setToCollapsed(false)}
                            >
                              …more
                            </button>
                          </>
                        ) : (
                          <>
                            {toLine}
                            {toParts.isLong ? (
                              <button
                                type="button"
                                className="ml-1 text-[#1677ff] hover:underline"
                                onClick={() => setToCollapsed(true)}
                              >
                                less
                              </button>
                            ) : null}
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {!!ccLine && (
                    <div className="leading-5">
                      <Text type="secondary">Cc:</Text>{" "}
                      <span className="text-[#444]">
                        {ccParts.isLong && ccCollapsed ? (
                          <>
                            {ccParts.head}
                            <button
                              type="button"
                              className="ml-1 text-[#1677ff] hover:underline"
                              onClick={() => setCcCollapsed(false)}
                            >
                              …more
                            </button>
                          </>
                        ) : (
                          <>
                            {ccLine}
                            {ccParts.isLong ? (
                              <button
                                type="button"
                                className="ml-1 text-[#1677ff] hover:underline"
                                onClick={() => setCcCollapsed(true)}
                              >
                                less
                              </button>
                            ) : null}
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {current?.receivedDateTime ? (
                    <div className="truncate">
                      <Text type="secondary">Date:</Text>{" "}
                      <span className="text-[#444]">
                        {dayjs(current.receivedDateTime).format("MMM D, YYYY • h:mm A")}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <Space wrap>
                <Tooltip title="Reply">
                  <Button icon={<Reply className="w-4 h-4" />} onClick={() => setReplyOpen("reply")} />
                </Tooltip>
                <Tooltip title="Reply all">
                  <Button icon={<ReplyAll className="w-4 h-4" />} onClick={() => setReplyOpen("replyAll")} />
                </Tooltip>
                <Tooltip title="Forward">
                  <Button icon={<Forward className="w-4 h-4" />} onClick={() => setReplyOpen("forward")} />
                </Tooltip>
                <Tooltip title="Delete">
                  <Button danger icon={<Trash2 className="w-4 h-4" />} onClick={confirmDelete} />
                </Tooltip>
              </Space>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            {/* HTML controls */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <Space>
                <Button size="small" onClick={() => setShowTextFallback((s) => !s)}>
                  {showTextFallback ? "View HTML" : "View as text"}
                </Button>

                {!showTextFallback ? (
                  <Button
                    size="small"
                    icon={loadImages ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    onClick={() => setLoadImages((s) => !s)}
                  >
                    {loadImages ? "Hide images" : "Load images"}
                  </Button>
                ) : null}
              </Space>

              {!showTextFallback && !loadImages ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ImageIcon className="inline-block w-4 h-4 mr-1 align-[-2px]" />
                  Images are blocked
                </Text>
              ) : null}
            </div>
          </div>

          {/* Body */}
          {!showTextFallback ? (
            htmlBody ? (
              <div
                className="mail-html rounded-[12px] bg-white p-4 ring-1 ring-black/5"
                dangerouslySetInnerHTML={{ __html: htmlBody }}
              />
            ) : (
              <div className="rounded-[12px] bg-white p-4 ring-1 ring-black/5 text-[#777]">
                No HTML content
              </div>
            )
          ) : (
            <div className="rounded-[12px] bg-white p-4 ring-1 ring-black/5 whitespace-pre-wrap text-xs leading-6">
              {textBody}
            </div>
          )}

          <Divider />

          {/* Attachments */}
          <Title level={5} style={{ marginTop: 0 }}>
            Attachments
          </Title>

          {attsQ.isLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : (attsQ.data?.result?.length || 0) === 0 ? (
            <Text type="secondary">No attachments</Text>
          ) : (
            <div className="space-y-2">
              {(attsQ.data?.result || []).map((a: any) => (
                <div
                  key={a.id}
                  className="rounded-[12px] bg-white px-3 py-3 ring-1 ring-black/5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{a.name}</div>
                    <div className="text-xs text-[#777]">
                      {a.contentType || "file"} • {formatBytes(a.size || 0)}
                    </div>
                  </div>
                  <Space>
                    <Button onClick={() => doPreview(a.id, a.name, a.contentType, a.size)}>Preview</Button>
                    <Button onClick={() => doDownload(a.id, a.name)}>Download</Button>
                  </Space>
                </div>
              ))}
            </div>
          )}

          <style jsx global>{`
            .mail-html { font-size: 0.75rem; line-height: 1.7; color: #222; overflow-wrap: anywhere; }
            .mail-html img { max-width: 100%; height: auto; }
            .mail-html table { width: 100%; border-collapse: collapse; }
            .mail-html a { color: #1677ff; text-decoration: none; }
            .mail-html a:hover { text-decoration: underline; }
            .mail-html blockquote { border-left: 3px solid #e5e5e5; margin: 8px 0; padding-left: 10px; color: #555; }
            .mail-html pre { white-space: pre-wrap; background: #fafafa; padding: 10px; border-radius: 10px; overflow: auto; }

            /* Seamless tags Select */
            .ant-select-seamless .ant-select-selector {
              background-color: transparent !important;
              border: none !important;
              box-shadow: none !important;
              padding-left: 0 !important;
            }
            .ant-select-seamless.ant-select-focused .ant-select-selector {
              box-shadow: none !important;
            }
            .ant-select-seamless .ant-select-selection-placeholder {
              color: #9ca3af;
              font-size: var(--font-size-sm);
              padding-left: 0;
            }
          `}</style>

          <DocumentPreviewModal
            open={!!previewDoc}
            document={previewDoc}
            onClose={() => {
              if (previewDoc?.fileUrl) URL.revokeObjectURL(previewDoc.fileUrl);
              setPreviewDoc(null);
            }}
          />
        </>
      )}
    </div>
  );

  return (
    <PageLayout
      title="Mail"
      tabs={[]}
      activeTab=""
      onTabChange={() => { }}
      titleAction={{
        label: "Compose",
        icon: <Send className="w-4 h-4" />,
        onClick: () => setComposeOpen(true),
      }}
      titleExtra={
        <Space>
          <Segmented
            options={[
              { label: "All", value: "all" },
              { label: "Unread", value: "unread" },
            ]}
            value={unreadOnly ? "unread" : "all"}
            onChange={(v) => setUnreadOnly(v === "unread")}
          />
          {/* <Button icon={<RefreshCcw className="w-4 h-4" />} onClick={refresh}>
            Refresh
          </Button> */}
        </Space>
      }
    >
      <Layout style={{ height: "100%", background: "transparent" }}>
        {/* FOLDERS */}
        <Sider
          width={260}
          style={{ background: "transparent", paddingRight: 12 }}
          className={isNarrow ? "hidden md:block" : ""}
        >
          <div className="bg-[#F7F7F7] rounded-[16px] p-4 h-full overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4" />
              <Text strong>Folders</Text>
            </div>

            {foldersQ.isLoading ? (
              <Skeleton active paragraph={{ rows: 10 }} />
            ) : (
              <div className="space-y-1">
                {folderItems.map((f: any) => (
                  <button
                    key={f.id}
                    type="button"
                    className={[
                      "w-full text-left px-3 py-2 rounded-[12px] transition flex items-center justify-between gap-2",
                      folder === f.id ? "bg-white ring-1 ring-black/5" : "hover:bg-white/70",
                    ].join(" ")}
                    onClick={() => {
                      setFolder(f.id);
                      setSelectedId(undefined);
                    }}
                  >
                    <span className="truncate">{f.displayName}</span>
                    {!!f.unreadItemCount && f.unreadItemCount > 0 && (
                      <Tag color="blue" className="m-0 shrink-0">
                        {f.unreadItemCount}
                      </Tag>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Sider>

        {/* CONTENT */}
        <Content style={{ background: "transparent" }}>
          <div className={isNarrow ? "grid grid-cols-1 gap-4 h-full min-h-0" : "grid grid-cols-[420px_1fr] gap-4 h-full min-h-0"}>
            {/* MESSAGE LIST */}
            <div className="bg-[#F7F7F7] rounded-[16px] overflow-hidden flex flex-col min-h-0">
              {/* sticky header */}
              <div className="sticky top-0 z-10 bg-[#F7F7F7] p-4 pb-3">
                {/* Search input — not yet implemented */}
                {typeof currentFolderTotals.unread === "number" || typeof totalCount === "number" ? (
                  <div className="mt-2 flex items-center justify-between text-xs text-[#777]">
                    <span>
                      {typeof currentFolderTotals.unread === "number" ? `Unread: ${currentFolderTotals.unread}` : ""}
                    </span>
                    <span>{typeof totalCount === "number" ? `Total: ${totalCount}` : ""}</span>
                  </div>
                ) : null}
              </div>

              <div
                ref={listWrapRef}
                tabIndex={0}
                onKeyDown={onListKeyDown}
                className="flex-1 overflow-auto px-4 pb-4 outline-none"
              >
                {messagesQ.isLoading ? (
                  <Skeleton active paragraph={{ rows: 12 }} />
                ) : msgs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#999]">No messages</div>
                ) : (
                  <div className="space-y-2">
                    {msgs.map((m: any, idx: number) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelect(m.id, m.isRead)}
                        onFocus={() => setFocusIndex(idx)}
                        className={[
                          "w-full text-left rounded-[14px] px-3 py-3 transition",
                          selectedId === m.id ? "bg-white ring-1 ring-black/5" : "hover:bg-white/70",
                          idx === focusIndex ? "ring-1 ring-black/10" : "",
                        ].join(" ")}
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {!m.isRead ? (
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                              ) : (
                                <span className="w-2 h-2" />
                              )}
                              <span className={["truncate", !m.isRead ? "font-semibold" : ""].join(" ")}>
                                {formatFrom(m)}
                              </span>
                              {m.importance === "high" ? (
                                <Tag color="red" className="m-0">
                                  High
                                </Tag>
                              ) : null}
                            </div>
                            <span className="text-xs text-[#777] whitespace-nowrap">
                              {m.receivedDateTime ? dayjs(m.receivedDateTime).format("MMM D, h:mm A") : ""}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className={["truncate min-w-0", !m.isRead ? "font-semibold" : ""].join(" ")}>
                              {m.subject || "(no subject)"}
                            </span>
                            {m.hasAttachments ? <Paperclip className="w-4 h-4 opacity-60 shrink-0" /> : null}
                          </div>

                          <div className="text-xs text-[#777] truncate mt-1">{m.bodyPreview || ""}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Divider style={{ margin: "12px 0" }} />
              <div className="px-4 pb-4 flex items-center justify-between gap-3">
                <Button disabled={!messagesQ.hasNextPage} onClick={() => messagesQ.fetchNextPage()}>
                  {typeof remainingCount === "number" ? `Load more (${remainingCount} left)` : "Load more"}
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {typeof totalCount === "number" ? `Loaded ${loadedCount} / ${totalCount}` : `${loadedCount} loaded`}
                </Text>
              </div>
            </div>

            {/* READING PANE (desktop) */}
            {!isNarrow ? ReadingPane : null}
          </div>

          {/* READING PANE (mobile) */}
          {isNarrow ? (
            <Drawer
              open={!!selectedId}
              onClose={() => setSelectedId(undefined)}
              placement="right"
              size="large"
              styles={{
                body: { padding: 0, background: "transparent" },
              }}
            >
              {ReadingPane}
            </Drawer>
          ) : null}
        </Content>
      </Layout>

      {/* =========================
          COMPOSE MODAL
         ========================= */}
      <Modal
        title={null}
        footer={null}
        closable={false}
        open={composeOpen}
        onCancel={() => setComposeOpen(false)}
        width="min(680px, 95vw)"
        destroyOnHidden
        centered
        styles={{
          body: { padding: 16 },
        }}
      >
        <div className="flex flex-col">
          {/* header */}
          <div className="flex items-center justify-between mb-4">
            <Title level={4} style={{ margin: 0 }}>
              New Message
            </Title>
            <Button type="text" icon={<X className="w-5 h-5 text-gray-500" />} onClick={() => setComposeOpen(false)} />
          </div>

          {/* To */}
          <div className="flex items-start gap-3 border-b border-gray-100 pb-2">
            <span className="text-gray-400 text-xs font-bold tracking-wide w-10 mt-1.5">TO</span>
            <div className="flex-1">
              <Select
                mode="tags"
                open={false}
                className="ant-select-seamless w-full"
                placeholder="Recipients"
                value={composeTo}
                onChange={setComposeTo}
                suffixIcon={null}
                tokenSeparators={[",", " "]}
              />
              {composeToHasInvalid ? (
                <div className="text-xs text-red-500 mt-1">One or more recipients look invalid.</div>
              ) : null}
            </div>

            <Button
              type="text"
              size="small"
              className="text-xs text-gray-400 hover:text-gray-600 mt-0.5"
              onClick={() => setShowComposeCc((s) => !s)}
            >
              Cc/Bcc
            </Button>
          </div>

          {/* Cc/Bcc */}
          {showComposeCc ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-3 border-b border-gray-100 pb-2">
                <span className="text-gray-400 text-xs font-bold tracking-wide w-10 mt-1.5">CC</span>
                <Select
                  mode="tags"
                  open={false}
                  className="ant-select-seamless w-full"
                  value={composeCc}
                  onChange={setComposeCc}
                  suffixIcon={null}
                  tokenSeparators={[",", " "]}
                />
              </div>

              <div className="flex items-start gap-3 border-b border-gray-100 pb-2">
                <span className="text-gray-400 text-xs font-bold tracking-wide w-10 mt-1.5">BCC</span>
                <Select
                  mode="tags"
                  open={false}
                  className="ant-select-seamless w-full"
                  value={composeBcc}
                  onChange={setComposeBcc}
                  suffixIcon={null}
                  tokenSeparators={[",", " "]}
                />
              </div>
            </div>
          ) : null}

          {/* subject */}
          <div className="flex items-center gap-3 border-b border-gray-100 pb-2 pt-3">
            <span className="text-gray-400 text-xs font-bold tracking-wide w-10">SUB</span>
            <Input
              variant="borderless"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="Subject"
              className="p-0 flex-1 text-sm font-medium"
            />
          </div>

          {/* body */}
          <Input.TextArea
            variant="borderless"
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            placeholder="Type your message..."
            autoSize={{ minRows: 10, maxRows: 18 }}
            className="px-0 mt-3 text-sm resize-none"
            style={{ lineHeight: 1.6 }}
          />

          {/* attachments */}
          <div className="mt-3">
            <Upload
              multiple
              fileList={composeFiles}
              beforeUpload={commonBeforeUpload as any}
              onChange={({ fileList }) => setComposeFiles(fileList)}
              showUploadList={{ showRemoveIcon: true, showPreviewIcon: false }}
            >
              <Button icon={<Paperclip className="w-4 h-4" />}>
                Attach files {composeFiles.length ? `(${composeFiles.length})` : ""}
              </Button>
            </Upload>
            <div className="text-xs text-[#777] mt-2">
              Max file size: {MAX_MB} MB each
            </div>
          </div>

          {/* footer */}
          <div className="flex justify-between items-center pt-4 mt-2">
            <Button
              type="text"
              onClick={() => {
                setComposeOpen(false);
              }}
            >
              Discard
            </Button>

            <Tooltip
              title={
                !composeToValid.length
                  ? "Add at least one recipient"
                  : composeToHasInvalid
                    ? "Fix invalid recipient(s)"
                    : undefined
              }
            >
              <Button
                type="primary"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={doSend}
                disabled={!canSendCompose}
                loading={sendingCompose}
              >
                Send
              </Button>
            </Tooltip>
          </div>
        </div>
      </Modal>

      {/* =========================
          REPLY / FORWARD MODAL
         ========================= */}
      <Modal
        title={null}
        footer={null}
        closable={false}
        open={!!replyOpen}
        onCancel={() => setReplyOpen(null)}
        width="min(600px, 95vw)"
        centered
        destroyOnHidden
        styles={{
          body: { padding: 16 },
        }}
      >
        <div className="flex flex-col">
          {/* header */}
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              {replyOpen === "forward" ? (
                <Forward className="w-4 h-4 text-black" />
              ) : (
                <Reply className="w-4 h-4 text-black" />
              )}
              <span className="font-semibold text-base">
                {replyOpen === "forward" ? "Forward" : replyOpen === "replyAll" ? "Reply All" : "Reply"}
              </span>
              {current ? (
                <span className="text-gray-400 font-medium text-sm ml-1">to {formatFrom(current)}</span>
              ) : null}
            </div>

            <Button
              type="text"
              size="small"
              icon={<X className="w-4 h-4 text-gray-400" />}
              onClick={() => setReplyOpen(null)}
            />
          </div>

          {/* forward to */}
          {replyOpen === "forward" ? (
            <div className="flex items-start gap-3 border-b border-gray-100 pb-2 mb-3">
              <span className="text-gray-400 text-xs font-bold tracking-wide uppercase w-8 mt-1.5">To</span>
              <div className="flex-1">
                <Select
                  mode="tags"
                  open={false}
                  className="ant-select-seamless w-full"
                  placeholder="Forward To"
                  value={forwardTo}
                  onChange={setForwardTo}
                  suffixIcon={null}
                  tokenSeparators={[",", " "]}
                />
                {forwardToHasInvalid ? (
                  <div className="text-xs text-red-500 mt-1">One or more recipients look invalid.</div>
                ) : null}
              </div>
            </div>
          ) : null}

          <Input.TextArea
            variant="borderless"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoSize={{ minRows: 8, maxRows: 16 }}
            placeholder="Write your response..."
            className="px-0 text-sm resize-none"
            style={{ lineHeight: 1.6 }}
          />

          {/* attachments */}
          <div className="mt-2">
            <Upload
              multiple
              fileList={quickFiles}
              beforeUpload={commonBeforeUpload as any}
              onChange={({ fileList }) => setQuickFiles(fileList)}
              showUploadList={{ showRemoveIcon: true, showPreviewIcon: false }}
            >
              <Button icon={<Paperclip className="w-4 h-4" />}>
                Attach files {quickFiles.length ? `(${quickFiles.length})` : ""}
              </Button>
            </Upload>
            <div className="text-xs text-[#777] mt-2">
              Max file size: {MAX_MB} MB each
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={() => setReplyOpen(null)}>Cancel</Button>

            <Tooltip
              title={
                replyOpen === "forward" && !forwardToValid.length
                  ? "Add forward recipients"
                  : replyText.trim().length === 0
                    ? "Write a message"
                    : undefined
              }
            >
              <Button
                type="primary"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={doQuickAction}
                disabled={!canSendQuick}
                loading={sendingQuick}
              >
                Send
              </Button>
            </Tooltip>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}