'use client';

import { useState, useMemo, useCallback } from 'react';
import { App } from 'antd';
import { format } from 'date-fns';
import { useTask, useTasks } from '@/hooks/useTask';
import { useEmployees, usePartners } from '@/hooks/useUser';
import { useTaskActivities, useCreateTaskActivity } from '@/hooks/useTaskActivity';
import { getPartnerId, getPartnerName, isValidPartner } from '@/utils/partnerUtils';
import { fileService } from '@/services/file.service';
import { ChatPanel } from '@/components/shared/ChatPanel';
import { Employee, Task } from '@/types/domain';
import { UserDto } from '@/types/dto/user.dto';
import { parseMentionsAndTasks } from '@/utils/textUtils';

interface TaskActivityAttachment {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface TaskActivity {
  id: number;
  type: string;
  user?: { name: string };
  created_at: string;
  message: string;
  attachments?: TaskActivityAttachment[];
  metadata?: {
    time?: string;
    category?: string;
    task?: string;
  };
}

interface TaskChatPanelProps {
  taskId: number;
}

export function TaskChatPanel({ taskId }: TaskChatPanelProps) {
  const { message } = App.useApp();
  const { data: taskData } = useTask(taskId);
  const task = taskData?.result;
  const workspaceId = task?.workspace_id;

  const { data: activitiesData, isLoading: isLoadingActivities } = useTaskActivities(taskId);
  const { mutate: createActivity } = useCreateTaskActivity();

  // Fetch data for mentions
  const { data: employeesData } = useEmployees();
  const { data: partnersData } = usePartners();
  const { data: tasksData } = useTasks(workspaceId ? `workspace_id=${workspaceId}` : '');

  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mentionSearch, setMentionSearch] = useState({ text: '', prefix: '' });

  const tasks = useMemo(() => {
    return (tasksData?.result || []) as Task[];
  }, [tasksData]);

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
      (employeesData.result as Employee[]).forEach((emp) => {
        options.push({
          value: emp.name,
          label: emp.name,
          key: `emp-${emp.id}`
        });
      });
    }

    // Partners
    if (partnersData?.result) {
      (partnersData.result as UserDto[])
        .filter(isValidPartner)
        .forEach((partner) => {
          const partnerName = getPartnerName(partner);
          const partnerId = getPartnerId(partner) || 0;
          options.push({
            value: partnerName,
            label: partnerName,
            key: `partner-${partnerId}`
          });
        });
    }

    // Deduplicate
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



  const formatActivityMessage = useCallback((msg: string) => {


    return parseMentionsAndTasks(msg, mentionOptions, taskOptions);
  }, [mentionOptions, taskOptions]);

  const activityData = useMemo(() => {
    if (!activitiesData?.result) return [];
    return (activitiesData.result as TaskActivity[]).map((act) => {
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
        user: act.user?.name || 'Unknown',
        avatar: act.user?.name ? act.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : '?',
        date: formattedDate,
        message: formatActivityMessage(act.message),
        isSystem: act.type === 'SYSTEM',
        attachments: act.attachments?.map((att) => ({
          id: att.id,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type,
          file_size: att.file_size
        })) || [],
        time: act.metadata?.time,
        category: act.metadata?.category,
        task: act.metadata?.task,
        raw: act
      };
    });
  }, [activitiesData, formatActivityMessage]);

  const handleMentionSearch = (text: string, prefix: string) => {
    setMentionSearch({ text, prefix });
  };

  const handleSendMessage = async () => {
    if (messageText.trim() || attachments.length > 0) {
      try {
        let uploadedAttachmentIds: number[] = [];

        if (attachments.length > 0) {
          message.loading({ content: 'Uploading attachments...', key: 'chat-upload' });

          const uploadPromises = attachments.map(file =>
            fileService.uploadFile(file, 'TASK', taskId)
          );

          const uploadedFiles = await Promise.all(uploadPromises);
          uploadedAttachmentIds = uploadedFiles.map(f => f.id);

          message.success({ content: 'Attachments uploaded!', key: 'chat-upload' });
        }

        await createActivity({
          task_id: taskId,
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

      if (selectionStart === selectionEnd && selectionStart > 0) {
        const text = messageText;
        const textBefore = text.slice(0, selectionStart);

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
