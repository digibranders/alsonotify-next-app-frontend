'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MessageSquare, Paperclip, X, Send, Loader2, Eye, Download, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Mentions, App } from 'antd';
import { fileService } from '@/services/file.service';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';
import { UserDocument } from '@/types/domain';

interface AttachmentObject {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface ActivityItem {
  id: number;
  type: string;
  user: string;
  avatar: string;
  date: string;
  message: React.ReactNode;
  isSystem: boolean;
  attachments: AttachmentObject[];
  time?: string;
  category?: string;
  task?: string;
}

interface MentionOption {
  value: string;
  label: string;
  key: string;
}

interface ChatPanelProps {
  activityData: ActivityItem[];
  isLoadingActivities: boolean;
  messageText: string;
  setMessageText: (text: string) => void;
  attachments: File[];
  setAttachments: (files: File[]) => void;
  mentionOptions: MentionOption[];
  taskOptions: MentionOption[];
  activeMentionOptions: MentionOption[];
  onMentionSearch: (text: string, prefix: string) => void;
  onSendMessage: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditorKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onEditorSelectionJump: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
}

export function ChatPanel({
  activityData,
  isLoadingActivities,
  messageText,
  setMessageText,
  attachments,
  setAttachments,
  mentionOptions,
  taskOptions,
  activeMentionOptions,
  onMentionSearch,
  onSendMessage,
  onFileSelect,
  onEditorKeyDown,
  onEditorSelectionJump,
}: ChatPanelProps) {
  const { message } = App.useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [previewingIds, setPreviewingIds] = useState<Set<number>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activityData]);

  // File type detection utility
  const determineFileType = useCallback((
    fileName: string,
    contentType?: string
  ): UserDocument['fileType'] => {
    const ct = (contentType || '').toLowerCase();
    const name = fileName.toLowerCase();

    if (ct.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif|avif|heic|heif|jfif|pjpeg|pjp|apng|raw|cr2|nef|arw|dng)$/i.test(name)) return 'image';
    if (ct === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (ct.includes('word') || ct.includes('msword') || /\.(doc|docx|odt|rtf|pages)$/i.test(name)) return 'docx';
    if (ct.includes('excel') || ct.includes('sheet') || /\.(xls|xlsx|ods|numbers)$/i.test(name)) return 'excel';
    if (ct.includes('powerpoint') || ct.includes('presentation') || /\.(ppt|pptx|odp|key)$/i.test(name)) return 'powerpoint';
    if (ct.includes('csv') || name.endsWith('.csv')) return 'csv';
    if (/\.(js|ts|tsx|jsx|py|java|c|cpp|h|hpp|cs|php|rb|go|rs|swift|kt|scala|r|m|sh|bash|sql|dart|lua|perl|pl|vue|svelte)$/i.test(name)) return 'code';
    return 'text';
  }, []);

  const handlePreview = useCallback(async (file: AttachmentObject) => {
    if (previewingIds.has(file.id)) return;
    setPreviewingIds(prev => new Set(prev).add(file.id));

    try {
      const downloadUrl = await fileService.getDownloadUrl(file.id);
      if (!downloadUrl) throw new Error('Download URL not received');

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const fileType = determineFileType(file.file_name, file.file_type);

      setPreviewDoc({
        id: String(file.id),
        documentTypeId: 'requirement-attachment',
        documentTypeName: 'Requirement Attachment',
        fileName: file.file_name,
        fileSize: file.file_size || 0,
        fileUrl: blobUrl,
        uploadedDate: new Date().toISOString(),
        fileType,
        isRequired: false,
      });
    } catch (error) {
      console.error('Preview error:', error);
      message.error('Failed to open preview');
    } finally {
      setPreviewingIds(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  }, [determineFileType, previewingIds, message]);

  const handleDownload = useCallback(async (file: AttachmentObject) => {
    if (downloadingIds.has(file.id)) return;
    setDownloadingIds(prev => new Set(prev).add(file.id));

    try {
      const downloadUrl = await fileService.getDownloadUrl(file.id);
      if (!downloadUrl) throw new Error('Download URL not received');

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.file_name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      message.success(`Downloading ${file.file_name}`);
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download file');
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  }, [downloadingIds, message]);

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return (
    <div className={`border-l border-[#EEEEEE] flex flex-col bg-white rounded-tr-[24px] rounded-br-[24px] transition-all duration-300 relative ${isCollapsed ? 'w-[50px]' : 'w-[350px]'}`}>
      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-6 bg-white border border-[#EEEEEE] rounded-full p-1 shadow-sm hover:bg-[#F7F7F7] z-10"
      >
        {isCollapsed ? <ChevronsLeft size={14} /> : <ChevronsRight size={14} />}
      </button>

      {/* Drawer Header */}
      {!isCollapsed && (
        <div className="p-6 border-b border-[#EEEEEE]">
          <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#ff3b3b]" />
            Activity & Chat
          </h3>
          <p className="text-[12px] text-[#666666] font-['Inter:Regular',sans-serif] mt-1">
            Team collaboration and updates
          </p>
        </div>
      )}
      {isCollapsed && (
        <div className="p-4 border-b border-[#EEEEEE] flex justify-center">
          <MessageSquare className="w-5 h-5 text-[#ff3b3b]" />
        </div>
      )}

      {/* Activity Feed */}
      {!isCollapsed && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingActivities ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#ff3b3b]" />
            </div>
          ) : activityData.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activity.isSystem
                ? 'bg-[#F0F0F0]'
                : 'bg-gradient-to-br from-[#666666] to-[#999999]'
                }`}>
                <span className={`text-[11px] font-['Manrope:Bold',sans-serif] ${activity.isSystem ? 'text-[#999999]' : 'text-white'
                  }`}>
                  {activity.avatar}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`text-[13px] font-['Manrope:SemiBold',sans-serif] ${activity.isSystem ? 'text-[#999999]' : 'text-[#111111]'
                    }`}>
                    {activity.user}
                  </span>
                  <span className="text-[11px] text-[#999999] font-['Inter:Regular',sans-serif]">
                    {activity.date}
                  </span>
                </div>

                <div className={`${!activity.isSystem
                  ? 'bg-[#F7F7F7] p-3 rounded-[12px] rounded-tl-none'
                  : ''
                  }`}>
                  <p className="text-[13px] text-[#444444] font-['Inter:Regular',sans-serif]">
                    {activity.message}
                  </p>

                  {activity.type === 'worklog' && activity.time && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 rounded bg-white text-[#666666] text-[11px] font-mono border border-[#EEEEEE]">
                        {activity.time}
                      </span>
                      <span className="text-[11px] text-[#ff3b3b] font-['Inter:Medium',sans-serif]">
                        {activity.task}
                      </span>
                    </div>
                  )}

                  {activity.attachments && activity.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {activity.attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-[#EEEEEE] group/file">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Paperclip className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                            <span className="text-[11px] text-[#444444] truncate" title={file.file_name}>{file.file_name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handlePreview(file)}
                              className="p-1 rounded hover:bg-[#F0F0F0] text-[#666666] transition-colors disabled:opacity-50"
                              disabled={previewingIds.has(file.id)}
                              title="Preview"
                            >
                              {previewingIds.has(file.id) ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDownload(file)}
                              className="p-1 rounded hover:bg-[#FFF0F0] text-[#ff3b3b] transition-colors disabled:opacity-50"
                              disabled={downloadingIds.has(file.id)}
                              title="Download"
                            >
                              {downloadingIds.has(file.id) ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[#EEEEEE] bg-white">
          {attachments.length > 0 && (
            <div className="mb-3 space-y-1">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-[#EEEEEE]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Paperclip className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                    <span className="text-[11px] text-[#444444] truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                    className="p-1 hover:bg-[#FAFAFA] rounded transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-[#999999]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative border border-[#DDDDDD] rounded-[12px] bg-white">
            {/* Mirror Highlight Overlay */}
            <div
              className="absolute inset-0 p-3 pointer-events-none whitespace-pre-wrap break-words overflow-hidden"
              style={{
                zIndex: 1,
                color: '#111111',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                lineHeight: '20px',
                fontWeight: 400,
                letterSpacing: 'normal'
              }}
            >
              {(() => {
                const val = messageText;
                const result: React.ReactNode[] = [];
                let lastIndex = 0;

                const allUserNames = mentionOptions.map((o: MentionOption) => o.value).filter((n: string) => n && n.trim().length > 0);
                const allTaskNames = taskOptions.map((o: MentionOption) => o.value).filter((n: string) => n && n.trim().length > 0);

                if (allUserNames.length === 0 && allTaskNames.length === 0) return val;

                const escapedUserNames = allUserNames.map(escapeRegExp);
                const escapedTaskNames = allTaskNames.map(escapeRegExp);

                // Combined regex for both @users and #tasks
                const regexPatterns = [];
                if (escapedUserNames.length > 0) regexPatterns.push(`(@(${escapedUserNames.join('|')}))`);
                if (escapedTaskNames.length > 0) regexPatterns.push(`(#(${escapedTaskNames.join('|')}))`);

                const regex = new RegExp(regexPatterns.join('|'), 'g');
                let match;
                while ((match = regex.exec(val)) !== null) {
                  result.push(<span key={`text-${match.index}`}>{val.substring(lastIndex, match.index)}</span>);

                  const matchedToken = match[0];
                  const isTask = matchedToken.startsWith('#');

                  result.push(
                    <span
                      key={`mention-${match.index}`}
                      className={isTask ? "task-token-highlight" : "mention-token-highlight"}
                      style={isTask ? {
                        color: '#2F80ED',
                        backgroundColor: '#EBF3FF',
                        padding: '0 4px',
                        borderRadius: '4px',
                        fontWeight: 500
                      } : undefined}
                    >
                      {matchedToken}
                    </span>
                  );
                  lastIndex = match.index + matchedToken.length;
                }
                result.push(<span key={`text-end`}>{val.substring(lastIndex)}</span>);
                result.push(<span key="cursor-end" className="opacity-0">.</span>);
                return result;
              })()}
            </div>

            <Mentions
              value={messageText}
              onChange={(val) => setMessageText(val)}
              onKeyDown={onEditorKeyDown}
              onKeyUp={onEditorSelectionJump}
              onMouseUp={onEditorSelectionJump}
              onSearch={onMentionSearch}
              placeholder="Type a message... Use @ for people, # for tasks"
              className="w-full min-h-[80px] rounded-[12px] bg-transparent focus:outline-none resize-none relative z-[2] mentions-textarea-custom !text-transparent !border-none !shadow-none"
              style={{
                color: 'transparent',
                caretColor: '#111111',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                lineHeight: '20px',
                fontWeight: 400,
                letterSpacing: 'normal'
              }}
              options={activeMentionOptions}
              prefix={['@', '#']}
              rows={3}
            />

            <div className="absolute bottom-3 right-3 flex gap-2 z-10">
              <label htmlFor="chat-file-upload" className="cursor-pointer text-[#999999] hover:text-[#666666] transition-colors">
                <Paperclip className="w-4 h-4" />
                <input
                  id="chat-file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.pages,.numbers,.key,.txt,.md,.json,.xml,.yaml,.yml,.csv,.log,.ini,.cfg,.conf,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.php,.rb,.go,.rs,.swift,.html,.css,.scss,.sass,.less,.vue,.svelte,.sh,.bash,.sql,.r,.m,.kt,.scala,.dart,.lua,.perl,.pl,.zip,.rar,.7z,.tar,.gz,.bz2,.xz,.tgz,.tbz2,.zipx,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.ico,.tiff,.tif,.avif,.heic,.heif,.jfif,.pjpeg,.pjp,.apng,.raw,.cr2,.nef,.arw,.dng,.mp3,.wav,.ogg,.flac,.aac,.m4a,.wma,.opus,.ape,.alac,.mp4,.webm,.avi,.mov,.wmv,.flv,.mkv,.m4v,.mpg,.mpeg,.3gp,.ogv,.obj,.fbx,.stl,.dae,.gltf,.glb,.blend,.3ds,.max,.dwg,.dxf,.step,.stp,.iges,.igs,.ttf,.otf,.woff,.woff2,.eot,.epub,.mobi,.azw,.azw3,.sketch,.fig,.xd,.ai,.psd,.eps,.indd,.db,.sqlite,.mdb,.accdb,.parquet,.ics,.vcf,.torrent"
                  onChange={onFileSelect}
                />
              </label>
              <button
                onClick={onSendMessage}
                disabled={!messageText.trim() && attachments.length === 0}
                className="text-[#ff3b3b] hover:text-[#E03131] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      <DocumentPreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
}
