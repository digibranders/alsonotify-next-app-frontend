"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  App,
  Avatar,
  Button,
  DatePicker,
  Dropdown,
  Input,
  Layout,
  Modal,
  Popover,
  Segmented,
  Skeleton,
  Space,
  Spin,
  Tag,
  Typography,
  Tooltip,
} from "antd";
import type { Dayjs } from "dayjs";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Filter,
  Forward,
  Image as ImageIcon,
  Mail,
  MailOpen,
  Paperclip,
  RefreshCcw,
  Reply,
  ReplyAll,
  Send,
  Trash2,
  Inbox,
  FileText,
  AlertCircle,
  Archive,
  PanelLeft,
  PanelLeftClose,
  Download,
  FolderOutput,
  Plus,
  FolderPlus,
} from "lucide-react";
import dayjs from "dayjs";
import { PageLayout } from "../../layout/PageLayout";
import { DocumentPreviewModal } from "../../ui/DocumentPreviewModal";
import { UserDocument } from "@/types/domain";
import {
  useMailAttachments,
  useMailFolders,
  useMailMessage,
  useMailMessages,
  useCreateFolder,
  useDeleteFolder,
  useMoveMessage,
} from "@/hooks/useMail";
import { useDebounce } from "@/hooks/useDebounce";
import { sanitizeEmailHtml } from "@/utils/security/sanitizeHtml";
import { determineFileType, safeFilename } from "@/utils/fileTypeUtils";
import { formatBytes } from "@/utils/format/fileFormatUtils";
import {
  deleteMail,
  downloadAttachment,
  patchMail,
  sendMail,
  MailMessage,
  MailFolder,
  MailAttachment,
  MailMessageDetail,
} from "@/services/mail";
import { EmailComposePane } from "./EmailComposePane";
import { useQuery } from "@tanstack/react-query";
import { useUserDetails } from "@/hooks/useUser";
import { MicrosoftUserOAuth, getTeamsConnectionStatus } from "@/services/calendar";
import type { ContactOption } from "./EmailInput";

const { Sider, Content } = Layout;
const { Text } = Typography;

// ---- Helpers ----

function formatFrom(m?: MailMessage | MailMessageDetail) {
  const from = m?.from?.emailAddress;
  return from?.name || from?.address || "Unknown";
}

function formatFromFull(m?: MailMessage | MailMessageDetail) {
  const from = m?.from?.emailAddress;
  if (!from) return { name: "Unknown", email: "" };
  return { name: from.name || from.address || "Unknown", email: from.address || "" };
}

function formatRecipientsFull(
  arr?: Array<{ emailAddress?: { name?: string; address?: string } }>
): Array<{ name: string; email: string }> {
  return (arr || [])
    .map((r) => ({
      name: r?.emailAddress?.name || r?.emailAddress?.address || "",
      email: r?.emailAddress?.address || "",
    }))
    .filter((r) => r.email);
}

function formatRecipients(
  arr?: Array<{ emailAddress?: { name?: string; address?: string } }>
) {
  const list = (arr || [])
    .map((r) => r?.emailAddress?.name || r?.emailAddress?.address)
    .filter(Boolean);
  return list.length ? list.join(", ") : "";
}

// ---- Avatar color helper ----
const AVATAR_COLORS = [
  "#4F46E5",
  "#0891B2",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#DB2777",
  "#2563EB",
  "#0D9488",
  "#EA580C",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ---- Date grouping helper ----
function getDateGroup(dateStr?: string): string {
  if (!dateStr) return "Older";
  const date = dayjs(dateStr);
  const now = dayjs();
  if (date.isSame(now, "day")) return "Today";
  if (date.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  if (date.isAfter(now.startOf("week"))) return "This Week";
  if (date.isAfter(now.subtract(1, "week").startOf("week"))) return "Last Week";
  if (date.isSame(now, "month")) return "This Month";
  return "Older";
}

// ---- Folder helpers ----
const FOLDER_ICONS: Record<string, typeof Mail> = {
  inbox: Inbox,
  sentitems: Send,
  drafts: FileText,
  deleteditems: Trash2,
  junkemail: AlertCircle,
  archive: Archive,
};

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

function findGraphFolderForWellKnownId(
  wellKnownId: string,
  graphFolders: MailFolder[]
) {
  const names = WELL_KNOWN_DISPLAY[wellKnownId] || [];
  if (!names.length) return undefined;
  return graphFolders.find((f: MailFolder) =>
    names.includes(normalize(f?.displayName))
  );
}

// ---- Compose mode type ----
type ComposeMode =
  | { active: false }
  | {
    active: true;
    type: "new" | "reply" | "replyAll" | "forward";
    originalMessage?: MailMessageDetail;
  };

// ---- Responsive hook ----
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

// ---- Mobile view state ----
type MobileView = "list" | "detail" | "compose";

export function MailPage() {
  const { message } = App.useApp();
  const { data: userDetails } = useUserDetails();

  // Microsoft 365 connection status (user-level, same as Calendar)
  const { data: integrationStatus, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ["calendar", "teamsConnection"],
    queryFn: getTeamsConnectionStatus,
    refetchOnWindowFocus: true,
    staleTime: 2 * 60 * 1000,
  });
  const isConnected = integrationStatus?.result?.connected ?? false;
  const [connecting, setConnecting] = useState(false);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isSmallLaptop = useMediaQuery("(min-width: 1024px) and (max-width: 1279px)");

  const currentUser = userDetails?.result
    ? {
      name: userDetails.result.name,
      email: userDetails.result.email,
      avatar: userDetails.result.profile_pic,
    }
    : { name: "Me", email: "" };

  // ---- State ----
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [previewingIds, setPreviewingIds] = useState<Set<string>>(new Set());

  const [folder, setFolder] = useState<string>("inbox");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const querySearch =
    debouncedSearch.trim().length >= 3 ? debouncedSearch.trim() : undefined;

  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const receivedAfter = dateRange?.[0]
    ? `${dateRange[0].format("YYYY-MM-DD")}T00:00:00.000Z`
    : undefined;
  const receivedBefore = dateRange?.[1]
    ? `${dateRange[1].format("YYYY-MM-DD")}T23:59:59.999Z`
    : undefined;

  const [bodyView, setBodyView] = useState<"html" | "text">("html");
  const [loadImages, setLoadImages] = useState(false);
  const [foldersCollapsed, setFoldersCollapsed] = useState(isTablet || isSmallLaptop);
  const [showFilters, setShowFilters] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);

  // Compose — replaces reading pane (Outlook-style)
  const [composeMode, setComposeMode] = useState<ComposeMode>({
    active: false,
  });

  // Mobile view
  const [mobileView, setMobileView] = useState<MobileView>("list");

  // Folder management
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const createFolderMut = useCreateFolder();
  const deleteFolderMut = useDeleteFolder();
  const moveMessageMut = useMoveMessage();

  // Context menu for message list
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);

  // ---- Queries ----
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
    return (messagesQ.data?.pages || []).flatMap(
      (p) => (p.result?.items || []) as MailMessage[]
    );
  }, [messagesQ.data]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: MailMessage[] }[] = [];
    let currentGroup = "";
    msgs.forEach((m) => {
      const group = getDateGroup(m.receivedDateTime);
      if (group !== currentGroup) {
        currentGroup = group;
        groups.push({ label: group, messages: [m] });
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    });
    return groups;
  }, [msgs]);

  const autocompleteOptions = useMemo(() => {
    const contactsMap = new Map<string, ContactOption>();
    msgs.forEach((m: MailMessage) => {
      if (m.from?.emailAddress) {
        const { address, name } = m.from.emailAddress;
        if (address)
          contactsMap.set(address, {
            value: address,
            label: name || address,
            name,
            email: address,
          });
      }
      (m.toRecipients || []).forEach((r) => {
        const { address, name } = r.emailAddress || {};
        if (address)
          contactsMap.set(address, {
            value: address,
            label: name || address,
            name,
            email: address,
          });
      });
      (m.ccRecipients || []).forEach((r) => {
        const { address, name } = r.emailAddress || {};
        if (address)
          contactsMap.set(address, {
            value: address,
            label: name || address,
            name,
            email: address,
          });
      });
    });
    return Array.from(contactsMap.values());
  }, [msgs]);

  const graphFolders = useMemo(
    () => (foldersQ.data?.result || []) as MailFolder[],
    [foldersQ.data?.result]
  );

  const folderItems = useMemo(() => {
    const defaults = [
      { id: "inbox", displayName: "Inbox" },
      { id: "sentitems", displayName: "Sent" },
      { id: "drafts", displayName: "Drafts" },
      { id: "deleteditems", displayName: "Deleted" },
      { id: "junkemail", displayName: "Junk" },
      { id: "archive", displayName: "Archive" },
    ].map((d) => {
      const match = findGraphFolderForWellKnownId(d.id, graphFolders);
      return {
        ...d,
        unreadItemCount: match?.unreadItemCount ?? 0,
        totalItemCount: match?.totalItemCount ?? undefined,
      };
    });
    const others = graphFolders.filter(
      (f: MailFolder) => !RESERVED_NAMES.has(normalize(f?.displayName))
    );
    return [...defaults, ...others];
  }, [graphFolders]);

  const currentFolderTotals = useMemo(() => {
    if (!folder)
      return {
        total: undefined as number | undefined,
        unread: undefined as number | undefined,
      };
    if (WELL_KNOWN_DISPLAY[folder]) {
      const match = findGraphFolderForWellKnownId(folder, graphFolders);
      return {
        total:
          typeof match?.totalItemCount === "number"
            ? match.totalItemCount
            : undefined,
        unread:
          typeof match?.unreadItemCount === "number"
            ? match.unreadItemCount
            : undefined,
      };
    }
    const match = graphFolders.find((f: MailFolder) => f?.id === folder);
    return {
      total:
        typeof match?.totalItemCount === "number"
          ? match.totalItemCount
          : undefined,
      unread:
        typeof match?.unreadItemCount === "number"
          ? match.unreadItemCount
          : undefined,
    };
  }, [folder, graphFolders]);

  const loadedCount = msgs.length;
  const totalCount = currentFolderTotals.total;
  const remainingCount =
    typeof totalCount === "number"
      ? Math.max(totalCount - loadedCount, 0)
      : undefined;

  const msgQ = useMailMessage(selectedId, bodyView);
  const attsQ = useMailAttachments(selectedId);
  const current = msgQ.data?.result;

  // Reset bodyView and loadImages when switching messages
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    setLoadImages(false);
    setBodyView("html");
  }

  // Auto-collapse folders on tablet/small laptop
  useEffect(() => {
    if (isTablet || isSmallLaptop) setFoldersCollapsed(true);
  }, [isTablet, isSmallLaptop]);

  const [focusIndex, setFocusIndex] = useState(0);

  const refresh = async () => {
    await foldersQ.refetch();
    await messagesQ.refetch();
    if (selectedId) {
      await msgQ.refetch();
      await attsQ.refetch();
    }
  };

  const connectMicrosoft = useCallback(async () => {
    try {
      setConnecting(true);
      const response = await MicrosoftUserOAuth();
      if (response?.result) {
        window.location.href = response.result;
      }
    } catch {
      message.error("Failed to connect to Microsoft 365");
    } finally {
      setConnecting(false);
    }
  }, [message]);

  const [prevFolder, setPrevFolder] = useState(folder);
  const [prevUnreadOnly, setPrevUnreadOnly] = useState(unreadOnly);
  if (folder !== prevFolder || unreadOnly !== prevUnreadOnly) {
    setPrevFolder(folder);
    setPrevUnreadOnly(unreadOnly);
    setFocusIndex(0);
  }

  const onSelect = async (id: string, isRead?: boolean) => {
    setSelectedId(id);
    setComposeMode({ active: false });
    if (isMobile) setMobileView("detail");

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

  const { modal } = App.useApp();

  const confirmDelete = () => {
    if (!selectedId) return;
    modal.confirm({
      title: "Delete Message",
      content: "Are you sure you want to delete this message?",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        deleteMail(selectedId).then(() => {
          message.success("Deleted");
          setSelectedId(undefined);
          if (isMobile) setMobileView("list");
          messagesQ.refetch();
          foldersQ.refetch();
        });
      },
    });
  };

  const handleMoveToFolder = (messageId: string, targetFolderId: string, targetName: string) => {
    moveMessageMut.mutate(
      { messageId, folderId: targetFolderId },
      {
        onSuccess: () => {
          message.success(`Moved to ${targetName}`);
          setSelectedId(undefined);
          setContextMenu(null);
          if (isMobile) setMobileView("list");
        },
        onError: () => message.error("Failed to move message"),
      }
    );
  };

  const moveToMenuItems = folderItems
    .filter((f) => f.id !== folder)
    .map((f) => {
      const Icon = FOLDER_ICONS[f.id] || Mail;
      return {
        key: f.id,
        icon: <Icon size={14} />,
        label: f.displayName,
        onClick: () => {
          const msgId = contextMenu?.messageId || selectedId;
          if (msgId) handleMoveToFolder(msgId, f.id, f.displayName);
        },
      };
    });

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolderMut.mutate(name, {
      onSuccess: () => {
        message.success(`Folder "${name}" created`);
        setNewFolderName("");
        setShowNewFolder(false);
      },
      onError: () => message.error("Failed to create folder"),
    });
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    modal.confirm({
      title: "Delete Folder",
      content: `Are you sure you want to delete "${folderName}"? All messages in this folder will be moved to Deleted Items.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        deleteFolderMut.mutate(folderId, {
          onSuccess: () => {
            message.success(`Folder "${folderName}" deleted`);
            if (folder === folderId) setFolder("inbox");
          },
          onError: () => message.error("Failed to delete folder"),
        });
      },
    });
  };

  // Keyboard navigation
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

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      if (e.key === "n" && !composeMode.active) {
        e.preventDefault();
        setComposeMode({ active: true, type: "new" });
        if (isMobile) setMobileView("compose");
      } else if (e.key === "r" && !composeMode.active && current) {
        e.preventDefault();
        setComposeMode({
          active: true,
          type: "reply",
          originalMessage: current,
        });
        if (isMobile) setMobileView("compose");
      } else if (e.key === "a" && !composeMode.active && current) {
        e.preventDefault();
        setComposeMode({
          active: true,
          type: "replyAll",
          originalMessage: current,
        });
        if (isMobile) setMobileView("compose");
      } else if (e.key === "f" && !composeMode.active && current) {
        e.preventDefault();
        setComposeMode({
          active: true,
          type: "forward",
          originalMessage: current,
        });
        if (isMobile) setMobileView("compose");
      } else if (e.key === "Escape" && composeMode.active) {
        setComposeMode({ active: false });
        if (isMobile) setMobileView(selectedId ? "detail" : "list");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [composeMode, current, isMobile, selectedId]);

  const doDownload = async (attId: string, name?: string) => {
    if (!selectedId || downloadingIds.has(attId)) return;
    setDownloadingIds((prev) => new Set(prev).add(attId));
    try {
      const blob = await downloadAttachment(selectedId, attId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeFilename(name);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 150);
    } catch (err) {
      console.error("Download error:", err);
      message.error("Failed to download attachment");
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(attId);
        return next;
      });
    }
  };

  const doPreview = async (
    attId: string,
    name: string,
    contentType: string,
    size: number
  ) => {
    if (!selectedId || previewingIds.has(attId)) return;
    setPreviewingIds((prev) => new Set(prev).add(attId));
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
      console.error("Preview error:", err);
      message.error("Failed to load preview");
    } finally {
      setPreviewingIds((prev) => {
        const next = new Set(prev);
        next.delete(attId);
        return next;
      });
    }
  };

  const handleSendMail = async (data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    attachments?: File[];
  }) => {
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
      bodyType: "HTML",
      attachments: data.attachments,
    });
    message.success("Mail sent");
    setComposeMode({ active: false });
    if (isMobile) setMobileView(selectedId ? "detail" : "list");
    await messagesQ.refetch();
  };

  const handleQuickAction = (type: "reply" | "replyAll" | "forward") => {
    if (!current) return;
    setComposeMode({ active: true, type, originalMessage: current });
    if (isMobile) setMobileView("compose");
  };

  const htmlBody = useMemo(() => {
    if (current?.body?.contentType !== "html") return "";
    return sanitizeEmailHtml(current?.body?.content || "", loadImages);
  }, [current?.body?.content, current?.body?.contentType, loadImages]);

  const hasImages = useMemo(
    () =>
      !!current?.body?.content &&
      (/<(?:img|picture|source)\s/i.test(current.body.content) ||
        /background-image\s*:/i.test(current.body.content)),
    [current?.body?.content]
  );

  const textBody = useMemo(() => {
    if (current?.body?.contentType === "html") return "";
    return current?.body?.content || "";
  }, [current?.body?.content, current?.body?.contentType]);

  // ---- Render helpers ----

  const renderFoldersSidebar = () => (
    <div className="bg-[#F7F7F7] rounded-[16px] p-2 md:p-3 h-full overflow-hidden flex flex-col text-xs">
      <div
        className={`flex items-center ${foldersCollapsed ? "justify-center" : "justify-between"} mb-3`}
      >
        {!foldersCollapsed && (
          <div className="flex items-center gap-2 truncate">
            <Mail className="w-4 h-4" />
            <Text strong>Folders</Text>
          </div>
        )}
        <div className="flex items-center gap-0.5">
          {!foldersCollapsed && (
            <Popover
              open={showNewFolder}
              onOpenChange={setShowNewFolder}
              trigger="click"
              placement="bottomRight"
              content={
                <div className="flex flex-col gap-2 w-48">
                  <Input
                    size="small"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onPressEnter={handleCreateFolder}
                    autoFocus
                  />
                  <div className="flex justify-end gap-1">
                    <Button size="small" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>Cancel</Button>
                    <Button size="small" type="primary" onClick={handleCreateFolder} loading={createFolderMut.isPending} disabled={!newFolderName.trim()}>Create</Button>
                  </div>
                </div>
              }
            >
              <Tooltip title="New folder">
                <button className="p-1.5 rounded-full hover:bg-white text-[#999999] hover:text-[#111111] transition-all">
                  <FolderPlus size={16} />
                </button>
              </Tooltip>
            </Popover>
          )}
          <button
            onClick={() => setFoldersCollapsed(!foldersCollapsed)}
            className="p-1.5 rounded-full hover:bg-white text-[#999999] hover:text-[#111111] transition-all"
          >
            {foldersCollapsed ? (
              <PanelLeft size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>
      </div>

      {foldersQ.isLoading ? (
        <div className="space-y-2 px-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton.Button
              key={i}
              active
              size="small"
              block
              style={{ height: 28 }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1 overflow-auto flex-1">
          {folderItems.map((f) => {
            const Icon = FOLDER_ICONS[f.id] || Mail;
            const isCustom = !WELL_KNOWN_DISPLAY[f.id];
            return (
              <Tooltip
                key={f.id}
                title={foldersCollapsed ? f.displayName : ""}
                placement="right"
              >
                <div className="group relative">
                  <button
                    type="button"
                    className={[
                      "w-full text-left py-2 rounded-[12px] transition flex items-center gap-2",
                      foldersCollapsed ? "justify-center px-0" : "px-3",
                      folder === f.id
                        ? "bg-white ring-1 ring-black/5"
                        : "hover:bg-white/70",
                    ].join(" ")}
                    onClick={() => {
                      setFolder(f.id);
                      setSelectedId(undefined);
                      setDateRange(null);
                      setComposeMode({ active: false });
                    }}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${folder === f.id ? "text-[#ff3b3b]" : "text-[#434343]"}`}
                    />
                    {!foldersCollapsed && (
                      <>
                        <span className="truncate flex-1">{f.displayName}</span>
                        {!!f.unreadItemCount && f.unreadItemCount > 0 && (
                          <div className="bg-[#FEF3F2] text-[#ff3b3b] px-1.5 py-0.5 rounded-full text-2xs font-bold min-w-[20px] text-center">
                            {f.unreadItemCount}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                  {isCustom && !foldersCollapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(f.id, f.displayName);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#FEF3F2] text-[#999999] hover:text-[#ff3b3b] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderMessageList = () => (
    <div className="bg-[#F7F7F7] rounded-[16px] p-3 overflow-hidden flex flex-col min-h-0 h-full">
      <div className="mb-2">
        <Input
          placeholder="Search emails..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
        {searchTerm.length > 0 && searchTerm.length < 3 && (
          <div className="text-2xs text-[#999999] mt-1 pl-1">
            Type at least 3 characters to search
          </div>
        )}
      </div>

      <div
        className="flex-1 overflow-auto pt-1 outline-none"
        tabIndex={0}
        onKeyDown={onListKeyDown}
      >
        {messagesQ.isLoading ? (
          <div className="space-y-3 px-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-[12px] bg-white/50 p-3">
                <div className="flex items-center gap-2">
                  <Skeleton.Avatar active size={28} />
                  <div className="flex-1">
                    <Skeleton.Input active size="small" block style={{ height: 14, marginBottom: 4 }} />
                    <Skeleton.Input active size="small" block style={{ height: 12 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : msgs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-3">
              <MailOpen size={28} className="text-[#999999]" />
            </div>
            <span className="text-sm font-medium text-[#999999]">
              No messages
            </span>
            <span className="text-xs text-[#BBBBBB] mt-1">
              {querySearch
                ? "Try a different search term"
                : "This folder is empty"}
            </span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {groupedMessages.map((group) => (
              <div key={group.label}>
                <div className="text-2xs font-semibold text-[#999999] uppercase tracking-wider px-2 py-2 mt-1 first:mt-0">
                  {group.label}
                </div>
                {group.messages.map((m: MailMessage) => {
                  const idx = msgs.indexOf(m);
                  const isFocused = idx === focusIndex;
                  const isSelected = selectedId === m.id;
                  const senderName = formatFrom(m);
                  const avatarColor = getAvatarColor(senderName);

                  return (
                    <Dropdown
                      key={m.id}
                      menu={{
                        items: [
                          {
                            key: "moveTo",
                            label: "Move to",
                            icon: <FolderOutput size={14} />,
                            children: folderItems
                              .filter((f) => f.id !== folder)
                              .map((f) => {
                                const FIcon = FOLDER_ICONS[f.id] || Mail;
                                return {
                                  key: f.id,
                                  icon: <FIcon size={14} />,
                                  label: f.displayName,
                                  onClick: () => handleMoveToFolder(m.id, f.id, f.displayName),
                                };
                              }),
                          },
                          { type: "divider" as const },
                          {
                            key: "delete",
                            label: "Delete",
                            icon: <Trash2 size={14} />,
                            danger: true,
                            onClick: () => {
                              setSelectedId(m.id);
                              setTimeout(confirmDelete, 0);
                            },
                          },
                        ],
                      }}
                      trigger={["contextMenu"]}
                    >
                    <button
                      type="button"
                      onClick={() => {
                        setFocusIndex(idx);
                        onSelect(m.id, m.isRead);
                      }}
                      className={[
                        "w-full text-left rounded-[12px] px-2 py-2 transition border mb-0.5",
                        isSelected
                          ? "bg-white border-black/5 ring-1 ring-black/5"
                          : isFocused
                            ? "bg-white/50 border-blue-200"
                            : "border-transparent hover:bg-white/70",
                      ].join(" ")}
                    >
                      <div className="flex gap-2.5">
                        {/* Sender Avatar */}
                        <Avatar
                          size={28}
                          style={{
                            backgroundColor: avatarColor,
                            fontSize: 11,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {senderName[0]?.toUpperCase() || "?"}
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {!m.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              )}
                              <span
                                className={[
                                  "truncate text-xs",
                                  !m.isRead ? "font-semibold text-[#111111]" : "text-[#434343]",
                                ].join(" ")}
                              >
                                {senderName}
                              </span>
                              {m.importance === "high" && (
                                <Tag
                                  color="red"
                                  className="m-0 text-2xs px-1 py-0 leading-4"
                                >
                                  !
                                </Tag>
                              )}
                            </div>
                            <span className="text-2xs text-[#999999] whitespace-nowrap shrink-0">
                              {m.receivedDateTime
                                ? dayjs(m.receivedDateTime).format("MMM D")
                                : ""}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span
                              className={[
                                "truncate min-w-0 text-xs",
                                !m.isRead ? "font-semibold text-[#111111]" : "text-[#434343]",
                              ].join(" ")}
                            >
                              {m.subject || "(no subject)"}
                            </span>
                            {m.hasAttachments && (
                              <Paperclip className="w-3 h-3 opacity-50 shrink-0" />
                            )}
                          </div>

                          <div className="text-2xs text-[#999999] truncate mt-0.5">
                            {m.bodyPreview || ""}
                          </div>
                        </div>
                      </div>
                    </button>
                    </Dropdown>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-[#EEEEEE] my-2" />

      <div className="flex items-center justify-between gap-3">
        <Button
          size="small"
          disabled={!messagesQ.hasNextPage}
          onClick={() => messagesQ.fetchNextPage()}
        >
          {typeof remainingCount === "number"
            ? `Load more (${remainingCount})`
            : "Load more"}
        </Button>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {typeof totalCount === "number"
            ? `${loadedCount} / ${totalCount}`
            : `${loadedCount} loaded`}
        </Text>
      </div>
    </div>
  );

  const renderReadingPane = () => (
    <div className="bg-[#F7F7F7] rounded-[16px] overflow-hidden flex flex-col h-full min-h-0 relative">
      {/* Compose mode replaces reading pane */}
      {composeMode.active ? (
        <EmailComposePane
          key={composeMode.type + (composeMode.originalMessage?.id || "new")}
          mode={composeMode.type}
          originalMessage={composeMode.originalMessage}
          currentUser={currentUser}
          autocompleteOptions={autocompleteOptions}
          onSend={handleSendMail}
          onDiscard={() => {
            setComposeMode({ active: false });
            if (isMobile) setMobileView(selectedId ? "detail" : "list");
          }}
        />
      ) : !selectedId ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4">
            <Mail size={32} className="text-[#CCCCCC]" />
          </div>
          <span className="text-sm font-medium text-[#999999]">
            Select a message to read
          </span>
          <span className="text-xs text-[#BBBBBB] mt-1">
            Or press <kbd className="px-1.5 py-0.5 bg-white rounded text-2xs ring-1 ring-black/10">N</kbd> to compose
          </span>
        </div>
      ) : msgQ.isLoading ? (
        <div className="p-4 space-y-4">
          <Skeleton active paragraph={{ rows: 1 }} />
          <div className="h-px bg-[#EEEEEE]" />
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-3 md:p-4 pb-0 shrink-0">
            {/* Mobile back button */}
            {isMobile && (
              <button
                onClick={() => setMobileView("list")}
                className="flex items-center gap-1 text-xs text-[#666666] mb-2 hover:text-[#111111]"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-[#111111] font-['Manrope'] m-0 leading-tight">
                  {current?.subject || "(no subject)"}
                </h2>

                <div className="mt-1.5 text-xs space-y-1">
                  {(() => {
                    const from = formatFromFull(current);
                    return (
                      <div className="flex items-start gap-1.5">
                        <span className="text-[#999999] font-medium min-w-[32px] pt-0.5">
                          From
                        </span>
                        <div className="min-w-0">
                          <span className="text-[#434343] font-semibold">
                            {from.name}
                          </span>
                          {from.email && from.email !== from.name && (
                            <span className="text-[#999999] ml-1">
                              &lt;{from.email}&gt;
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {formatRecipientsFull(current?.toRecipients).length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#999999] font-medium min-w-[32px] pt-0.5">
                        To
                      </span>
                      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 min-w-0">
                        {formatRecipientsFull(current?.toRecipients).map(
                          (r, i) => (
                            <span key={i} className="inline-flex items-center">
                              <span className="text-[#434343]">{r.name}</span>
                              {r.email && r.email !== r.name && (
                                <span className="text-[#999999] ml-0.5 text-2xs">
                                  &lt;{r.email}&gt;
                                </span>
                              )}
                              {i <
                                formatRecipientsFull(current?.toRecipients)
                                  .length -
                                1 && (
                                  <span className="text-[#CCCCCC]">,</span>
                                )}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {formatRecipientsFull(current?.ccRecipients).length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#999999] font-medium min-w-[32px] pt-0.5">
                        Cc
                      </span>
                      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 min-w-0">
                        {formatRecipientsFull(current?.ccRecipients).map(
                          (r, i) => (
                            <span key={i} className="inline-flex items-center">
                              <span className="text-[#434343]">{r.name}</span>
                              {r.email && r.email !== r.name && (
                                <span className="text-[#999999] ml-0.5 text-2xs">
                                  &lt;{r.email}&gt;
                                </span>
                              )}
                              {i <
                                formatRecipientsFull(current?.ccRecipients)
                                  .length -
                                1 && (
                                  <span className="text-[#CCCCCC]">,</span>
                                )}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {current?.receivedDateTime && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#999999] font-medium min-w-[32px]">
                        Date
                      </span>
                      <span className="text-[#434343]">
                        {dayjs(current.receivedDateTime).format(
                          "MMM D, YYYY • h:mm A"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons — icon only for compact layout */}
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip title="Reply (R)">
                  <button
                    onClick={() => handleQuickAction("reply")}
                    className="p-1.5 rounded-full hover:bg-white ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]"
                  >
                    <Reply size={15} />
                  </button>
                </Tooltip>
                <Tooltip title="Reply all (A)">
                  <button
                    onClick={() => handleQuickAction("replyAll")}
                    className="p-1.5 rounded-full hover:bg-white ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]"
                  >
                    <ReplyAll size={15} />
                  </button>
                </Tooltip>
                <Tooltip title="Forward (F)">
                  <button
                    onClick={() => handleQuickAction("forward")}
                    className="p-1.5 rounded-full hover:bg-white ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]"
                  >
                    <Forward size={15} />
                  </button>
                </Tooltip>
                <Dropdown menu={{ items: moveToMenuItems }} trigger={["click"]} placement="bottomRight">
                  <Tooltip title="Move to folder">
                    <button className="p-1.5 rounded-full hover:bg-white ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]">
                      <FolderOutput size={15} />
                    </button>
                  </Tooltip>
                </Dropdown>
                <Tooltip title="Delete">
                  <button
                    onClick={confirmDelete}
                    className="p-1.5 rounded-full hover:bg-[#FEF3F2] ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]"
                  >
                    <Trash2 size={15} />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="h-px bg-[#EEEEEE] mt-2 mb-2" />

            {/* View controls — compact row */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="flex bg-white ring-1 ring-black/5 rounded-full p-0.5">
                  <button
                    onClick={() => setBodyView("html")}
                    className={`px-2.5 py-0.5 text-2xs font-semibold rounded-full transition-all ${bodyView === "html"
                        ? "bg-[#111111] text-white shadow-sm"
                        : "text-[#777777] hover:text-[#111111]"
                      }`}
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => setBodyView("text")}
                    className={`px-2.5 py-0.5 text-2xs font-semibold rounded-full transition-all ${bodyView === "text"
                        ? "bg-[#111111] text-white shadow-sm"
                        : "text-[#777777] hover:text-[#111111]"
                      }`}
                  >
                    Text
                  </button>
                </div>
              </div>

              {bodyView === "html" && hasImages && (
                <button
                  onClick={() => setLoadImages((s) => !s)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-white ring-1 ring-black/5 text-2xs font-medium text-[#434343] hover:bg-[#F7F7F7] transition-all"
                >
                  {loadImages ? <EyeOff size={12} /> : <Eye size={12} />}
                  {loadImages ? "Hide images" : "Load images"}
                </button>
              )}
            </div>

            {bodyView === "html" && !loadImages && hasImages && (
              <div className="flex items-center gap-1 text-2xs text-[#999999] mb-1">
                <ImageIcon size={12} />
                Images are blocked
              </div>
            )}
          </div>

          {/* Scrollable Content */}
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
              <div className="min-w-full inline-block align-top rounded-[12px] bg-white p-4 ring-1 ring-black/5 whitespace-pre-wrap text-xs leading-6">
                {textBody}
              </div>
            )}

            {/* Attachments — only show when present */}
            {!attsQ.isLoading &&
              (attsQ.data?.result?.length || 0) > 0 && (
                <>
                  <div className="h-px bg-[#EEEEEE] my-4" />
                  <div className="min-w-full inline-block align-top">
                    <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mt-0 mb-3">
                      Attachments ({attsQ.data?.result?.length})
                    </h3>
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
                              <div className="font-semibold text-xs text-[#111111] truncate">
                                {a.name || "Unnamed"}
                              </div>
                              <div className="text-2xs text-[#999999]">
                                {formatBytes(a.size || 0)}
                              </div>
                            </div>
                          </div>

                          <Space size={4}>
                            <Tooltip title="Preview">
                              <Button
                                type="text"
                                size="small"
                                icon={
                                  <Eye
                                    size={14}
                                    className={
                                      previewingIds.has(a.id)
                                        ? "animate-pulse"
                                        : ""
                                    }
                                  />
                                }
                                loading={previewingIds.has(a.id)}
                                onClick={() =>
                                  doPreview(
                                    a.id,
                                    a.name || "Unnamed",
                                    a.contentType || "",
                                    a.size || 0
                                  )
                                }
                                className="text-[#666666] hover:text-[#111111]"
                              />
                            </Tooltip>
                            <Tooltip title="Download">
                              <Button
                                type="text"
                                size="small"
                                icon={
                                  <Download
                                    size={14}
                                    className={
                                      downloadingIds.has(a.id)
                                        ? "animate-bounce"
                                        : ""
                                    }
                                  />
                                }
                                loading={downloadingIds.has(a.id)}
                                onClick={() => doDownload(a.id, a.name)}
                                className="text-[#666666] hover:text-[#111111]"
                              />
                            </Tooltip>
                          </Space>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

            <style jsx global>{`
              .mail-html {
                font-size: 0.75rem;
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

            {/* Quick reply trigger at bottom */}
            {current && !composeMode.active && (
              <div className="mt-6 mb-2">
                <button
                  onClick={() => handleQuickAction("reply")}
                  className="w-full text-left rounded-[16px] bg-white ring-1 ring-black/5 px-4 py-3 text-sm text-[#999999] hover:text-[#434343] hover:ring-black/10 transition-all"
                >
                  Reply to {current.from?.emailAddress?.name || "sender"}...
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // ---- Mobile layout ----
  if (isMobile) {
    return (
      <PageLayout
        title="Mail"
        tabs={[]}
        activeTab=""
        onTabChange={() => { }}
        titleAction={{
          label: "Compose",
          onClick: () => {
            setComposeMode({ active: true, type: "new" });
            setMobileView("compose");
          },
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
              size="small"
            />
            <Button
              size="small"
              icon={<RefreshCcw className="w-3.5 h-3.5" />}
              onClick={refresh}
            />
            {!isConnected && !isLoadingIntegration && (
              <Button
                type="primary"
                size="small"
                loading={connecting}
                onClick={connectMicrosoft}
                className="text-xs font-semibold bg-[#111111] hover:bg-[#000000]/90 border-none"
              >
                Connect
              </Button>
            )}
          </Space>
        }
        className="pb-0"
      >
        {/* Mobile folder pills */}
        {mobileView === "list" && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-2 shrink-0">
            {folderItems.map((f) => {
              const Icon = FOLDER_ICONS[f.id] || Mail;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFolder(f.id);
                    setSelectedId(undefined);
                  }}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 transition",
                    folder === f.id
                      ? "bg-[#111111] text-white"
                      : "bg-[#F7F7F7] text-[#434343] hover:bg-[#EEEEEE]",
                  ].join(" ")}
                >
                  <Icon size={12} />
                  {f.displayName}
                  {!!f.unreadItemCount && f.unreadItemCount > 0 && (
                    <span className="text-2xs opacity-70">
                      ({f.unreadItemCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {mobileView === "list" && renderMessageList()}
          {mobileView === "detail" && renderReadingPane()}
          {mobileView === "compose" && renderReadingPane()}
        </div>

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

  // ---- Desktop / Tablet layout ----
  const showFolderSidebar = !isTablet || !foldersCollapsed;
  const gridCols = isTablet
    ? "grid-cols-[240px_1fr]"
    : foldersCollapsed
      ? "grid-cols-[240px_1fr]"
      : "grid-cols-[260px_1fr] xl:grid-cols-[320px_1fr]";

  return (
    <PageLayout
      title="Mail"
      tabs={[]}
      activeTab=""
      onTabChange={() => { }}
      titleAction={{
        label: "Compose",
        onClick: () => {
          setComposeMode({ active: true, type: "new" });
        },
      }}
      titleExtra={
        <Space wrap>
          {/* Filter toggle for cleaner toolbar */}
          <Button
            size="small"
            icon={<Filter className="w-3.5 h-3.5" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "text-[#ff3b3b]" : ""}
          >
            Filters
          </Button>
          <Segmented
            options={[
              { label: "All", value: "all" },
              { label: "Unread", value: "unread" },
            ]}
            value={unreadOnly ? "unread" : "all"}
            onChange={(v) => setUnreadOnly(v === "unread")}
          />
          <Button
            icon={<RefreshCcw className="w-4 h-4" />}
            onClick={refresh}
          >
            Refresh
          </Button>
          {!isConnected && !isLoadingIntegration && (
            <Button
              type="primary"
              loading={connecting}
              onClick={connectMicrosoft}
              className="h-8 px-4 text-xs font-semibold bg-[#111111] hover:bg-[#000000]/90 border-none"
            >
              Connect Microsoft 365
            </Button>
          )}
        </Space>
      }
      className="pb-0"
    >
      {/* Collapsible filter row */}
      {showFilters && (
        <div className="flex items-center gap-2 mb-2 px-1 animate-in slide-in-from-top duration-200">
          <DatePicker.RangePicker
            aria-label="Filter by date"
            format="MMM D, YYYY"
            value={dateRange ?? undefined}
            onChange={(dates) => setDateRange(dates ?? null)}
            allowClear
            size="small"
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
              Clear
            </Button>
          )}
        </div>
      )}

      <Layout style={{ height: "100%", background: "transparent" }}>
        {/* Folders sidebar — hidden on tablet if collapsed */}
        {(!isTablet || !foldersCollapsed) && (
          <Sider
            width={foldersCollapsed ? 64 : 180}
            style={{
              background: "transparent",
              paddingRight: foldersCollapsed ? 10 : 8,
              transition: "all 0.3s ease",
            }}
          >
            {renderFoldersSidebar()}
          </Sider>
        )}

        <Content style={{ background: "transparent" }}>
          <div
            className={`grid ${gridCols} gap-3 h-full min-h-0 transition-all duration-300`}
          >
            {renderMessageList()}
            {renderReadingPane()}
          </div>
        </Content>
      </Layout>

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
