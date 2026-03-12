"use client";

import { useMemo, useState, useRef } from "react";
import {
  App,
  Button,
  Divider,
  DatePicker,
  Input,
  Layout,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  Tooltip,
} from "antd";
import type { Dayjs } from "dayjs";
import type { UploadFile } from "antd";
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
  Inbox,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Archive,
  PanelLeft,
  PanelLeftClose,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import dayjs from "dayjs";
import { PageLayout } from "../../layout/PageLayout";
import { DocumentPreviewModal } from "../../ui/DocumentPreviewModal";
import { UserDocument } from "@/types/domain";
import { useMailAttachments, useMailFolders, useMailMessage, useMailMessages } from "@/hooks/useMail";
import { useDebounce } from "@/hooks/useDebounce";
import { sanitizeEmailHtml } from "@/utils/sanitizeHtml";
import { determineFileType, safeFilename } from "@/utils/fileTypeUtils";
import {
  deleteMail,
  downloadAttachment,
  patchMail,
  sendMail,
  MailMessage,
  MailFolder,
  MailAttachment,
  MailMessageDetail
} from "@/services/mail";
import { EmailComposeModal } from "./EmailComposeModal";
import { InlineReply, InlineReplyRef } from "./InlineReply";
import { useUserDetails } from "@/hooks/useUser";
import type { ContactOption } from "./EmailInput";

const { Sider, Content } = Layout;
const { Text } = Typography;

function formatFrom(m?: MailMessage | MailMessageDetail) {
  const from = m?.from?.emailAddress;
  return from?.name || from?.address || "Unknown";
}

function formatRecipients(arr?: Array<{ emailAddress?: { name?: string; address?: string } }>) {
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



// ---- Folder helpers for counts (frontend-only) ----
const FOLDER_ICONS: Record<string, typeof Mail> = {
  inbox: Inbox,
  sentitems: Send,
  drafts: FileText,
  deleteditems: Trash2,
  junkemail: AlertCircle,
  archive: Archive,
};

const normalize = (s?: string) => (s || "").trim().toLowerCase();

// well-known folder IDs used by your backend routing
const WELL_KNOWN_DISPLAY: Record<string, string[]> = {
  inbox: ["inbox"],
  sentitems: ["sent items", "sent"],
  drafts: ["drafts"],
  deleteditems: ["deleted items", "deleted"],
  junkemail: ["junk email", "junk", "spam"],
  archive: ["archive"],
};

const RESERVED_NAMES = new Set(Object.values(WELL_KNOWN_DISPLAY).flat());

function findGraphFolderForWellKnownId(wellKnownId: string, graphFolders: MailFolder[]) {
  const names = WELL_KNOWN_DISPLAY[wellKnownId] || [];
  if (!names.length) return undefined;
  return graphFolders.find((f: MailFolder) => names.includes(normalize(f?.displayName)));
}

export function MailPage() {
  const { message } = App.useApp();
  const { data: userDetails } = useUserDetails();
  const inlineReplyRef = useRef<InlineReplyRef>(null);

  const currentUser = userDetails?.result ? {
    name: userDetails.result.name,
    email: userDetails.result.email,
    avatar: userDetails.result.profile_pic
  } : { name: "Me", email: "" };
  const [replyOpen, setReplyOpen] = useState<"reply" | "replyAll" | "forward" | null>(null);
  const [replyText, setReplyText] = useState("");
  const [forwardTo, setForwardTo] = useState<string[]>([]);
  const [sendingQuick, setSendingQuick] = useState(false);
  const [quickFiles, setQuickFiles] = useState<UploadFile[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [previewingIds, setPreviewingIds] = useState<Set<string>>(new Set());

  const [folder, setFolder] = useState<string>("inbox");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const querySearch = debouncedSearch.trim().length >= 3 ? debouncedSearch.trim() : undefined;

  // Date range filter (clear when folder changes)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const receivedAfter = dateRange?.[0]
    ? `${dateRange[0].format("YYYY-MM-DD")}T00:00:00.000Z`
    : undefined;
  const receivedBefore = dateRange?.[1]
    ? `${dateRange[1].format("YYYY-MM-DD")}T23:59:59.999Z`
    : undefined;

  // view controls
  const [bodyView, setBodyView] = useState<"html" | "text">("html");
  const [loadImages, setLoadImages] = useState(false);
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);

  // preview
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);

  // compose
  const [composeOpen, setComposeOpen] = useState(false);

  // Quick reply/forward state is now handled by passing data to the compose modal
  const [composeInitialData, setComposeInitialData] = useState<MailMessage | undefined>(undefined);

  const foldersQ = useMailFolders();
  const messagesQ = useMailMessages(
    folder,
    unreadOnly,
    25,
    querySearch,
    60000,
    receivedAfter,
    receivedBefore
  );

  const msgs = useMemo(() => {
    return (messagesQ.data?.pages || []).flatMap((p) => (p.result?.items || []) as MailMessage[]);
  }, [messagesQ.data]);

  // Harvest contacts from messages for autocomplete
  const autocompleteOptions = useMemo(() => {
    const contactsMap = new Map<string, ContactOption>();

    msgs.forEach((m: MailMessage) => {
      // From
      if (m.from?.emailAddress) {
        const { address, name } = m.from.emailAddress;
        if (address) contactsMap.set(address, { value: address, label: name || address, name, email: address });
      }
      // To
      (m.toRecipients || []).forEach((r) => {
        const { address, name } = r.emailAddress || {};
        if (address) contactsMap.set(address, { value: address, label: name || address, name, email: address });
      });
      // Cc
      (m.ccRecipients || []).forEach((r) => {
        const { address, name } = r.emailAddress || {};
        if (address) contactsMap.set(address, { value: address, label: name || address, name, email: address });
      });
    });

    return Array.from(contactsMap.values());
  }, [msgs]);

  const graphFolders = useMemo(() => (foldersQ.data?.result || []) as MailFolder[], [foldersQ.data?.result]);

  // Build folder list with unread counts for well-known folders too
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

    // Keep “custom folders” from Graph, but avoid duplicating the default display names
    const others = graphFolders.filter((f: MailFolder) => !RESERVED_NAMES.has(normalize(f?.displayName)));

    return [...defaults, ...others];
  }, [graphFolders]);

  // Current folder totals (for "Loaded X / Y")
  const currentFolderTotals = useMemo(() => {
    if (!folder) return { total: undefined as number | undefined, unread: undefined as number | undefined };

    // If well-known, map by displayName in Graph folder list
    if (WELL_KNOWN_DISPLAY[folder]) {
      const match = findGraphFolderForWellKnownId(folder, graphFolders);
      return {
        total: typeof match?.totalItemCount === "number" ? match.totalItemCount : undefined,
        unread: typeof match?.unreadItemCount === "number" ? match.unreadItemCount : undefined,
      };
    }

    // Otherwise it's a real folder id returned by Graph listFolders
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

  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    setLoadImages(false);
  }



  // keyboard nav for list
  const [focusIndex, setFocusIndex] = useState(0);

  const refresh = async () => {
    await foldersQ.refetch();
    await messagesQ.refetch();
    if (selectedId) {
      await msgQ.refetch();
      await attsQ.refetch();
    }
  };

  // reset focus on folder change
  const [prevFolder, setPrevFolder] = useState(folder);
  const [prevUnreadOnly, setPrevUnreadOnly] = useState(unreadOnly);
  if (folder !== prevFolder || unreadOnly !== prevUnreadOnly) {
    setPrevFolder(folder);
    setPrevUnreadOnly(unreadOnly);
    setFocusIndex(0);
  }




  /*
   * Logic Update: Sync unread count immediately when reading
   */
  const onSelect = async (id: string, isRead?: boolean) => {
    setSelectedId(id);

    if (isRead === false) {
      try {
        await patchMail(id, { isRead: true });
        // Refetch messages to update read status icon
        messagesQ.refetch();
        // Refetch folders to update "Inbox (N)" count
        foldersQ.refetch();
      } catch {
        // ignore
      }
    }
  };

  const { modal } = App.useApp();

  const confirmDelete = () => {
    if (!selectedId) return;

    modal.confirm({
      title: 'Delete Message',
      content: 'Are you sure you want to delete this message?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteMail(selectedId).then(() => {
          message.success("Deleted");
          setSelectedId(undefined);
          messagesQ.refetch();
          foldersQ.refetch(); // Update counts
        });
      },
    });
  };

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

  const openCompose = (data?: MailMessage) => {
    setComposeInitialData(data);
    setComposeOpen(true);
  };

  const handleSendMail = async (data: { to: string[]; cc: string[]; bcc: string[]; subject: string; body: string; attachments?: File[] }) => {
    if (data.to.length === 0) {
      message.error("Add at least one To recipient");
      throw new Error("No recipients");
    }

    await sendMail({
      to: data.to,
      cc: data.cc.length ? data.cc : undefined,
      bcc: data.bcc.length ? data.bcc : undefined,
      subject: data.subject || "(no subject)",
      body: data.body || "",
      bodyType: "HTML", // We are using rich text editor now
      attachments: data.attachments,
    });

    message.success("Mail sent");
    await messagesQ.refetch();
  };

  const handleQuickAction = (type: 'reply' | 'replyAll' | 'forward') => {
    if (!current) return;
    // Scroll to and activate inline reply
    inlineReplyRef.current?.activate(type);
  };

  /* Old quick action logic removed for standard Reply/Forward to use inline. */
  /* If you still want the modal fallback for complex actions, you can keep it or use a separate button. */

  const htmlBody = useMemo(() => {
    if (current?.body?.contentType !== "html") return "";
    return sanitizeEmailHtml(current?.body?.content || "", loadImages);
  }, [current?.body?.content, current?.body?.contentType, loadImages]);

  const textBody = useMemo(() => {
    if (current?.body?.contentType === "html") return "";
    return current?.body?.content || "";
  }, [current?.body?.content, current?.body?.contentType]);

  return (
    <PageLayout
      title="Mail"
      tabs={[]}
      activeTab=""
      onTabChange={() => { }}
      titleAction={{
        label: "Compose",
        icon: <Send className="w-4 h-4" />,
        onClick: () => openCompose(),
      }}
      titleExtra={
        <Space wrap>
          <DatePicker.RangePicker
            aria-label="Filter by date"
            format="MMM D, YYYY"
            value={dateRange ?? undefined}
            onChange={(dates) => setDateRange(dates ?? null)}
            allowClear
            className="rounded-lg border border-[#EEEEEE] bg-white"
            placeholder={["Start date", "End date"]}
          />
          {dateRange && (
            <Button
              type="link"
              size="small"
              onClick={() => setDateRange(null)}
              className="p-0 text-[#666]"
            >
              Clear dates
            </Button>
          )}
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
      className="pb-0"
    >
      <Layout style={{ height: "100%", background: "transparent" }}>
        {/* Folders */}
        <Sider
          width={foldersCollapsed ? 64 : 180}
          style={{
            background: "transparent",
            paddingRight: foldersCollapsed ? 10 : 8,
            transition: "all 0.3s ease"
          }}
        >
          <div className="bg-[#F7F7F7] rounded-[16px] p-2 md:p-3 h-full overflow-hidden flex flex-col text-[0.8125rem]">
            <div className={`flex items-center ${foldersCollapsed ? 'justify-center' : 'justify-between'} mb-3`}>
              {!foldersCollapsed && (
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4" />
                  <Text strong>Folders</Text>
                </div>
              )}
              <button
                onClick={() => setFoldersCollapsed(!foldersCollapsed)}
                className="p-1.5 rounded-full hover:bg-white text-[#999999] hover:text-[#111111] transition-all"
              >
                {foldersCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>

            {foldersQ.isLoading ? (
              <div className="flex justify-center py-4"><Spin size="small" /></div>
            ) : (
              <div className="space-y-1 overflow-auto flex-1">
                {folderItems.map((f) => {
                  const Icon = FOLDER_ICONS[f.id] || Mail;
                  return (
                    <Tooltip key={f.id} title={foldersCollapsed ? f.displayName : ""} placement="right">
                      <button
                        type="button"
                        className={[
                          "w-full text-left py-2 rounded-[12px] transition flex items-center gap-2",
                          foldersCollapsed ? "justify-center px-0" : "px-3",
                          folder === f.id ? "bg-white ring-1 ring-black/5" : "hover:bg-white/70",
                        ].join(" ")}
                        onClick={() => {
                          setFolder(f.id);
                          setSelectedId(undefined);
                          setDateRange(null);
                        }}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${folder === f.id ? "text-[#ff3b3b]" : "text-[#434343]"}`}
                        />

                        {!foldersCollapsed && (
                          <>
                            <span className="truncate flex-1">{f.displayName}</span>
                            {!!f.unreadItemCount && f.unreadItemCount > 0 && (
                              <div className="bg-[#FEF3F2] text-[#ff3b3b] px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center">
                                {f.unreadItemCount}
                              </div>
                            )}
                          </>
                        )}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        </Sider>

        <Content style={{ background: "transparent" }}>
          <div className={`grid ${foldersCollapsed ? 'grid-cols-[240px_1fr]' : 'grid-cols-[260px_1fr]'} xl:grid-cols-[320px_1fr] gap-3 h-full min-h-0 transition-all duration-300`}>

            {/* Message list */}
            <div className="bg-[#F7F7F7] rounded-[16px] p-3 overflow-hidden flex flex-col min-h-0">
              <div className="mb-2">
                <Input
                  placeholder="Search (min 3 chars)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
              </div>

              <div
                className="flex-1 overflow-auto pt-1 outline-none"
                tabIndex={0}
                onKeyDown={onListKeyDown}
              >
                {messagesQ.isLoading ? (
                  <Spin />
                ) : msgs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#999]">No messages</div>
                ) : (
                  <div className="space-y-2">
                    {msgs.map((m: MailMessage, idx: number) => {
                      const isFocused = idx === focusIndex;
                      const isSelected = selectedId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setFocusIndex(idx);
                            onSelect(m.id, m.isRead);
                          }}
                          className={[
                            "w-full text-left rounded-[12px] px-2 py-2.5 transition border",
                            isSelected
                              ? "bg-white border-black/5 ring-1 ring-black/5"
                              : isFocused
                                ? "bg-white/50 border-blue-200"
                                : "border-transparent hover:bg-white/70",
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
                      );
                    })}
                  </div>
                )}
              </div>

              <Divider style={{ margin: "12px 0" }} />

              <div className="flex items-center justify-between gap-3">
                <Button disabled={!messagesQ.hasNextPage} onClick={() => messagesQ.fetchNextPage()}>
                  {/* ✅ show remaining if we know total */}
                  {typeof remainingCount === "number" ? `Load more (${remainingCount} left)` : "Load more"}
                </Button>

                {/* ✅ total messages beside load more */}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {typeof totalCount === "number"
                    ? `Loaded ${loadedCount} / ${totalCount}`
                    : `${loadedCount} loaded`}
                </Text>
              </div>
            </div>

            {/* Reading pane */}
            <div className="bg-[#F7F7F7] rounded-[16px] overflow-hidden flex flex-col h-full min-h-0 relative">
              {!selectedId ? (
                <div className="h-full flex items-center justify-center text-[#999]">Select a message</div>
              ) : msgQ.isLoading ? (
                <div className="h-full flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <Spin size="large" />
                </div>
              ) : (
                <>
                  {/* Sticky Header Section */}
                  <div className="p-3 md:p-4 pb-0 shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[16px] font-bold text-[#111111] font-['Manrope'] m-0 truncate">
                          {current?.subject || "(no subject)"}
                        </h2>

                        <div className="mt-1 text-[11px] space-y-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[#999999] font-medium min-w-[36px]">From:</span>
                            <span className="text-[#434343] font-semibold">{formatFrom(current)}</span>
                          </div>

                          {!!formatRecipients(current?.toRecipients) && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[#999999] font-medium min-w-[36px]">To:</span>
                              <span className="text-[#434343]">{formatRecipients(current?.toRecipients)}</span>
                            </div>
                          )}

                          {!!formatRecipients(current?.ccRecipients) && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[#999999] font-medium min-w-[36px]">Cc:</span>
                              <span className="text-[#434343]">{formatRecipients(current?.ccRecipients)}</span>
                            </div>
                          )}

                          {current?.receivedDateTime ? (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[#999999] font-medium min-w-[36px]">Date:</span>
                              <span className="text-[#434343]">
                                {dayjs(current.receivedDateTime).format("MMM D, YYYY • h:mm A")}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Tooltip title="Reply">
                          <button
                            onClick={() => handleQuickAction("reply")}
                            className="p-1.5 rounded-full hover:bg-white ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]"
                          >
                            <Reply size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip title="Reply all">
                          <button
                            onClick={() => handleQuickAction("replyAll")}
                            className="p-1.5 rounded-full hover:bg-white ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]"
                          >
                            <ReplyAll size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip title="Forward">
                          <button
                            onClick={() => handleQuickAction("forward")}
                            className="p-1.5 rounded-full hover:bg-white ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]"
                          >
                            <Forward size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <button
                            onClick={confirmDelete}
                            className="p-1.5 rounded-full hover:bg-[#FEF3F2] ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b] group"
                          >
                            <Trash2 size={16} className="group-hover:text-[#ff3b3b]" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="h-px bg-[#EEEEEE] mt-2 mb-3" />

                    <div className="flex items-center justify-between gap-2 mb-0">
                      <div className="flex bg-white ring-1 ring-black/5 rounded-full p-1 self-start">
                        <button
                          onClick={() => setBodyView("html")}
                          className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all ${bodyView === "html" ? "bg-[#111111] text-white shadow-sm" : "text-[#777777] hover:text-[#111111]"
                            }`}
                        >
                          HTML
                        </button>
                        <button
                          onClick={() => setBodyView("text")}
                          className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all ${bodyView === "text" ? "bg-[#111111] text-white shadow-sm" : "text-[#777777] hover:text-[#111111]"
                            }`}
                        >
                          Text
                        </button>
                      </div>

                      {bodyView === "html" ? (
                        <button
                          onClick={() => setLoadImages((s) => !s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white ring-1 ring-black/5 text-[12px] font-medium text-[#434343] hover:bg-[#F7F7F7] transition-all"
                        >
                          {loadImages ? <EyeOff size={14} /> : <Eye size={14} />}
                          {loadImages ? "Hide images" : "Load images"}
                        </button>
                      ) : null}
                    </div>

                    {bodyView === "html" && !loadImages ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#999999]">
                        <ImageIcon size={14} />
                        Images are blocked
                      </div>
                    ) : null}
                  </div>

                  {/* Scrollable Content Section */}
                  <div className="flex-1 overflow-auto px-3 md:px-4 pt-0 pb-3 md:pb-4">

                    {bodyView === "html" ? (
                      htmlBody ? (
                        <div className="min-w-full inline-block align-top">
                          <div
                            className="mail-html rounded-[12px] bg-white p-4 ring-1 ring-black/5"
                            dangerouslySetInnerHTML={{ __html: htmlBody }}
                          />
                        </div>
                      ) : (
                        <div className="min-w-full inline-block align-top rounded-[12px] bg-white p-4 ring-1 ring-black/5 text-[#777]">
                          No HTML content (switch to Text)
                        </div>
                      )
                    ) : (
                      <div className="min-w-full inline-block align-top rounded-[12px] bg-white p-4 ring-1 ring-black/5 whitespace-pre-wrap text-[0.8125rem] leading-6">
                        {textBody}
                      </div>
                    )}

                    <div className="h-px bg-[#EEEEEE] my-6" />

                    <div className="min-w-full inline-block align-top">
                      <h3 className="text-[16px] font-bold text-[#111111] font-['Manrope'] mt-0 mb-4">
                        Attachments
                      </h3>

                      {attsQ.isLoading ? (
                        <div className="flex justify-center p-4"><Spin /></div>
                      ) : (attsQ.data?.result?.length || 0) === 0 ? (
                        <div className="text-[0.8125rem] text-[#999999]">No attachments</div>
                      ) : (
                        <div className="space-y-2">
                          {(attsQ.data?.result || []).map((a: MailAttachment) => (
                            <div
                              key={a.id}
                              className="rounded-[12px] bg-white px-3 py-2.5 ring-1 ring-black/5 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="min-w-0 flex items-center gap-3">
                                <div className="p-1.5 bg-[#F7F7F7] rounded-[8px] text-[#111111]">
                                  <Paperclip size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-[0.8125rem] text-[#111111] truncate">{a.name || 'Unnamed'}</div>
                                  <div className="text-[11px] text-[#777]">
                                    {a.contentType || "file"} • {formatBytes(a.size || 0)}
                                  </div>
                                </div>
                              </div>

                              <Space size={8}>
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<Eye size={14} className={previewingIds.has(a.id) ? "animate-pulse" : ""} />}
                                  loading={previewingIds.has(a.id)}
                                  onClick={() => doPreview(a.id, a.name || 'Unnamed', a.contentType || '', a.size || 0)}
                                  className="text-[#666666] hover:text-[#111111]"
                                >
                                  Preview
                                </Button>
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<Download size={14} className={downloadingIds.has(a.id) ? "animate-bounce" : ""} />}
                                  loading={downloadingIds.has(a.id)}
                                  onClick={() => doDownload(a.id, a.name)}
                                  className="text-[#666666] hover:text-[#111111]"
                                >
                                  Download
                                </Button>
                              </Space>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <style jsx global>{`
                    .mail-html {
                      font-size: 0.8125rem;
                      line-height: 1.7;
                      color: #222;
                      overflow-wrap: anywhere;
                      zoom: 0.92;
                      transform-origin: top left;
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
                  `}</style>

                    {/* Inline Reply Box */}
                    <div className="mt-8 mb-4">
                      <InlineReply
                        ref={inlineReplyRef}
                        originalMessage={current}
                        currentUser={currentUser}
                        onSend={async (data) => {
                          await handleSendMail({
                            ...data,
                            bcc: [] // Inline usually doesn't show BCC initially
                          });
                        }}
                        onDiscard={() => {
                          // Maybe clear? Or just do nothing as it resets itself
                        }}
                      />
                    </div>

                  </div>
                </>
              )}
            </div>
          </div>
        </Content>
      </Layout>

      <EmailComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSendMail}
        initialData={composeInitialData}
        autocompleteOptions={autocompleteOptions}
      />

      <DocumentPreviewModal
        open={!!previewDoc}
        document={previewDoc}
        onClose={() => {
          if (previewDoc?.fileUrl) URL.revokeObjectURL(previewDoc.fileUrl);
          setPreviewDoc(null);
        }}
      />
    </PageLayout>
  );
}
