
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Divider,
  Input,
  Layout,
  Modal,
  Segmented,
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
} from "lucide-react";
import dayjs from "dayjs";
import { PageLayout } from "../../layout/PageLayout";
import { DocumentPreviewModal } from "../../ui/DocumentPreviewModal";
import { UserDocument } from "@/types/genericTypes";
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
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc
      .querySelectorAll("script, iframe, object, embed, form, input, button, textarea, select, meta, link")
      .forEach((n) => n.remove());

    if (!allowImages) {
      doc.querySelectorAll("img").forEach((img) => img.remove());
    }

    doc.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = (attr.value || "").trim();

        if (name.startsWith("on")) el.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && /^javascript:/i.test(value)) el.removeAttribute(attr.name);
      });

      if (el.tagName.toLowerCase() === "a") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    });

    return doc.body.innerHTML || "";
  } catch {
    return "";
  }
}

// ---- Folder helpers for counts (frontend-only) ----
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

function findGraphFolderForWellKnownId(wellKnownId: string, graphFolders: any[]) {
  const names = WELL_KNOWN_DISPLAY[wellKnownId] || [];
  if (!names.length) return undefined;
  return graphFolders.find((f: any) => names.includes(normalize(f?.displayName)));
}

export function MailPage() {
  const { message } = App.useApp();

  const [folder, setFolder] = useState<string>("inbox");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // view controls
  const [bodyView, setBodyView] = useState<"html" | "text">("html");
  const [loadImages, setLoadImages] = useState(false);

  // preview
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);

  // compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // quick reply
  const [replyOpen, setReplyOpen] = useState<"reply" | "replyAll" | "forward" | null>(null);
  const [replyText, setReplyText] = useState("");
  const [forwardTo, setForwardTo] = useState("");

  const foldersQ = useMailFolders();
  const messagesQ = useMailMessages(folder, unreadOnly, 25);

  const msgs = useMemo(() => {
    return (messagesQ.data?.pages || []).flatMap((p) => p.result?.items || []);
  }, [messagesQ.data]);

  const graphFolders = (foldersQ.data?.result || []) as any[];

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
    const others = graphFolders.filter((f: any) => !RESERVED_NAMES.has(normalize(f?.displayName)));

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

  const doDelete = async () => {
    if (!selectedId) return;
    await deleteMail(selectedId);
    message.success("Deleted");
    setSelectedId(undefined);
    await messagesQ.refetch();
  };

  const doDownload = async (attId: string, name?: string) => {
    if (!selectedId) return;
    const blob = await downloadAttachment(selectedId, attId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "attachment";
    a.click();
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const doPreview = async (attId: string, name: string, contentType: string, size: number) => {
    if (!selectedId) return;
    try {
      const blob = await downloadAttachment(selectedId, attId);
      const url = window.URL.createObjectURL(blob);

      let fileType: UserDocument["fileType"] = "text";
      const ct = (contentType || "").toLowerCase();
      const nameLower = (name || "").toLowerCase();

      if (ct.startsWith("image/")) {
        fileType = "image";
      } else if (ct === "application/pdf") {
        fileType = "pdf";
      } else if (ct.includes("word") || nameLower.endsWith(".doc") || nameLower.endsWith(".docx")) {
        fileType = "docx";
      } else if (ct.includes("csv") || nameLower.endsWith(".csv")) {
        fileType = "csv";
      } else if (ct.includes("excel") || ct.includes("sheet") || nameLower.endsWith(".xls") || nameLower.endsWith(".xlsx")) {
        fileType = "excel";
      } else if (
        ct.includes("text/") ||
        ct.includes("json") ||
        ct.includes("javascript") ||
        nameLower.endsWith(".txt") ||
        nameLower.endsWith(".log") ||
        nameLower.endsWith(".json") ||
        nameLower.endsWith(".md")
      ) {
        fileType = "text";
      }

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
      message.error("Failed to load preview");
    }
  };

  const doSend = async () => {
    const to = composeTo.split(",").map((s) => s.trim()).filter(Boolean);
    const cc = composeCc.split(",").map((s) => s.trim()).filter(Boolean);
    const bcc = composeBcc.split(",").map((s) => s.trim()).filter(Boolean);

    if (to.length === 0) return message.error("Add at least one To recipient");

    await sendMail({
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject: composeSubject || "(no subject)",
      body: composeBody || "",
      bodyType: "Text",
    });

    message.success("Mail sent");
    setComposeOpen(false);
    setComposeTo("");
    setComposeCc("");
    setComposeBcc("");
    setComposeSubject("");
    setComposeBody("");
    await messagesQ.refetch();
  };

  const doQuickAction = async () => {
    if (!selectedId) return;
    if (!replyOpen) return;

    if (replyOpen === "reply") {
      await replyMail(selectedId, replyText);
      message.success("Replied");
    } else if (replyOpen === "replyAll") {
      await replyAllMail(selectedId, replyText);
      message.success("Replied all");
    } else if (replyOpen === "forward") {
      const to = forwardTo.split(",").map((s) => s.trim()).filter(Boolean);
      if (!to.length) return message.error("Add Forward To recipients");
      await forwardMail(selectedId, { to, comment: replyText });
      message.success("Forwarded");
    }

    setReplyOpen(null);
    setReplyText("");
    setForwardTo("");
  };

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
        {/* Folders */}
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

                    {/* ✅ Unread count beside folder */}
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

        <Content style={{ background: "transparent" }}>
          <div className="grid grid-cols-[420px_1fr] gap-4 h-full min-h-0">
            {/* Message list */}
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
            <div className="bg-[#F7F7F7] rounded-[16px] p-4 overflow-auto min-h-0">
              {!selectedId ? (
                <div className="h-full flex items-center justify-center text-[#999]">Select a message</div>
              ) : msgQ.isLoading ? (
                <Spin />
              ) : (
                <>
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
                        <Button danger icon={<Trash2 className="w-4 h-4" />} onClick={doDelete} />
                      </Tooltip>
                    </Space>
                  </div>

                  <Divider />

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
                        Images are blocked (click “Load images”)
                      </Text>
                    ) : null}
                  </div>

                  {bodyView === "html" ? (
                    htmlBody ? (
                      <div
                        className="mail-html rounded-[12px] bg-white p-4 ring-1 ring-black/5"
                        dangerouslySetInnerHTML={{ __html: htmlBody }}
                      />
                    ) : (
                      <div className="rounded-[12px] bg-white p-4 ring-1 ring-black/5 text-[#777]">
                        No HTML content (switch to Text)
                      </div>
                    )
                  ) : (
                    <div className="rounded-[12px] bg-white p-4 ring-1 ring-black/5 whitespace-pre-wrap text-[13px] leading-6">
                      {textBody}
                    </div>
                  )}

                  <Divider />

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

                          <Space>
                            <Button onClick={() => doPreview(a.id, a.name, a.contentType, a.size)}>Preview</Button>
                            <Button onClick={() => doDownload(a.id, a.name)}>Download</Button>
                          </Space>
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
                  `}</style>
                </>
              )}
            </div>
          </div>
        </Content>
      </Layout>

      {/* Compose */}
      <Modal title="Compose" open={composeOpen} onCancel={() => setComposeOpen(false)} onOk={doSend} okText="Send">
        <Space orientation="vertical" className="w-full" size={10}>
          <Input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="To (comma separated)" />
          <Input value={composeCc} onChange={(e) => setComposeCc(e.target.value)} placeholder="Cc (optional)" />
          <Input value={composeBcc} onChange={(e) => setComposeBcc(e.target.value)} placeholder="Bcc (optional)" />
          <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject" />
          <Input.TextArea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={6} placeholder="Message" />
        </Space>
      </Modal>

      {/* Quick reply / forward */}
      <Modal
        title={replyOpen ? (replyOpen === "forward" ? "Forward" : replyOpen === "replyAll" ? "Reply All" : "Reply") : ""}
        open={!!replyOpen}
        onCancel={() => setReplyOpen(null)}
        onOk={doQuickAction}
        okText="Send"
      >
        {replyOpen === "forward" && (
          <Input
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            placeholder="Forward To (comma separated)"
            className="mb-3"
          />
        )}
        <Input.TextArea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={6} placeholder="Message" />
      </Modal>

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
