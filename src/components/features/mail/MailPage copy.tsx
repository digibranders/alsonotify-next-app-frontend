"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Divider,
  Input,
  Layout,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Tooltip,
} from "antd";
import {
  Eye,
  EyeOff,
  Forward,
  Image as ImageIcon,
  Mail,
  Paperclip,
  RefreshCcw,
  Reply,
  ReplyAll,
  Send,
  Trash2,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import DOMPurify from "dompurify";

import { PageLayout } from "../../layout/PageLayout";
import { useMailAttachments, useMailFolders, useMailMessage, useMailMessages } from "@/hooks/useMail";
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

// --- Helpers ---

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

function sanitizeEmailHtml(html: string, allowImages: boolean) {
  if (!html) return "";
  // DOMPurify handles the heavy lifting. We additionally block remote images if allowImages=false.
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });

  if (allowImages) return clean;

  try {
    const doc = new DOMParser().parseFromString(clean, "text/html");
    doc.querySelectorAll("img").forEach((img) => img.remove());
    return doc.body.innerHTML || "";
  } catch {
    return clean;
  }
}

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

function hasAnyNonEmpty(arr: string[]) {
  return arr.some((s) => !!s.trim());
}

// --- Component ---

export function MailPage() {
  // ✅ use App context instances (fixes static Modal warning)
  const { message, modal } = App.useApp();

  const [folder, setFolder] = useState<string>("inbox");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // view controls
  const [bodyView, setBodyView] = useState<"html" | "text">("html");
  const [loadImages, setLoadImages] = useState(false);

  // compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [showComposeCc, setShowComposeCc] = useState(false);
  const [composeTo, setComposeTo] = useState<string[]>([]);
  const [composeCc, setComposeCc] = useState<string[]>([]);
  const [composeBcc, setComposeBcc] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingCompose, setSendingCompose] = useState(false);

  // quick reply / forward
  const [replyOpen, setReplyOpen] = useState<"reply" | "replyAll" | "forward" | null>(null);
  const [replyText, setReplyText] = useState("");
  const [forwardTo, setForwardTo] = useState<string[]>([]);
  const [sendingReply, setSendingReply] = useState(false);

  const foldersQ = useMailFolders();
  const messagesQ = useMailMessages(folder, unreadOnly, 25);

  const msgs = useMemo(() => {
    return (messagesQ.data?.pages || []).flatMap((p) => p.result?.items || []);
  }, [messagesQ.data]);

  const graphFolders = (foldersQ.data?.result || []) as any[];

  // Build folder list with unread + total
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

    // well-known
    if (WELL_KNOWN_DISPLAY[folder]) {
      const match = findGraphFolderForWellKnownId(folder, graphFolders);
      return {
        total: typeof match?.totalItemCount === "number" ? match.totalItemCount : undefined,
        unread: typeof match?.unreadItemCount === "number" ? match.unreadItemCount : undefined,
      };
    }

    // custom folder by id
    const match = graphFolders.find((f: any) => f?.id === folder);
    return {
      total: typeof match?.totalItemCount === "number" ? match.totalItemCount : undefined,
      unread: typeof match?.unreadItemCount === "number" ? match.unreadItemCount : undefined,
    };
  }, [folder, graphFolders]);

  const loadedCount = msgs.length;
  const totalCount = currentFolderTotals.total;
  const remainingCount = typeof totalCount === "number" ? Math.max(totalCount - loadedCount, 0) : undefined;

  const msgQ = useMailMessage(selectedId, bodyView);
  const attsQ = useMailAttachments(selectedId);
  const current = msgQ.data?.result;

  useEffect(() => {
    setLoadImages(false);
  }, [selectedId]);

  const onSelect = async (id: string, isRead?: boolean) => {
    setSelectedId(id);
    if (isRead === false) {
      try {
        await patchMail(id, { isRead: true });
        messagesQ.refetch();
      } catch {
        /* ignore */
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

  const doDelete = async () => {
    if (!selectedId) return;
    try {
      await deleteMail(selectedId);
      message.success("Deleted");
      setSelectedId(undefined);
      await messagesQ.refetch();
    } catch (e: any) {
      message.error(e?.message || "Failed to delete");
    }
  };

  const doDownload = async (attId: string, name?: string) => {
    if (!selectedId) return;
    try {
      const blob = await downloadAttachment(selectedId, attId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "attachment";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      message.error(e?.message || "Download failed");
    }
  };

  const resetCompose = () => {
    setComposeTo([]);
    setComposeCc([]);
    setComposeBcc([]);
    setComposeSubject("");
    setComposeBody("");
    setShowComposeCc(false);
  };

  const hasComposeDraft =
    hasAnyNonEmpty(composeTo) ||
    hasAnyNonEmpty(composeCc) ||
    hasAnyNonEmpty(composeBcc) ||
    !!composeSubject.trim() ||
    !!composeBody.trim();

  const closeCompose = () => {
    if (!hasComposeDraft) {
      setComposeOpen(false);
      return;
    }

    // ✅ use modal.confirm (App context) -> no warning
    modal.confirm({
      title: "Discard draft?",
      content: "You have unsent changes. Do you want to discard this message?",
      okText: "Discard",
      okButtonProps: { danger: true },
      cancelText: "Keep editing",
      onOk: () => {
        resetCompose();
        setComposeOpen(false);
      },
    });
  };

  const doSend = async () => {
    const to = composeTo.map((s) => s.trim()).filter(Boolean);
    const cc = composeCc.map((s) => s.trim()).filter(Boolean);
    const bcc = composeBcc.map((s) => s.trim()).filter(Boolean);

    if (to.length === 0) return;

    setSendingCompose(true);
    try {
      await sendMail({
        to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject: composeSubject || "(no subject)",
        body: composeBody || "",
        bodyType: "Text",
      });

      message.success("Mail sent");
      resetCompose();
      setComposeOpen(false);
      await messagesQ.refetch();
    } catch (e: any) {
      message.error(e?.message || "Failed to send");
    } finally {
      setSendingCompose(false);
    }
  };

  const doQuickAction = async () => {
    if (!selectedId) return;
    if (!replyOpen) return;

    const forwardToClean = forwardTo.map((s) => s.trim()).filter(Boolean);
    const text = replyText.trim();

    if (replyOpen === "forward" && forwardToClean.length === 0) return;
    if (!text) return;

    setSendingReply(true);
    try {
      if (replyOpen === "reply") {
        await replyMail(selectedId, text);
        message.success("Replied");
      } else if (replyOpen === "replyAll") {
        await replyAllMail(selectedId, text);
        message.success("Replied all");
      } else if (replyOpen === "forward") {
        await forwardMail(selectedId, { to: forwardToClean, comment: text });
        message.success("Forwarded");
      }

      setReplyOpen(null);
      setReplyText("");
      setForwardTo([]);
      await msgQ.refetch();
      await messagesQ.refetch();
    } catch (e: any) {
      message.error(e?.message || "Failed");
    } finally {
      setSendingReply(false);
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

  // --- Disabled logic (no black buttons; just disable) ---
  const canSendCompose = hasAnyNonEmpty(composeTo) && !sendingCompose;
  const composeDisabledReason = !hasAnyNonEmpty(composeTo) ? "Add at least one To recipient" : "";

  const canSendReply =
    !sendingReply &&
    !!replyOpen &&
    (replyOpen !== "forward" ? true : hasAnyNonEmpty(forwardTo)) &&
    !!replyText.trim();

  const replyDisabledReason = !replyText.trim()
    ? "Type a message"
    : replyOpen === "forward" && !hasAnyNonEmpty(forwardTo)
      ? "Add Forward To recipient(s)"
      : "";

  return (
    <PageLayout
      title="Mail"
      tabs={[]}
      activeTab=""
      onTabChange={() => {}}
      titleAction={{
        label: "Compose",
        icon: <Send className="w-4 h-4" />,
        onClick: () => setComposeOpen(true),
      }}
      action={
        <Space>
          <Segmented
            options={[
              { label: "All", value: "all" },
              { label: "Unread", value: "unread" },
            ]}
            value={unreadOnly ? "unread" : "all"}
            onChange={(v) => setUnreadOnly(v === "unread")}
          />
          <Button icon={<RefreshCcw className="w-4 h-4" />} onClick={refresh}>
            Refresh
          </Button>
        </Space>
      }
    >
      <Layout style={{ height: "100%", background: "transparent" }}>
        {/* FOLDERS */}
        <Sider width={260} style={{ background: "transparent", paddingRight: 12 }}>
          <div className="bg-[#F7F7F7] rounded-[16px] p-4 h-full overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4" />
              <Text strong>Folders</Text>
            </div>

            {foldersQ.isLoading ? (
              <Spin />
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

                    <span className="flex items-center gap-2 shrink-0">
                      {/* total count (optional) */}
                      {typeof f.totalItemCount === "number" ? (
                        <span className="text-[11px] text-[#777]">{f.totalItemCount}</span>
                      ) : null}

                      {/* unread badge */}
                      {!!f.unreadItemCount && f.unreadItemCount > 0 ? (
                        <Tag color="blue" className="m-0">
                          {f.unreadItemCount}
                        </Tag>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Sider>

        {/* CONTENT AREA */}
        <Content style={{ background: "transparent" }}>
          <div className="grid grid-cols-[420px_1fr] gap-4 h-full min-h-0">
            {/* MESSAGE LIST */}
            <div className="bg-[#F7F7F7] rounded-[16px] p-4 overflow-hidden flex flex-col min-h-0">
              <Input placeholder="Search (later)" disabled className="mb-3" />

              <div className="flex-1 overflow-auto">
                {messagesQ.isLoading ? (
                  <Spin />
                ) : msgs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#999]">No messages</div>
                ) : (
                  <div className="space-y-2">
                    {msgs.map((m: any) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelect(m.id, m.isRead)}
                        className={[
                          "w-full text-left rounded-[14px] px-3 py-3 transition",
                          selectedId === m.id ? "bg-white ring-1 ring-black/5" : "hover:bg-white/70",
                        ].join(" ")}
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {!m.isRead ? <span className="w-2 h-2 rounded-full bg-blue-500" /> : <span className="w-2 h-2" />}
                              <span className={["truncate", !m.isRead ? "font-semibold" : ""].join(" ")}>
                                {formatFrom(m)}
                              </span>
                              {m.importance === "high" ? <Tag color="red" className="m-0">High</Tag> : null}
                            </div>
                            <span className="text-[12px] text-[#777] whitespace-nowrap">
                              {m.receivedDateTime ? dayjs(m.receivedDateTime).format("MMM D, h:mm A") : ""}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className={["truncate min-w-0", !m.isRead ? "font-semibold" : ""].join(" ")}>
                              {m.subject || "(no subject)"}
                            </span>
                            {m.hasAttachments ? <Paperclip className="w-4 h-4 opacity-60 shrink-0" /> : null}
                          </div>

                          <div className="text-[12px] text-[#777] truncate mt-1">{m.bodyPreview || ""}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Divider style={{ margin: "12px 0" }} />

              <div className="flex items-center justify-between gap-3">
                <Button disabled={!messagesQ.hasNextPage} onClick={() => messagesQ.fetchNextPage()}>
                  {typeof remainingCount === "number" ? `Load more (${remainingCount} left)` : "Load more"}
                </Button>

                <Text type="secondary" style={{ fontSize: 12 }}>
                  {typeof totalCount === "number" ? `Loaded ${loadedCount} / ${totalCount}` : `${loadedCount} loaded`}
                </Text>
              </div>
            </div>

            {/* READING PANE */}
            <div className="bg-[#F7F7F7] rounded-[16px] p-4 overflow-auto min-h-0">
              {!selectedId ? (
                <div className="h-full flex items-center justify-center text-[#999]">Select a message</div>
              ) : msgQ.isLoading ? (
                <Spin />
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Title level={5} style={{ margin: 0 }} className="truncate">
                        {current?.subject || "(no subject)"}
                      </Title>

                      <div className="mt-1 text-[12px] text-[#666] space-y-0.5">
                        <div className="truncate">
                          <Text type="secondary">From:</Text>{" "}
                          <span className="text-[#444]">{formatFrom(current)}</span>
                        </div>

                        {!!formatRecipients(current?.toRecipients) && (
                          <div className="truncate">
                            <Text type="secondary">To:</Text>{" "}
                            <span className="text-[#444]">{formatRecipients(current?.toRecipients)}</span>
                          </div>
                        )}

                        {!!formatRecipients(current?.ccRecipients) && (
                          <div className="truncate">
                            <Text type="secondary">Cc:</Text>{" "}
                            <span className="text-[#444]">{formatRecipients(current?.ccRecipients)}</span>
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
                        <Popconfirm
                          title="Delete message"
                          description="Are you sure you want to delete this message?"
                          onConfirm={doDelete}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                          placement="bottomRight"
                        >
                          <Button danger icon={<Trash2 className="w-4 h-4" />} />
                        </Popconfirm>
                      </Tooltip>
                    </Space>
                  </div>

                  <Divider />

                  {/* Body Controls */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Space>
                      <Segmented
                        size="small"
                        options={[
                          { label: "HTML", value: "html" },
                          { label: "Text", value: "text" },
                        ]}
                        value={bodyView}
                        onChange={(v) => setBodyView(v as "html" | "text")}
                      />

                      {bodyView === "html" ? (
                        <Button
                          size="small"
                          icon={loadImages ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          onClick={() => setLoadImages((s) => !s)}
                        >
                          {loadImages ? "Hide images" : "Load images"}
                        </Button>
                      ) : null}
                    </Space>

                    {bodyView === "html" && !loadImages ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <ImageIcon className="inline-block w-4 h-4 mr-1 align-[-2px]" />
                        Images are blocked
                      </Text>
                    ) : null}
                  </div>

                  {/* Content */}
                  {bodyView === "html" ? (
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
                    <div className="rounded-[12px] bg-white p-4 ring-1 ring-black/5 whitespace-pre-wrap text-[13px] leading-6">
                      {textBody}
                    </div>
                  )}

                  <Divider />

                  {/* Attachments */}
                  <Title level={5} style={{ marginTop: 0 }}>
                    Attachments
                  </Title>

                  {attsQ.isLoading ? (
                    <Spin />
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
                            <div className="text-[12px] text-[#777]">
                              {a.contentType || "file"} • {formatBytes(a.size || 0)}
                            </div>
                          </div>
                          <Button onClick={() => doDownload(a.id, a.name)}>Download</Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <style jsx global>{`
                    .mail-html {
                      font-size: 13px;
                      line-height: 1.7;
                      color: #222;
                      overflow-wrap: anywhere;
                    }
                    .mail-html img {
                      max-width: 100%;
                      height: auto;
                    }
                    .mail-html table {
                      width: 100%;
                      border-collapse: collapse;
                    }
                    .mail-html a {
                      color: #1677ff;
                      text-decoration: none;
                    }
                    .mail-html a:hover {
                      text-decoration: underline;
                    }
                    .mail-html blockquote {
                      border-left: 3px solid #e5e5e5;
                      margin: 8px 0;
                      padding-left: 10px;
                      color: #555;
                    }
                    .mail-html pre {
                      white-space: pre-wrap;
                      background: #fafafa;
                      padding: 10px;
                      border-radius: 10px;
                      overflow: auto;
                    }

                    /* Seamless Select */
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
                      font-size: 14px;
                      padding-left: 0;
                    }
                  `}</style>
                </>
              )}
            </div>
          </div>
        </Content>
      </Layout>

      {/* =======================================================
          COMPOSE MODAL (polished)
         ======================================================= */}
      <Modal
        title={null}
        footer={null}
        closable={false}
        open={composeOpen}
        onCancel={closeCompose}
        width={720}
        destroyOnHidden
        centered
        styles={{ body: { padding: 0 } }} // ✅ no bodyStyle; ✅ no styles.content
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-5">New message</div>
              <div className="text-[12px] text-gray-500">
                {composeTo.length ? `${composeTo.length} recipient(s)` : "Add recipients to send"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Send disabled until required fields */}
              <Tooltip title={!canSendCompose ? composeDisabledReason : ""}>
                <span>
                  <Button
                    type="primary"
                    icon={<Send className="w-4 h-4" />}
                    onClick={doSend}
                    disabled={!canSendCompose}
                    loading={sendingCompose}
                  >
                    Send
                  </Button>
                </span>
              </Tooltip>

              <Button
                type="text"
                icon={<X className="w-5 h-5 text-gray-500" />}
                onClick={closeCompose}
              />
            </div>
          </div>

          {/* Fields */}
          <div className="px-5 py-4 space-y-2">
            {/* To */}
            <div className="flex items-start gap-3 border-b border-gray-100 pb-2">
              <span className="text-gray-400 text-[11px] font-bold tracking-wide w-10 mt-1.5">
                TO
              </span>
              <div className="flex-1">
                <Select
                  mode="tags"
                  className="ant-select-seamless w-full"
                  placeholder="Recipients (comma separated)"
                  value={composeTo}
                  onChange={setComposeTo}
                  tokenSeparators={[",", ";"]}
                  suffixIcon={null}
                  open={false}
                  maxTagCount="responsive"
                />
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
            {showComposeCc && (
              <div className="space-y-2">
                <div className="flex items-start gap-3 border-b border-gray-100 pb-2">
                  <span className="text-gray-400 text-[11px] font-bold tracking-wide w-10 mt-1.5">
                    CC
                  </span>
                  <Select
                    mode="tags"
                    className="ant-select-seamless w-full"
                    placeholder="Cc"
                    value={composeCc}
                    onChange={setComposeCc}
                    tokenSeparators={[",", ";"]}
                    suffixIcon={null}
                    open={false}
                    maxTagCount="responsive"
                  />
                </div>

                <div className="flex items-start gap-3 border-b border-gray-100 pb-2">
                  <span className="text-gray-400 text-[11px] font-bold tracking-wide w-10 mt-1.5">
                    BCC
                  </span>
                  <Select
                    mode="tags"
                    className="ant-select-seamless w-full"
                    placeholder="Bcc"
                    value={composeBcc}
                    onChange={setComposeBcc}
                    tokenSeparators={[",", ";"]}
                    suffixIcon={null}
                    open={false}
                    maxTagCount="responsive"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-2 pt-1">
              <span className="text-gray-400 text-[11px] font-bold tracking-wide w-10">
                SUB
              </span>
              <Input
                variant="borderless"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject"
                className="p-0 flex-1 text-[14px] font-medium"
              />
            </div>

            {/* Body */}
            <Input.TextArea
              variant="borderless"
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="Type your message…"
              autoSize={{ minRows: 12, maxRows: 20 }}
              className="px-0 mt-2 text-[14px] resize-none"
              style={{ lineHeight: 1.6 }}
            />
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <Button onClick={closeCompose}>Discard</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tip: Use comma/semicolon to add multiple recipients
            </Text>
          </div>
        </div>
      </Modal>

      {/* =======================================================
          REPLY / FORWARD MODAL (polished)
         ======================================================= */}
      <Modal
        title={null}
        footer={null}
        closable={false}
        open={!!replyOpen}
        onCancel={() => setReplyOpen(null)}
        width={640}
        centered
        destroyOnHidden
        styles={{ body: { padding: 0 } }} // ✅ no bodyStyle; ✅ no styles.content
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {replyOpen === "forward" ? (
                <Forward className="w-4 h-4 text-gray-700" />
              ) : replyOpen === "replyAll" ? (
                <ReplyAll className="w-4 h-4 text-gray-700" />
              ) : (
                <Reply className="w-4 h-4 text-gray-700" />
              )}

              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-5">
                  {replyOpen === "forward" ? "Forward" : replyOpen === "replyAll" ? "Reply all" : "Reply"}
                </div>
                <div className="text-[12px] text-gray-500 truncate">
                  {current ? `Regarding: ${current.subject || "(no subject)"}` : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip title={!canSendReply ? replyDisabledReason : ""}>
                <span>
                  <Button
                    type="primary"
                    icon={<Send className="w-4 h-4" />}
                    onClick={doQuickAction}
                    disabled={!canSendReply}
                    loading={sendingReply}
                  >
                    Send
                  </Button>
                </span>
              </Tooltip>

              <Button
                type="text"
                icon={<X className="w-5 h-5 text-gray-500" />}
                onClick={() => setReplyOpen(null)}
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-3">
            {replyOpen === "forward" && (
              <div className="flex items-start gap-3 border-b border-gray-100 pb-2">
                <span className="text-gray-400 text-[11px] font-bold tracking-wide uppercase w-10 mt-1.5">
                  TO
                </span>
                <Select
                  mode="tags"
                  className="ant-select-seamless w-full"
                  placeholder="Forward to…"
                  value={forwardTo}
                  onChange={setForwardTo}
                  tokenSeparators={[",", ";"]}
                  suffixIcon={null}
                  open={false}
                  maxTagCount="responsive"
                />
              </div>
            )}

            <Input.TextArea
              variant="borderless"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              autoSize={{ minRows: 10, maxRows: 18 }}
              placeholder="Write your message…"
              className="px-0 text-[14px] resize-none"
              style={{ lineHeight: 1.6 }}
              autoFocus
            />
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <Button onClick={() => setReplyOpen(null)}>Cancel</Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Send enabled after you type a message
            </Text>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
