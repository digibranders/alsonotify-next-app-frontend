'use client';

import { useState, useRef, useCallback } from 'react';
import { Popover, App, Tooltip } from 'antd';
import {
  Send, Bold, Italic, Underline, List, ListOrdered,
  Code, Smile, Paperclip, X, Reply, Plus,
  CalendarClock, Video, Clock, Mic,
} from 'lucide-react';
import type { TeamsChatMessage } from '@/services/teams';
import { FormatIcon } from './FormatIcon';

interface TeamsMessageInputProps {
  onSend: (content: string, contentType: 'html' | 'text') => void;
  isSending: boolean;
  replyingTo?: TeamsChatMessage | null;
  onCancelReply?: () => void;
}

const EMOJI_LIST = [
  '\uD83D\uDC4D', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDE0A', '\uD83D\uDE22', '\uD83D\uDE21',
  '\uD83D\uDE2E', '\uD83D\uDE4F', '\uD83D\uDD25', '\uD83C\uDF89', '\uD83D\uDCAF', '\u2705',
  '\u274C', '\uD83D\uDC40', '\uD83D\uDCA1', '\uD83D\uDCAA', '\uD83D\uDE80', '\u2B50',
  '\uD83C\uDF1F', '\uD83D\uDC4B', '\uD83D\uDE4C', '\uD83E\uDD14', '\uD83D\uDCDD', '\uD83D\uDCC8',
];

function ToolbarIcon({
  icon: Icon,
  title,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={title} placement="top">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
          disabled
            ? 'text-[#CCCCCC] cursor-not-allowed'
            : 'text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] cursor-pointer'
        }`}
      >
        <Icon size={16} />
      </button>
    </Tooltip>
  );
}

export function TeamsMessageInput({
  onSend,
  isSending,
  replyingTo,
  onCancelReply,
}: TeamsMessageInputProps) {
  const { message: toast } = App.useApp();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showFormatBar, setShowFormatBar] = useState(false);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.textContent?.trim() || '';
      setIsEmpty(text.length === 0);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!editorRef.current || isEmpty) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.textContent?.trim() || '';
    if (!text) return;

    const hasFormatting = html !== text && html.includes('<');
    onSend(hasFormatting ? html : text, hasFormatting ? 'html' : 'text');

    editorRef.current.innerHTML = '';
    setIsEmpty(true);
  }, [isEmpty, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const execCommand = (cmd: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false);
  };

  const insertEmoji = (emoji: string) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, emoji);
    handleInput();
  };

  const emojiContent = (
    <div className="grid grid-cols-6 gap-1 w-[200px]">
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          onClick={() => insertEmoji(emoji)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F7F7F7] transition-colors text-lg cursor-pointer"
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  const moreMenuItems = [
    { icon: Paperclip, label: 'Attach file', onClick: () => toast.info('Attach file coming soon') },
    { icon: CalendarClock, label: 'Schedule message', onClick: () => toast.info('Schedule message coming soon') },
    { icon: Clock, label: 'Set delivery options', onClick: () => toast.info('Delivery options coming soon') },
    { icon: Video, label: 'Schedule meeting', onClick: () => toast.info('Schedule meeting coming soon') },
    { icon: Mic, label: 'Record video clip', onClick: () => toast.info('Record video coming soon') },
  ];

  const moreContent = (
    <div className="flex flex-col w-[220px] py-1">
      {moreMenuItems.map((item) => (
        <button
          key={item.label}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#111111] hover:bg-[#F7F7F7] transition-colors cursor-pointer text-left"
          onClick={item.onClick}
        >
          <item.icon size={16} className="text-[#666666] shrink-0" />
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="border-t border-[#EEEEEE] shrink-0">
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] border-b border-[#EEEEEE]">
          <Reply size={14} className="text-[#999999] shrink-0" />
          <span className="text-xs text-[#999999] truncate flex-1">
            Replying to <strong className="text-[#666666]">{replyingTo.from?.user?.displayName || 'Unknown'}</strong>
            {': '}
            {replyingTo.body.content.replace(/<[^>]*>/g, '').substring(0, 60)}
          </span>
          <button
            onClick={onCancelReply}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[#EEEEEE] text-[#999999] cursor-pointer shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Formatting bar (toggle) */}
      {showFormatBar && (
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[#F7F7F7] bg-[#FAFAFA]">
          <ToolbarIcon icon={Bold} title="Bold" onClick={() => execCommand('bold')} />
          <ToolbarIcon icon={Italic} title="Italic" onClick={() => execCommand('italic')} />
          <ToolbarIcon icon={Underline} title="Underline" onClick={() => execCommand('underline')} />
          <div className="w-px h-4 bg-[#EEEEEE] mx-0.5" />
          <ToolbarIcon icon={List} title="Bullet list" onClick={() => execCommand('insertUnorderedList')} />
          <ToolbarIcon icon={ListOrdered} title="Numbered list" onClick={() => execCommand('insertOrderedList')} />
          <ToolbarIcon icon={Code} title="Code" disabled />
        </div>
      )}

      {/* Editor area */}
      <div className="px-4 py-2">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          data-placeholder="Type a message"
          className="teams-input-editor min-h-[36px] max-h-[140px] overflow-y-auto text-sm text-[#111111] leading-relaxed outline-none"
          suppressContentEditableWarning
        />
      </div>

      {/* Bottom icon bar — Teams style: format toggle left, emoji/attach/plus/send right */}
      <div className="flex items-center justify-between px-3 pb-2.5 pt-0">
        {/* Left: Format toggle */}
        <Tooltip title={showFormatBar ? 'Hide formatting' : 'Format'}>
          <button
            onClick={() => setShowFormatBar(!showFormatBar)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
              showFormatBar
                ? 'text-[#ff3b3b] bg-[#FEF3F2]'
                : 'text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]'
            }`}
          >
            <FormatIcon size={18} />
          </button>
        </Tooltip>

        {/* Right: Emoji, Attach, More, Send */}
        <div className="flex items-center gap-0.5">
          <Popover content={emojiContent} trigger="click" placement="topRight" arrow={false}>
            <div>
              <ToolbarIcon icon={Smile} title="Emoji" />
            </div>
          </Popover>
          <ToolbarIcon icon={Paperclip} title="Attach file (coming soon)" disabled />
          <Popover content={moreContent} trigger="click" placement="top" arrow={false}>
            <div>
              <ToolbarIcon icon={Plus} title="More options" />
            </div>
          </Popover>
          <Tooltip title="Send (Enter)">
            <button
              onClick={handleSend}
              disabled={isEmpty || isSending}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                isEmpty || isSending
                  ? 'text-[#CCCCCC] cursor-not-allowed'
                  : 'text-[#ff3b3b] hover:bg-[#FEF3F2] cursor-pointer'
              }`}
            >
              <Send size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
