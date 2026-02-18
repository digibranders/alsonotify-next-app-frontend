import { useState, useMemo, useCallback } from 'react';
import { App } from 'antd';
import { format } from 'date-fns';
import { useRequirementActivities, useCreateRequirementActivity } from '@/hooks/useRequirementActivity';
import { fileService } from '@/services/file.service';
import { ChatPanel } from '@/components/shared/ChatPanel';

import { ApiResponse } from '@/types/api';
import { Employee, Task } from '@/types/domain';
import { UserDto } from '@/types/dto/user.dto';
import { RequirementActivityDto } from '@/services/requirement-activity';

interface ActivitySidebarProps {
  reqId: number;
  employeesData: ApiResponse<Employee[]> | undefined;
  partnersData: ApiResponse<UserDto[]> | undefined;
  tasks: Task[];
}

export function ActivitySidebar({ reqId, employeesData, partnersData, tasks }: ActivitySidebarProps) {
  const { message } = App.useApp();
  const { data: activityResponse, isLoading: isLoadingActivities } = useRequirementActivities(reqId);
  const createActivity = useCreateRequirementActivity();

  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mentionSearch, setMentionSearch] = useState({ text: '', prefix: '' });

  const taskOptions = useMemo(() => {
    return tasks.map(t => ({
      value: t.name || 'Untitled',
      label: t.name || 'Untitled',
      key: `task-${t.id}`
    }));
  }, [tasks]);

  const mentionOptions = useMemo(() => {
    const options: { value: string; label: string; key: string }[] = [];

    // Internal Employees
    if (employeesData?.result) {
      employeesData.result.forEach((emp: Employee) => {
        options.push({
          value: emp.name,
          label: emp.name,
          key: `emp-${emp.id}`
        });
      });
    }

    // Partners
    if (partnersData?.result) {
      partnersData.result.forEach((partner: UserDto) => {
        options.push({
          value: partner.name,
          label: partner.name,
          key: `partner-${partner.id}`
        });
      });
    }

    // Deduplicate by value (name) to avoid UI confusion if a user is in both lists
    const seen = new Set();
    return options.filter(opt => {
      if (seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [employeesData, partnersData]);

  const activeMentionOptions = useMemo(() => {
    const { text, prefix } = mentionSearch;
    if (prefix === '@') {
      return mentionOptions.filter(opt =>
        opt.value.toLowerCase().includes(text.toLowerCase())
      );
    } else if (prefix === '#') {
      return taskOptions.filter(opt =>
        opt.value.toLowerCase().includes(text.toLowerCase())
      );
    }
    return [];
  }, [mentionOptions, taskOptions, mentionSearch]);

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const formatActivityMessage = useCallback((msg: string) => {
    if (!msg) return '';
    const allNames = mentionOptions.map(o => o.value);
    const taskNames = taskOptions.map(o => o.value);

    if (allNames.length === 0 && taskNames.length === 0) return msg;

    // Simpler approach for React grouping
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Combine both prefixes into one regex for systematic parsing
    const mentionRegex = new RegExp(`(@(?:${allNames.map(escapeRegExp).join('|')}))|(#(?:${taskNames.map(escapeRegExp).join('|')}))`, 'g');
    let match;

    while ((match = mentionRegex.exec(msg)) !== null) {
      if (match.index > lastIndex) {
        parts.push(msg.substring(lastIndex, match.index));
      }

      const isTask = match[0].startsWith('#');
      if (isTask) {
        parts.push(
          <span key={match.index} className="task-token-highlight cursor-pointer hover:underline text-[#2F80ED] bg-[#EBF3FF] px-1.5 py-0.5 rounded-md text-xs font-medium">
            {match[0]}
          </span>
        );
      } else {
        parts.push(
          <span key={match.index} className="mention-token-highlight cursor-pointer hover:underline">
            {match[0]}
          </span>
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < msg.length) {
      parts.push(msg.substring(lastIndex));
    }

    return parts;
  }, [mentionOptions, taskOptions]);

  const activityData = useMemo(() => {
    if (!activityResponse?.result) return [];
    return (activityResponse.result as RequirementActivityDto[]).map((act) => {
      let formattedDate = '-';
      try {
        const date = new Date(act.created_at);
        if (!isNaN(date.getTime())) {
          formattedDate = format(date, 'MMM d, h:mm a');
        }
      } catch {
        console.warn("Invalid activity date:", act.created_at);
      }

      return {
        id: act.id,
        type: act.type.toLowerCase(),
        user: act.user.name,
        avatar: act.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
        date: formattedDate,
        message: formatActivityMessage(act.message),
        isSystem: act.type === 'SYSTEM',
        attachments: act.attachments,
        time: act.metadata && typeof act.metadata === 'object' && 'time' in act.metadata ? String((act.metadata as Record<string, unknown>).time) : undefined,
        category: act.metadata && typeof act.metadata === 'object' && 'category' in act.metadata ? String((act.metadata as Record<string, unknown>).category) : undefined,
        task: act.metadata && typeof act.metadata === 'object' && 'task' in act.metadata ? String((act.metadata as Record<string, unknown>).task) : undefined,
        raw: act
      };
    });
  }, [activityResponse, formatActivityMessage]);

  const handleMentionSearch = (text: string, prefix: string) => {
    setMentionSearch({ text, prefix });
  };

  const handleSendMessage = async () => {
    if (messageText.trim() || attachments.length > 0) {
      try {
        let uploadedAttachmentIds: number[] = [];

        // Upload files if any
        if (attachments.length > 0) {
          message.loading({ content: 'Uploading attachments...', key: 'chat-upload' });

          const uploadPromises = attachments.map(file =>
            fileService.uploadFile(file, 'REQUIREMENT', reqId)
          );

          const uploadedFiles = await Promise.all(uploadPromises);
          uploadedAttachmentIds = uploadedFiles.map(f => f.id);

          message.success({ content: 'Attachments uploaded!', key: 'chat-upload' });
        }

        await createActivity.mutateAsync({
          requirement_id: reqId,
          message: messageText,
          type: attachments.length > 0 ? 'FILE' : 'CHAT',
          attachment_ids: uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined
        });

        setMessageText('');
        setAttachments([]);
      } catch (err: unknown) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        message.error({ content: errorMessage, key: 'chat-upload' });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxSize = 50 * 1024 * 1024; // 50MB

      // Validate file sizes
      const oversizedFiles = files.filter(file => file.size > maxSize);
      if (oversizedFiles.length > 0) {
        message.error(`Some files exceed 50MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }

      setAttachments([...attachments, ...files]);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Backspace') {
      const { selectionStart, selectionEnd } = e.currentTarget;

      // Atomic deletion of mentions like WhatsApp
      if (selectionStart === selectionEnd && selectionStart > 0) {
        const text = messageText;
        const textBefore = text.slice(0, selectionStart);

        // Find if the cursor is at the end of a mention or task tag
        const lastAtIndex = textBefore.lastIndexOf('@');
        const lastHashIndex = textBefore.lastIndexOf('#');
        const lastTriggerIndex = Math.max(lastAtIndex, lastHashIndex);

        if (lastTriggerIndex !== -1) {
          const prefix = text[lastTriggerIndex];
          const namePart = textBefore.slice(lastTriggerIndex + 1);

          let matchedOption;
          if (prefix === '@') {
            matchedOption = mentionOptions.find(opt =>
              namePart === opt.value + ' ' || namePart === opt.value
            );
          } else if (prefix === '#') {
            matchedOption = taskOptions.find(opt =>
              namePart === opt.value + ' ' || namePart === opt.value
            );
          }

          if (matchedOption) {
            e.preventDefault();
            const newText = text.slice(0, lastTriggerIndex) + text.slice(selectionStart);
            setMessageText(newText);
          }
        }
      }
    }
  };

  const handleEditorSelectionJump = (e: React.SyntheticEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget as HTMLTextAreaElement;
    const { selectionStart, selectionEnd } = textarea;

    if (selectionStart !== selectionEnd) return;

    const text = messageText;
    const allMentions = [
      ...mentionOptions.map(opt => `@${opt.value}`),
      ...taskOptions.map(opt => `#${opt.value}`)
    ];

    for (const mentionStr of allMentions) {
      let pos = text.indexOf(mentionStr);
      while (pos !== -1) {
        const end = pos + mentionStr.length;
        if (selectionStart > pos && selectionStart < end) {
          const mid = pos + (mentionStr.length / 2);
          const newPos = selectionStart < mid ? pos : end;
          textarea.setSelectionRange(newPos, newPos);
          return;
        }
        pos = text.indexOf(mentionStr, pos + 1);
      }
    }
  };

  return (
    <ChatPanel
      activityData={activityData}
      isLoadingActivities={isLoadingActivities}
      messageText={messageText}
      setMessageText={setMessageText}
      attachments={attachments}
      setAttachments={setAttachments}
      mentionOptions={mentionOptions}
      taskOptions={taskOptions}
      activeMentionOptions={activeMentionOptions}
      onMentionSearch={handleMentionSearch}
      onSendMessage={handleSendMessage}
      onFileSelect={handleFileSelect}
      onEditorKeyDown={handleEditorKeyDown}
      onEditorSelectionJump={handleEditorSelectionJump}
    />
  );
}
