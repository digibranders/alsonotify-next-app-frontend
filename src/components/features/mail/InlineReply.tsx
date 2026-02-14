import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button, Avatar, Tooltip } from 'antd';
import {
  Bold, Italic,
  List,
  Paperclip, Image as ImageIcon, Smile,
  Trash2, Forward, X
} from 'lucide-react';
import { RichTextEditor, formatText } from '../../common/RichTextEditor';
import dayjs from 'dayjs';

interface InlineReplyProps {
  originalMessage: any;
  onSend: (data: { body: string; to: string[]; cc: string[]; subject: string; attachments?: File[] }) => Promise<void>;
  onDiscard: () => void;
  currentUser: { name: string; email: string; avatar?: string };
}

export interface InlineReplyRef {
  activate: (type: 'reply' | 'replyAll' | 'forward') => void;
}

export const InlineReply = forwardRef<InlineReplyRef, InlineReplyProps>(({ originalMessage, onSend, onDiscard, currentUser }, ref) => {
  const [responseType, setResponseType] = useState<'reply' | 'replyAll' | 'forward'>('reply');
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    activate: (type) => {
      setResponseType(type);
      setIsFocused(true);
      // Determine subject prefix
      let subject = "";
      if (type === 'forward') {
        subject = `Fwd: ${originalMessage.subject}`;
      } else {
        subject = `Re: ${originalMessage.subject}`;
      }
      // Scroll into view
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }));

  // Determine recipients based on type
  const getRecipients = () => {
    // Basic logic - can be expanded to be editable
    const to = [originalMessage.from?.emailAddress?.address].filter(Boolean);
    const cc = responseType === 'replyAll'
      ? (originalMessage.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean)
      : [];
    return { to, cc };
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const { to, cc } = getRecipients();
      // Append quoted text logic here if needed, or backend does it.
      // For inline, we usually just send the new body and backend appends history?
      // OR we mimic Gmail and append it hidden.

      let finalBody = body;

      // Gmail style quote block
      const quoteHeader = `On ${dayjs(originalMessage.receivedDateTime).format("ddd, MMM D, YYYY at h:mm A")} ${originalMessage.from?.emailAddress?.name} <${originalMessage.from?.emailAddress?.address}> wrote:`;
      const quoteBlock = `
          <div class="gmail_quote">
             <div dir="ltr">${quoteHeader}</div>
             <blockquote style="margin: 0 0 0 .8ex; border-left: 1px #ccc solid; padding-left: 1ex;">
                ${originalMessage.body?.content || ""}
             </blockquote>
          </div>
        `;

      finalBody += quoteBlock;

      const subjectPrefix = responseType === 'forward' ? 'Fwd:' : 'Re:';
      let subject = originalMessage.subject || "";
      if (!subject.toLowerCase().startsWith(subjectPrefix.toLowerCase())) {
        subject = `${subjectPrefix} ${subject}`;
      }

      await onSend({
        body: finalBody,
        to: responseType === 'forward' ? [] : to, // Forward starts empty
        cc: responseType === 'forward' ? [] : cc,
        subject: subject,
        attachments: files
      });

      // Reset
      setBody("");
      setFiles([]);
      setIsFocused(false);

    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleDiscard = () => {
    setBody("");
    setIsFocused(false);
    onDiscard?.();
  };

  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const currentSize = files.reduce((acc, f) => acc + f.size, 0);
      const newSize = newFiles.reduce((acc, f) => acc + f.size, 0);

      if ((currentSize + newSize) / (1024 * 1024) > 25) {
        alert("Total attachment size cannot exceed 25MB.");
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const v = bytes / Math.pow(k, i);
    return `${v.toFixed(1)} ${sizes[i]}`;
  };

  const FormatBtn = ({ icon: Icon, cmd, title }: any) => (
    <Tooltip title={title}>
      <button
        onClick={(e) => { e.preventDefault(); formatText(cmd); }}
        className="p-1.5 rounded hover:bg-black/5 text-[#555] transition-colors"
      >
        <Icon size={16} />
      </button>
    </Tooltip>
  );

  return (
    <div ref={containerRef} className={`
        flex items-start gap-3 p-2 transition-all duration-200
        ${isFocused ? 'bg-white rounded-[12px] shadow-sm ring-1 ring-black/5' : 'bg-[#F7F7F7] rounded-[24px] cursor-text'}
    `}>
      <div className="shrink-0 mt-1">
        <Avatar
          src={currentUser.avatar}
          size={32}
          className="bg-[#0B57D0]"
        >
          {currentUser.name?.[0] || "U"}
        </Avatar>
      </div>

      <div className="flex-1 min-w-0" onClick={() => !isFocused && setIsFocused(true)}>

        {/* Collapsed View (Placeholder) */}
        {!isFocused && (
          <div className="py-1.5 text-[#555] text-[14px]">Reply to {originalMessage.from?.emailAddress?.name || "Sender"}...</div>
        )}

        {/* Expanded View */}
        {isFocused && (
          <div className="flex flex-col animate-in fade-in duration-200">
            {/* Recipient Header (Collapsed by default, click to expand) */}
            <div
              className="flex items-center gap-2 mb-2 text-[12px] text-[#555] cursor-pointer hover:bg-black/5 p-1 rounded -ml-1 w-fit"
              onClick={() => setShowRecipients(!showRecipients)}
            >
              <span className="font-semibold text-[#111] flex items-center gap-1">
                <div className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10">
                  <Forward size={12} className="rotate-180" /> {/* Back arrow ish */}
                </div>
                {responseType === 'reply' ? 'Reply' : responseType === 'replyAll' ? 'Reply All' : 'Forward'}
              </span>
              <span>
                to {originalMessage.from?.emailAddress?.name || "Sender"}
                {responseType === 'replyAll' && (originalMessage.ccRecipients?.length ? ` and ${originalMessage.ccRecipients.length} others` : "")}
              </span>
            </div>

            {showRecipients && (
              <div className="mb-2 p-2 bg-[#f0f0f0] rounded text-[12px]">
                {/* Full recipient editing would go here (To/Cc/Bcc) */}
                <div>To: {originalMessage.from?.emailAddress?.address}</div>
              </div>
            )}

            {/* Editor */}
            <div className="min-h-[100px] mb-2 relative">
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder=""
                style={{
                  minHeight: '100px',
                  padding: '0',
                  background: 'transparent'
                }}
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mb-2 px-2 flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1 text-[12px] shadow-sm">
                    <Paperclip size={12} className="text-gray-400" />
                    <span className="truncate max-w-[150px] text-[#333]">{file.name}</span>
                    <span className="text-gray-400 text-[10px]">{formatBytes(file.size)}</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0]">
              <div className="flex items-center gap-2">
                <Button
                  type="primary"
                  className="rounded-full px-6 bg-[#0B57D0] hover:bg-[#0B57D0]/90 font-semibold"
                  onClick={handleSend}
                  loading={isSending}
                  disabled={!body.trim()}
                >
                  Send
                </Button>
                <div className="w-[1px] h-5 bg-gray-200 mx-1" />
                <FormatBtn icon={Bold} cmd="bold" title="Bold" />
                <FormatBtn icon={Italic} cmd="italic" title="Italic" />
                <FormatBtn icon={List} cmd="insertUnorderedList" title="List" />
                <FormatBtn icon={Smile} cmd="emoji" title="Emoji" />
                <FormatBtn icon={ImageIcon} cmd="image" title="Image" />
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <Tooltip title="Attach files">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded hover:bg-black/5 text-[#555] transition-colors"
                  >
                    <Paperclip size={16} />
                  </button>
                </Tooltip>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={handleDiscard} className="p-2 hover:bg-black/5 rounded text-[#555]">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

InlineReply.displayName = "InlineReply";
