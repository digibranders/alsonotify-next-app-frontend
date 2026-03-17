"use client";

import { useState, useRef } from "react";
import { Button, Tooltip, App, Avatar } from "antd";
import {
  X,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Eraser,
  Trash2,
  Send,
  Link,
  Heading3,
  Undo2,
  Redo2,
} from "lucide-react";
import dayjs from "dayjs";
import { RichTextEditor } from "../../common/RichTextEditor";
import { EmailInput, ContactOption } from "./EmailInput";
import { FormatBtn } from "./FormatBtn";
import { formatBytes } from "@/utils/format/fileFormatUtils";
import type { MailMessageDetail } from "@/services/mail";

interface EmailComposePaneProps {
  mode: "new" | "reply" | "replyAll" | "forward";
  originalMessage?: MailMessageDetail;
  currentUser: { name: string; email: string; avatar?: string };
  autocompleteOptions: ContactOption[];
  onSend: (data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    attachments?: File[];
  }) => Promise<void>;
  onDiscard: () => void;
}

function buildInitialTo(
  mode: string,
  msg?: MailMessageDetail,
  currentEmail?: string
): string[] {
  if (mode === "new" || mode === "forward") return [];
  const sender = msg?.from?.emailAddress?.address;
  return sender ? [sender] : [];
}

function buildInitialCc(
  mode: string,
  msg?: MailMessageDetail,
  currentEmail?: string
): string[] {
  if (mode !== "replyAll" || !msg) return [];
  const allRecipients = [
    ...(msg.toRecipients || []),
    ...(msg.ccRecipients || []),
  ];
  return allRecipients
    .map((r) => r.emailAddress?.address)
    .filter(
      (addr): addr is string =>
        !!addr &&
        addr !== currentEmail &&
        addr !== msg.from?.emailAddress?.address
    );
}

function buildInitialSubject(mode: string, msg?: MailMessageDetail): string {
  if (!msg?.subject) return "";
  const subject = msg.subject;
  if (mode === "forward") {
    return subject.toLowerCase().startsWith("fwd:")
      ? subject
      : `Fwd: ${subject}`;
  }
  if (mode === "reply" || mode === "replyAll") {
    return subject.toLowerCase().startsWith("re:")
      ? subject
      : `Re: ${subject}`;
  }
  return "";
}

function buildQuotedBody(mode: string, msg?: MailMessageDetail): string {
  if (mode === "new" || !msg) return "";
  const senderName = msg.from?.emailAddress?.name || "";
  const senderAddr = msg.from?.emailAddress?.address || "";
  const date = msg.receivedDateTime
    ? dayjs(msg.receivedDateTime).format("ddd, MMM D, YYYY [at] h:mm A")
    : "";

  const header =
    mode === "forward"
      ? `---------- Forwarded message ----------<br>From: ${senderName} &lt;${senderAddr}&gt;<br>Date: ${date}<br>Subject: ${msg.subject || ""}<br>`
      : `On ${date}, ${senderName} &lt;${senderAddr}&gt; wrote:`;

  return `<br><br><div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #555;">${header}<br><br>${msg.body?.content || ""}</div>`;
}

const MODE_LABELS: Record<string, string> = {
  new: "New Message",
  reply: "Reply",
  replyAll: "Reply All",
  forward: "Forward",
};

export function EmailComposePane({
  mode,
  originalMessage,
  currentUser,
  autocompleteOptions,
  onSend,
  onDiscard,
}: EmailComposePaneProps) {
  const { modal } = App.useApp();

  const [to, setTo] = useState<string[]>(
    buildInitialTo(mode, originalMessage, currentUser.email)
  );
  const [cc, setCc] = useState<string[]>(
    buildInitialCc(mode, originalMessage, currentUser.email)
  );
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(
    buildInitialSubject(mode, originalMessage)
  );
  const [body, setBody] = useState(buildQuotedBody(mode, originalMessage));

  const [showCc, setShowCc] = useState(cc.length > 0);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDirty = to.length > 0 || subject.trim() !== "" || body.trim() !== "" || files.length > 0;
  const canSend = to.length > 0 && !isSending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const currentSize = files.reduce((acc, f) => acc + f.size, 0);
      const newSize = newFiles.reduce((acc, f) => acc + f.size, 0);
      if ((currentSize + newSize) / (1024 * 1024) > 25) {
        alert("Total attachment size cannot exceed 25MB.");
        return;
      }
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend({ to, cc, bcc, subject, body, attachments: files });
    } catch {
      setIsSending(false);
    }
  };

  const handleDiscard = () => {
    if (isDirty && mode === "new") {
      modal.confirm({
        title: "Discard draft?",
        content: "Your message will be lost.",
        okText: "Discard",
        okType: "danger",
        cancelText: "Keep editing",
        onOk: onDiscard,
      });
    } else {
      onDiscard();
    }
  };

  return (
    <div className="bg-[#F7F7F7] rounded-[16px] flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEEEE] shrink-0">
        <div className="flex items-center gap-2">
          <Send size={16} className="text-[#ff3b3b]" />
          <span className="font-bold text-sm text-[#111111]">
            {MODE_LABELS[mode] || "New Message"}
          </span>
        </div>
        <Tooltip title="Discard">
          <button
            onClick={handleDiscard}
            className="p-1.5 rounded-full hover:bg-white ring-1 ring-black/5 transition-all text-[#434343] hover:text-[#ff3b3b]"
          >
            <Trash2 size={16} />
          </button>
        </Tooltip>
      </div>

      {/* From */}
      <div className="flex items-center px-4 py-2 border-b border-[#EEEEEE] text-xs shrink-0">
        <span className="text-[#999999] font-medium w-[40px] shrink-0">
          From
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            src={currentUser.avatar}
            size={20}
            className="bg-[#ff3b3b] text-white text-2xs shrink-0"
          >
            {currentUser.name?.[0] || "U"}
          </Avatar>
          <span className="text-[#434343] truncate">
            {currentUser.name}{" "}
            <span className="text-[#999999]">
              &lt;{currentUser.email}&gt;
            </span>
          </span>
        </div>
      </div>

      {/* To */}
      <div className="flex items-start px-4 py-1.5 border-b border-[#EEEEEE] shrink-0">
        <span className="text-xs text-[#999999] font-medium w-[40px] shrink-0 pt-1.5">
          To
        </span>
        <div className="flex-1 min-w-0">
          <EmailInput
            value={to}
            onChange={setTo}
            options={autocompleteOptions}
            placeholder=""
          />
        </div>
        <div className="pt-1.5 flex items-center gap-2 shrink-0">
          {!showCc && (
            <span
              role="button"
              onClick={() => setShowCc(true)}
              className="text-xs text-[#999999] hover:text-[#111111] hover:underline cursor-pointer"
            >
              Cc
            </span>
          )}
          {!showBcc && (
            <span
              role="button"
              onClick={() => setShowBcc(true)}
              className="text-xs text-[#999999] hover:text-[#111111] hover:underline cursor-pointer"
            >
              Bcc
            </span>
          )}
        </div>
      </div>

      {/* Cc */}
      {showCc && (
        <div className="flex items-center px-4 py-1.5 border-b border-[#EEEEEE] shrink-0">
          <span className="text-xs text-[#999999] font-medium w-[40px] shrink-0">
            Cc
          </span>
          <div className="flex-1 min-w-0">
            <EmailInput
              value={cc}
              onChange={setCc}
              options={autocompleteOptions}
            />
          </div>
        </div>
      )}

      {/* Bcc */}
      {showBcc && (
        <div className="flex items-center px-4 py-1.5 border-b border-[#EEEEEE] shrink-0">
          <span className="text-xs text-[#999999] font-medium w-[40px] shrink-0">
            Bcc
          </span>
          <div className="flex-1 min-w-0">
            <EmailInput
              value={bcc}
              onChange={setBcc}
              options={autocompleteOptions}
            />
          </div>
        </div>
      )}

      {/* Subject */}
      <div className="border-b border-[#EEEEEE] shrink-0">
        <div className="flex items-center px-4 py-2">
          <span className="text-xs text-[#999999] font-medium w-[40px] shrink-0">
            Subj
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent outline-none text-sm text-[#111111] placeholder:text-[#999999]"
          />
        </div>
      </div>

      {/* Rich text editor */}
      <div
        className="flex-1 overflow-y-auto min-h-0"
        onClick={() =>
          document
            .querySelector<HTMLElement>(".rich-text-editor")
            ?.focus()
        }
      >
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder="Write your message..."
          style={{
            minHeight: "100%",
            padding: "16px",
            fontSize: "var(--font-size-sm)",
            border: "none",
            borderRadius: "0",
          }}
        />
      </div>

      {/* Attachments */}
      {files.length > 0 && (
        <div className="shrink-0 px-4 py-2 border-t border-[#EEEEEE] flex flex-wrap gap-2 max-h-[100px] overflow-auto">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-white border border-[#EEEEEE] rounded-lg px-2 py-1 text-xs shadow-sm"
            >
              <Paperclip size={12} className="text-[#999999]" />
              <span className="truncate max-w-[150px] text-[#434343]">
                {file.name}
              </span>
              <span className="text-[#999999] text-xs">
                {formatBytes(file.size)}
              </span>
              <button
                onClick={() => removeFile(i)}
                className="text-[#999999] hover:text-[#ff3b3b] transition-colors ml-1"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="shrink-0 px-2 py-1.5 border-t border-[#EEEEEE] flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
        <Tooltip title="Undo">
          <button
            onClick={() => document.execCommand("undo")}
            type="button"
            className="p-1.5 rounded hover:bg-black/5 text-[#555] transition-colors"
          >
            <Undo2 size={15} strokeWidth={2} />
          </button>
        </Tooltip>
        <Tooltip title="Redo">
          <button
            onClick={() => document.execCommand("redo")}
            type="button"
            className="p-1.5 rounded hover:bg-black/5 text-[#555] transition-colors"
          >
            <Redo2 size={15} strokeWidth={2} />
          </button>
        </Tooltip>
        <div className="w-[1px] h-4 bg-[#EEEEEE] mx-1" />
        <FormatBtn icon={Bold} cmd="bold" title="Bold (Ctrl+B)" />
        <FormatBtn icon={Italic} cmd="italic" title="Italic (Ctrl+I)" />
        <FormatBtn icon={Underline} cmd="underline" title="Underline (Ctrl+U)" />
        <FormatBtn icon={Strikethrough} cmd="strikethrough" title="Strikethrough" />
        <div className="w-[1px] h-4 bg-[#EEEEEE] mx-1" />
        <FormatBtn icon={Heading3} cmd="heading" title="Heading" />
        <FormatBtn icon={AlignLeft} cmd="justifyLeft" title="Align Left" />
        <FormatBtn icon={AlignCenter} cmd="justifyCenter" title="Align Center" />
        <FormatBtn icon={AlignRight} cmd="justifyRight" title="Align Right" />
        <div className="w-[1px] h-4 bg-[#EEEEEE] mx-1" />
        <FormatBtn icon={List} cmd="list" title="Bullet List" />
        <FormatBtn icon={ListOrdered} cmd="insertOrderedList" title="Numbered List" />
        <FormatBtn icon={Quote} cmd="quote" title="Blockquote" />
        <FormatBtn icon={Code} cmd="code" title="Code" />
        <div className="w-[1px] h-4 bg-[#EEEEEE] mx-1" />
        <Tooltip title="Insert Link">
          <button
            onClick={() => {
              const url = prompt("Enter URL:");
              if (url) document.execCommand("createLink", false, url);
            }}
            type="button"
            className="p-1.5 rounded hover:bg-black/5 text-[#555] transition-colors"
          >
            <Link size={15} strokeWidth={2} />
          </button>
        </Tooltip>
        <FormatBtn icon={Eraser} cmd="removeFormat" title="Clear Formatting" />
      </div>

      {/* Footer — Send & Attach */}
      <div className="shrink-0 px-4 py-3 border-t border-[#EEEEEE] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            className="rounded-full px-6 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 font-semibold border-0"
            onClick={handleSend}
            loading={isSending}
            disabled={!canSend}
            icon={<Send size={14} />}
          >
            Send
          </Button>

          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <Tooltip title="Attach files (max 25MB total)">
            <button
              className="p-2 hover:bg-white rounded-full text-[#666666] transition-colors ring-1 ring-black/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} />
            </button>
          </Tooltip>
        </div>

        <Tooltip title="Discard draft">
          <button
            className="p-2 hover:bg-white rounded-full text-[#666666] transition-colors hover:text-[#ff3b3b]"
            onClick={handleDiscard}
          >
            <Trash2 size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
