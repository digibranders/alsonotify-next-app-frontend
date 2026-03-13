import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Input, Tooltip, ConfigProvider } from 'antd';
import {
  X, Minimize2, Maximize2, Paperclip, Image as ImageIcon, Trash2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Code, Eraser, Smile
} from 'lucide-react';
import { RichTextEditor } from '../../common/RichTextEditor';
import { EmailInput, ContactOption } from './EmailInput';
import { FormatBtn } from './FormatBtn';

interface EmailComposeModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { to: string[]; cc: string[]; bcc: string[]; subject: string; body: string; attachments?: File[] }) => Promise<void>;
  initialData?: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
  };
  autocompleteOptions: ContactOption[];
}

// Internal component to handle form state and logic
// This allows us to use 'initialData' only for initialization without syncing effects
function EmailComposeForm({
  onClose,
  onSend,
  initialData,
  autocompleteOptions,
  isMaximized,
  toggleMaximize,
  isMobile
}: {
  onClose: () => void;
  onSend: (data: { to: string[]; cc: string[]; bcc: string[]; subject: string; body: string; attachments?: File[] }) => Promise<void>;
  initialData?: EmailComposeModalProps['initialData'];
  autocompleteOptions: ContactOption[];
  isMaximized: boolean;
  toggleMaximize: () => void;
  isMobile: boolean;
}) {
  // Initialize state directly from props (Mounts fresh every time due to destroyOnHidden in parent)
  const [to, setTo] = useState<string[]>(initialData?.to || []);
  const [cc, setCc] = useState<string[]>(initialData?.cc || []);
  const [bcc, setBcc] = useState<string[]>(initialData?.bcc || []);
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [body, setBody] = useState(initialData?.body || "");

  const [showCc, setShowCc] = useState(!!initialData?.cc?.length);
  const [showBcc, setShowBcc] = useState(!!initialData?.bcc?.length);
  const [isSending, setIsSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);

      // Calculate total size including existing files
      const currentSize = files.reduce((acc, f) => acc + f.size, 0);
      const newSize = newFiles.reduce((acc, f) => acc + f.size, 0);
      const totalSizeMB = (currentSize + newSize) / (1024 * 1024);

      if (totalSizeMB > 25) {
        alert("Total attachment size cannot exceed 25MB.");
        return;
      }

      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const v = bytes / Math.pow(k, i);
    return `${v.toFixed(1)} ${sizes[i]}`;
  };

  const handleSendClick = async () => {
    setIsSending(true);
    try {
      await onSend({ to, cc, bcc, subject, body, attachments: files });
      onClose();
    } catch {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`flex flex-col bg-white overflow-hidden transition-all duration-200 pointer-events-auto
        ${isMobile ? 'h-[100vh] w-full rounded-none' : ''}
        ${!isMobile && isMaximized ? 'h-[85vh] rounded-xl shadow-2xl border border-gray-200' : ''}
        ${!isMobile && !isMaximized ? 'h-[80vh] rounded-xl shadow-xl border border-gray-200' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-[#f0f0f0] shrink-0">
        <span className="font-bold text-sm text-[#111]">New Message</span>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-black/5 rounded text-[#555]" onClick={toggleMaximize}>
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button className="p-1 hover:bg-black/5 rounded text-[#555]" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="flex-col shrink-0">
        {/* To */}
        <div className="flex items-start px-2 py-1 border-b border-[#f0f0f0] group focus-within:ring-1 focus-within:ring-blue-100 z-10 relative">
          <span className="text-sm text-[#555] pt-1.5 pl-2 w-[40px] shrink-0">To</span>
          <div className="flex-1 min-w-0">
            <EmailInput
              value={to}
              onChange={setTo}
              options={autocompleteOptions}
              placeholder=""
            />
          </div>
          <div className="pt-1.5 pr-2 flex items-center gap-2">
            {!showCc && <span role="button" onClick={() => setShowCc(true)} className="text-xs text-[#555] hover:underline cursor-pointer">Cc</span>}
            {!showBcc && <span role="button" onClick={() => setShowBcc(true)} className="text-xs text-[#555] hover:underline cursor-pointer">Bcc</span>}
          </div>
        </div>

        {/* Cc */}
        {showCc && (
          <div className="flex items-center px-2 py-1 border-b border-[#f0f0f0]">
            <span className="text-sm text-[#555] pl-2 w-[40px] shrink-0">Cc</span>
            <EmailInput
              value={cc}
              onChange={setCc}
              options={autocompleteOptions}
            />
          </div>
        )}

        {/* Bcc */}
        {showBcc && (
          <div className="flex items-center px-2 py-1 border-b border-[#f0f0f0]">
            <span className="text-sm text-[#555] pl-2 w-[40px] shrink-0">Bcc</span>
            <EmailInput
              value={bcc}
              onChange={setBcc}
              options={autocompleteOptions}
            />
          </div>
        )}

        {/* Subject */}
        <div className="border-b border-[#f0f0f0]">
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            variant="borderless"
            className="px-4 py-2.5 text-sm !border-0 !shadow-none !bg-transparent hover:!bg-transparent focus:!bg-transparent"
          />
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto flex flex-col relative" onClick={() => document.querySelector<HTMLElement>('.rich-text-editor')?.focus()}>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder=""
          style={{
            minHeight: '100%',
            padding: '16px',
            fontSize: "var(--font-size-sm)"
          }}
        />
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="shrink-0 px-4 py-2 border-t border-[#f0f0f0] bg-gray-50 flex flex-wrap gap-2 max-h-[100px] overflow-auto">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow-sm">
              <Paperclip size={12} className="text-gray-400" />
              <span className="truncate max-w-[150px] text-[#333]">{file.name}</span>
              <span className="text-gray-400 text-xxs">{formatBytes(file.size)}</span>
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

      {/* Formatting Toolbar */}
      <div className="shrink-0 px-2 py-2 border-t border-[#f0f0f0] flex items-center gap-1 overflow-x-auto scrollbar-hide bg-white">
        <FormatBtn icon={Bold} cmd="bold" title="Bold" />
        <FormatBtn icon={Italic} cmd="italic" title="Italic" />
        <FormatBtn icon={Underline} cmd="underline" title="Underline" />
        <div className="w-[1px] h-4 bg-gray-200 mx-1" />
        <FormatBtn icon={AlignLeft} cmd="justifyLeft" title="Align Left" />
        <FormatBtn icon={AlignCenter} cmd="justifyCenter" title="Align Center" />
        <FormatBtn icon={AlignRight} cmd="justifyRight" title="Align Right" />
        <div className="w-[1px] h-4 bg-gray-200 mx-1" />
        <FormatBtn icon={List} cmd="list" title="Bullet List" />
        <FormatBtn icon={ListOrdered} cmd="insertOrderedList" title="Numbered List" />
        <FormatBtn icon={Quote} cmd="quote" title="Quote" />
        <FormatBtn icon={Code} cmd="code" title="Code Block" />
        <div className="w-[1px] h-4 bg-gray-200 mx-1" />
        <FormatBtn icon={Eraser} cmd="removeFormat" title="Remove Formatting" />
      </div>

      {/* Footer (Send & Attach) */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            className="rounded-full px-6 bg-[#0B57D0] hover:bg-[#0B57D0]/90 font-semibold"
            onClick={handleSendClick}
            loading={isSending}
          >
            Send
          </Button>

          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <Tooltip title="Attach files (max 25MB total)">
            <button
              className="p-2 hover:bg-black/5 rounded-full text-[#555] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={18} />
            </button>
          </Tooltip>
          <Tooltip title="Insert image (demo)">
            <button className="p-2 hover:bg-black/5 rounded-full text-[#555] transition-colors">
              <ImageIcon size={18} />
            </button>
          </Tooltip>
          <Tooltip title="Insert emoji (demo)">
            <button className="p-2 hover:bg-black/5 rounded-full text-[#555] transition-colors">
              <Smile size={18} />
            </button>
          </Tooltip>
        </div>

        <div>
          <Tooltip title="Discard draft">
            <button className="p-2 hover:bg-black/5 rounded text-[#555] transition-colors hover:text-red-500" onClick={onClose}>
              <Trash2 size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export function EmailComposeModal({ open, onClose, onSend, initialData, autocompleteOptions }: EmailComposeModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Responsive width tracking
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Calculate modal styles based on state
  const getModalStyles = () => {
    if (isMobile) {
      return {
        top: 0,
        margin: 0,
        maxWidth: '100vw',
        height: '100vh',
        width: '100%',
      };
    }

    if (isMaximized) {
      // Gmail Expanded Style: Large centered, rounded, shadow, not full screen edge-to-edge
      return {
        top: undefined, // Let Ant Design center it
        margin: '0 auto',
        maxWidth: '96vw', // Slightly wider for better space
        width: '90vw',
        height: '85vh',
        paddingBottom: 0
      };
    }

    // Normal State (Now centered and larger as requested)
    return {
      top: undefined,
      margin: '0 auto',
      maxWidth: '96vw',
      width: 800, // Increased from 600
      height: '80vh', // Fixed height for spacious feel
      paddingBottom: 0
    };
  };

  const modalStyles = getModalStyles();

  return (
    <ConfigProvider
      theme={{
        components: {
          Modal: {
            contentBg: 'transparent',
            boxShadow: 'none',
          },
        },
      }}
    >
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        closable={false}
        centered={!isMobile} // Center both states on desktop
        mask={{ closable: false }}
        destroyOnHidden={true} // PRO TIP: This forces the child to unmount when closed, resetting state naturally
        styles={{
          body: { padding: 0 },
          mask: {
            backgroundColor: 'rgba(0,0,0,0.45)', // Consistent dimmed color
            backdropFilter: 'blur(4px)', // Add blur effect
            WebkitBackdropFilter: 'blur(4px)',
          }
        }}
        wrapClassName="clean-modal-wrapper" // Remove pointer-events-none as we now have a blocking mask
        getContainer={false} // Optional: keep in place if needed, or remove. keeping standard.
        style={{
          top: modalStyles.top,
          margin: modalStyles.margin,
          maxWidth: modalStyles.maxWidth,
          paddingBottom: 0
        }}
        width={modalStyles.width}
      >
        <EmailComposeForm
          // Key is generally not needed with destroyOnHidden for close/open cycles,
          // but if initialData can change while OPEN, a key ensures full re-init.
          key={initialData ? JSON.stringify(initialData) : 'default'}
          onClose={onClose}
          onSend={onSend}
          initialData={initialData}
          autocompleteOptions={autocompleteOptions}
          isMaximized={isMaximized}
          toggleMaximize={() => setIsMaximized(prev => !prev)}
          isMobile={isMobile}
        />
      </Modal>
    </ConfigProvider >
  );
}
