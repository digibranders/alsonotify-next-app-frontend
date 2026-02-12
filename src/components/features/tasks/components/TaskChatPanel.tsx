'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Paperclip, X, Send, Loader2, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { App } from 'antd';
import { format } from 'date-fns';
import { useTaskActivities, useCreateTaskActivity } from '@/hooks/useTaskActivity';
import { fileService } from '@/services/file.service';

interface TaskChatPanelProps {
  taskId: number;
}

export function TaskChatPanel({ taskId }: TaskChatPanelProps) {
  const { data: activitiesData, isLoading: isLoadingActivities } = useTaskActivities(taskId);
  const { mutate: createActivity, isPending: isSending } = useCreateTaskActivity();

  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activities = activitiesData?.result || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  const { message } = App.useApp();

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachments.length === 0) return;

    try {
      let uploadedAttachmentIds: number[] = [];

      if (attachments.length > 0) {
        message.loading({ content: 'Uploading attachments...', key: 'task-upload' });

        try {
          const uploadPromises = attachments.map(file =>
            fileService.uploadFile(file, 'TASK', taskId)
          );

          const uploadedFiles = await Promise.all(uploadPromises);
          uploadedAttachmentIds = uploadedFiles.map(f => f.id);

          message.success({ content: 'Attachments uploaded!', key: 'task-upload' });
        } catch (error) {
          console.error("Upload failed", error);
          message.error({ content: 'Failed to upload attachments', key: 'task-upload' });
          return; // Stop if upload fails
        }
      }

      createActivity({
        task_id: taskId,
        message: messageText,
        type: attachments.length > 0 ? 'FILE' : 'CHAT',
        attachment_ids: uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined
      }, {
        onSuccess: () => {
          setMessageText('');
          setAttachments([]);
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxSize = 25 * 1024 * 1024; // 25MB

      // Validate file sizes
      const oversizedFiles = files.filter(file => file.size > maxSize);
      if (oversizedFiles.length > 0) {
        message.error(`File size must be less than 25MB. ${oversizedFiles.length} file(s) exceeded the limit.`);
        return;
      }

      setAttachments([...attachments, ...files]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-white border-l border-[#EEEEEE] transition-all duration-300 relative ${isCollapsed ? 'w-[50px]' : 'w-[350px]'}`}
    >
      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-6 bg-white border border-[#EEEEEE] rounded-full p-1 shadow-sm hover:bg-[#F7F7F7] z-10"
      >
        {isCollapsed ? <ChevronsLeft size={14} /> : <ChevronsRight size={14} />}
      </button>

      {/* Header */}
      {!isCollapsed && (
        <div className="p-6 border-b border-[#EEEEEE]">
          <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#ff3b3b]" />
            Activity & Chat
          </h3>
          <p className="text-[12px] text-[#666666] font-['Inter:Regular',sans-serif] mt-1">
            Task updates and comments
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
          <div className="flex flex-col items-center justify-center h-full text-[#999999] space-y-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-[13px]">Loading activity...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#999999] opacity-50">
            <MessageSquare className="w-12 h-12 mb-2" />
            <p className="text-[13px]">No activity yet. Start the conversation!</p>
          </div>
        ) : (
          activities.map((activity: any) => {
            const isSystem = activity.type === 'SYSTEM';
            const avatar = activity.user?.name ? activity.user.name.charAt(0).toUpperCase() : '?';
            const timeStr = activity.created_at ? format(new Date(activity.created_at), 'MMM d, h:mm a') : '';

            return (
              <div key={activity.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSystem ? 'bg-[#F0F0F0]' : 'bg-gradient-to-br from-[#666666] to-[#999999]'
                  }`}>
                  <span className={`text-[11px] font-['Manrope:Bold',sans-serif] ${isSystem ? 'text-[#999999]' : 'text-white'
                    }`}>
                    {avatar}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-[13px] font-['Manrope:SemiBold',sans-serif] ${isSystem ? 'text-[#999999]' : 'text-[#111111]'
                      }`}>
                      {activity.user?.name || 'System'}
                    </span>
                    <span className="text-[11px] text-[#999999] font-['Inter:Regular',sans-serif]">
                      {timeStr}
                    </span>
                  </div>

                  <div className={`${!isSystem ? 'bg-[#F7F7F7] p-3 rounded-[12px] rounded-tl-none' : ''}`}>
                    <p className="text-[13px] text-[#444444] font-['Inter:Regular',sans-serif] break-words">
                      {activity.message}
                    </p>
                  </div>

                  {activity.attachments && activity.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activity.attachments.map((file: any) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-white rounded border border-[#EEEEEE] hover:border-[#ff3b3b]/30 transition-colors"
                        >
                          <Paperclip className="w-3 h-3 text-[#666666]" />
                          <span className="text-[11px] text-[#444444] truncate max-w-[150px]">{file.file_name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
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

        <div className="relative">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending}
            placeholder="Type a message or comment..."
            className="w-full min-h-[80px] p-3 pr-10 rounded-[12px] border border-[#DDDDDD] bg-[#FAFAFA] text-[13px] focus:outline-none focus:border-[#ff3b3b]/30 resize-none font-['Inter:Medium',sans-serif] disabled:opacity-50"
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <label htmlFor="file-upload-task" className="cursor-pointer text-[#999999] hover:text-[#666666] transition-colors">
              <Paperclip className="w-4 h-4" />
              <input
                id="file-upload-task"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
            <button
              onClick={handleSendMessage}
              disabled={isSending || (!messageText.trim() && attachments.length === 0)}
              className="text-[#ff3b3b] hover:text-[#E03131] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
