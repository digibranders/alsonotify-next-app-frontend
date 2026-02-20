'use client';
import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Play,
  Pause,
  CheckCircle,
  ChevronDown,
  Loader2,
  Clock,
  Paperclip,
  X
} from "lucide-react";
import { useFloatingMenu } from '../../context/FloatingMenuContext';
import { useTimer } from '../../context/TimerContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCreateTaskActivity } from '../../hooks/useTaskActivity';
import { fileService } from '../../services/file.service';
import { getAssignedTasks, updateTaskMemberStatus } from '../../services/task';
import { useUserDetails } from '../../hooks/useUser';
import { App, Tooltip, Modal, Input } from 'antd';
import { queryKeys } from '../../lib/queryKeys';

// Global floating timer bar - expands with bulk actions from pages
const HIDDEN_ROUTES = ['/dashboard/reports', '/dashboard/finance', '/dashboard/settings', '/dashboard/profile'];

interface TaskOption {
  id: number;
  name: string;
  project: string;
  estimatedTime: number;
  disabled?: boolean;
  secondsSpent: number; // Accumulated time from history
  canStart: boolean;
  startTooltip?: string;
}

export function FloatingTimerBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);

  // Network Status listener
  useEffect(() => {
    // Initial sync; event listeners below handle subsequent updates.
    // eslint-disable-next-line
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Function to check if any drawer or modal is open
    const checkFormOpen = () => {
      // Check for Ant Design Drawer open state on body
      const isDrawerOpen = document.body.classList.contains('ant-scrolling-effect') ||
        document.querySelector('.ant-drawer-open') !== null ||
        document.querySelector('.ant-drawer-mask:not(.ant-drawer-mask-hidden)') !== null;

      // Check for Ant Design Modal open state
      const isModalOpen = document.querySelector('.ant-modal-wrap:not([style*="display: none"])') !== null ||
        document.body.classList.contains('ant-modal-open');

      const next = !!isDrawerOpen || !!isModalOpen;
      setIsFormOpen(next);
    };

    // Initial check
    checkFormOpen();

    // Create observer
    const observer = new MutationObserver(() => {
      checkFormOpen();
    });

    // Start observing body for class changes and DOM mutations
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  const { expandedContent } = useFloatingMenu();
  const { timerState, startTimer, stopTimer, isLoading: timerLoading } = useTimer();

  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeDescription, setCompleteDescription] = useState("");
  const [completeTaskId, setCompleteTaskId] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { mutateAsync: createTaskActivity } = useCreateTaskActivity();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setShowTaskSelector(false);
      }
    }

    if (showTaskSelector) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTaskSelector]);

  // Visibility Logic - hide on reports/finance/settings/profile and requirement details only.
  // Timer bar is visible on /dashboard/tasks/* (task list and task detail) so users can control timer there.
  // When our own Complete modal is open (showCompleteModal), do NOT hide the bar — otherwise
  // the MutationObserver would set isFormOpen true → bar returns null → modal unmounts →
  // observer sets isFormOpen false → bar re-renders with modal → infinite loop.
  const activeTab = searchParams.get('tab');
  const isHidden = (pathname && (
    HIDDEN_ROUTES.some(route => pathname.startsWith(route)) ||
    pathname.includes('/dashboard/requirements/') ||
    // Hide when these tabs are active
    ['gantt', 'kanban', 'pnl'].includes(activeTab || '')
  )) || (isFormOpen && !showCompleteModal);

  // Sync selected task with running timer ONLY if user hasn't actively selected another one?
  // Or strictly follow the running timer.
  // We'll initialize it, and keep it in sync if the timer starts from elsewhere.
  useEffect(() => {
    if (timerState.taskId && selectedTaskId !== timerState.taskId) {
      // Sync from timer state; omit selectedTaskId from deps to avoid feedback loop.
      // eslint-disable-next-line
      setSelectedTaskId(timerState.taskId);
    }
  }, [timerState.taskId, selectedTaskId]);


  const { data: userDetailsData } = useUserDetails();
  // Using flattened Employee object from useUserDetails
  const userId = userDetailsData?.result?.id;

  const { data: assignedTasksData, isLoading: tasksLoading } = useQuery({
    queryKey: queryKeys.tasks.assigned(),
    queryFn: () => getAssignedTasks(),
    enabled: !!userId,
  });

  // Filter tasks logic matches original...
  const tasks: TaskOption[] = useMemo(() => {
    return (assignedTasksData?.result || [])
      .filter((t) => {
        const status = (t.status || '').toLowerCase();

        // Debugging Filter
        // console.log(`Task ${t.name}: Status=${status}, IsRevision=${t.is_revision}, Hide=${shouldHideReview}`);

        // Visibility Logic:
        // 1. Hide if 'Completed'
        if (status.includes('completed')) return false;

        // 2. Hide if 'Review', UNLESS it is a Revision task
        //    (Revisions should stay visible until explicitly completed/approved again)
        if (status === 'review' && !t.is_revision) return false;

        if (t.disabled) return false;

        // 3. User MUST be a member to see/track the task here.
        const memberRecord = t.task_members?.find(m => m.user_id === userId);
        if (!memberRecord) return false;

        // 4. User MUST have provided an estimate to track time on it via this bar
        if (memberRecord.estimated_time === null) return false;

        return true;
      })
      .map((t) => {
        const memberRecord = t.task_members?.find(m => m.user_id === userId);
        // If leader but not member, they might not have seconds_spent record yet, default to 0 or task global time?
        // Usually safe to default to 0 for personal tracking, or t.time_spent for task total. 
        // Showing personal time (0) is safer for the "My Timer" context.
        const secondsSpent = memberRecord?.seconds_spent || 0;
        const estimatedTime = memberRecord ? (memberRecord.estimated_time || t.estimated_time || 0) : (t.estimated_time || 0);

        // Calculate Can Start
        let canStart = true;
        let startTooltip = undefined;

        if (t.execution_mode === 'sequential') {
          // In sequential mode, they can only start if it is their turn.
          if (!memberRecord?.is_current_turn) {
            canStart = false;
            startTooltip = "Not your turn (Sequential Task)";
          }
        }

        return {
          id: t.id,
          name: t.name || "Untitled Task",
          project: t.task_requirement?.name || t.task_workspace?.name || t.company?.name || t.task_project?.company?.name || "Unknown Project",
          estimatedTime: Number(estimatedTime), // Ensure it is a number
          disabled: t.disabled,
          secondsSpent: secondsSpent,
          canStart,
          startTooltip
        };
      });
  }, [assignedTasksData, userId]);


  // Display Logic: Single Source of Truth
  const currentDisplayTaskId = selectedTaskId || timerState.taskId;
  const currentTask = tasks.find(t => t.id === currentDisplayTaskId);

  // Calculate Time
  // If the displayed task IS the running task -> add elapsed.
  // Otherwise -> Just show historical base.
  const isRunningTask = timerState.isRunning && timerState.taskId === currentDisplayTaskId;
  const baseSeconds = currentTask?.secondsSpent || 0;

  const displayTime = isRunningTask
    ? baseSeconds + timerState.elapsedSeconds
    : baseSeconds;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  const handlePlayPause = async () => {
    if (!currentDisplayTaskId) {
      message.warning("Please select a task first");
      return;
    }

    if (timerState.isRunning && timerState.taskId === currentDisplayTaskId) {
      // Pause
      await stopTimer();
      message.info("Timer paused");
    } else {
      // Play (or Switch if another is running)
      // If another is running, startTimer handling in Context might need to be smart, 
      // but Context.startTimer usually handles auto-stop.
      // We'll trust the Context/Plan to handle the switch.
      const task = tasks.find(t => t.id === currentDisplayTaskId);
      const projectName = task?.project || "Unknown Project";
      const taskName = task?.name || "Unknown Task";

      try {
        await startTimer(currentDisplayTaskId, taskName, projectName);
        message.success("Timer started");
      } catch (e) {
        // message handled in context or here
        message.error("Failed to start timer");
      }
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
    if (currentDisplayTaskId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(currentDisplayTaskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.worklogsRoot(currentDisplayTaskId) });
    }
  };

  const handleTaskSelect = async (task: TaskOption) => {
    // 1. If a timer is running for a DIFFERENT task, STOP it first (Pause A).
    if (timerState.isRunning && timerState.taskId && timerState.taskId !== task.id) {
      await stopTimer("Paused via task switch");
      message.info(`Timer paused. Selected: ${task.name}`);
    }

    // 2. Select the new task Logic (View B)
    setSelectedTaskId(task.id);
    setShowTaskSelector(false);

    // 3. DO NOT auto-start. User must click Play.
  };

  const handleCompleteClick = () => {
    if (!currentDisplayTaskId) {
      message.warning("Please select a task to complete");
      return;
    }
    setCompleteTaskId(currentDisplayTaskId);
    setCompleteDescription("");
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async () => {
    const taskIdToComplete = completeTaskId;
    if (!taskIdToComplete) return;

    // 1. Upload attachments if any
    let uploadedAttachmentIds: number[] = [];
    if (attachments.length > 0) {
      try {
        message.loading({ content: 'Uploading attachments...', key: 'complete-upload' });
        const uploadPromises = attachments.map(file =>
          fileService.uploadFile(file, 'TASK', taskIdToComplete)
        );
        const uploadedFiles = await Promise.all(uploadPromises);
        uploadedAttachmentIds = uploadedFiles.map(f => f.id);
        message.success({ content: 'Attachments uploaded!', key: 'complete-upload' });
      } catch (error) {
        console.error("Upload failed", error);
        message.error({ content: 'Failed to upload attachments', key: 'complete-upload' });
        return;
      }
    }

    const description = completeDescription?.trim() ?? "";

    // 2. Create Task Activity with remarks and attachments
    if (description || uploadedAttachmentIds.length > 0) {
      try {
        await createTaskActivity({
          task_id: taskIdToComplete,
          message: description || 'Task Completed',
          type: 'CHAT',
          attachment_ids: uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined
        });
      } catch (error) {
        console.error("Failed to create activity", error);
        // non-blocking
      }
    }

    setShowCompleteModal(false);
    setCompleteDescription("");
    setCompleteTaskId(null);
    setAttachments([]);

    // stopTimer is idempotent - safe to call even if timer already stopped remotely
    await stopTimer(description);

    // 2. Update Status to 'Review' (Submit for Review)
    try {
      // Use updateTaskMemberStatus to update ONLY the member's status
      // This allows independent completion in Parallel mode and baton passing in Sequential mode
      const response = await updateTaskMemberStatus(taskIdToComplete, 'Review');

      if (response.result?.computedStatus === 'Review') {
        message.success("Task submitted for Review! (All members completed)");
      } else {
        message.success("Your part is submitted for Review!");
      }

      setSelectedTaskId(null);
    } catch (e: any) {
      console.error("Failed to update member status", e);
      if (e.message?.includes('Review to Review')) {
        setSelectedTaskId(null);
        message.info("Task is already in Review.");
      } else {
        message.warning("Worklog saved, but failed to update status: " + (e.message || "Unknown error"));
      }
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskIdToComplete) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.worklogsRoot(taskIdToComplete) });
  };

  if (isHidden) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ease-out flex flex-col items-center"
      style={{ bottom: '30px' }}
    >
      {/* Dropdown Menu */}
      {showTaskSelector && (
        <>
          <div
            ref={dropdownRef}
            className="absolute bottom-full mb-3 bg-white rounded-[20px] shadow-xl border border-[#EEEEEE] p-3 animate-in slide-in-from-bottom-2 duration-200 z-[10000] w-[320px]">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-[0.625rem] text-[#999999] font-semibold uppercase tracking-wide">
                Select Task
              </span>
              <div className="flex-1 h-px bg-[#EEEEEE]" />
            </div>
            <div className="space-y-1 max-h-[240px] overflow-y-auto">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-[#999999] animate-spin" />
                </div>
              ) : tasks.length > 0 ? (
                tasks.map((task) => {
                  const content = (
                    <button
                      key={task.id}
                      onClick={() => task.canStart && handleTaskSelect(task)}
                      disabled={!task.canStart}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-[12px] text-left transition-all 
                        ${!task.canStart ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                        ${currentDisplayTaskId === task.id
                          ? 'bg-gradient-to-br from-[#ff3b3b] to-[#cc2f2f] text-white shadow-sm'
                          : task.canStart ? 'hover:bg-[#F7F7F7] text-[#111111]' : 'text-[#999999]'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-[0.8125rem] font-semibold truncate ${currentDisplayTaskId === task.id ? 'text-white' : 'text-inherit'
                          }`}>
                          {task.name}
                        </p>
                        <p className={`text-[0.625rem] font-normal mt-0.5 truncate ${currentDisplayTaskId === task.id ? 'text-white/80' : 'text-inherit opacity-70'
                          }`}>
                          {task.project}
                        </p>
                      </div>
                      {currentDisplayTaskId === task.id && (
                        <CheckCircle className="w-4 h-4 text-white flex-shrink-0 ml-2" />
                      )}
                      {!task.canStart && (
                        // Optional: Icon indicating wait?
                        <Clock className="w-3 h-3 ml-2 opacity-50 flex-shrink-0" />
                      )}
                    </button>
                  );

                  if (!task.canStart && task.startTooltip) {
                    return (
                      <Tooltip key={task.id} title={task.startTooltip} placement="left">
                        {content}
                      </Tooltip>
                    );
                  }

                  return content;
                })
              ) : (
                <div className="p-3 text-center text-[#999999] text-xs">
                  No assigned tasks found
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Bar (Pill) */}
      <div
        className={`
          bg-[#111111] text-white rounded-full shadow-2xl flex items-center border border-[#111111]
          transition-all duration-300 ease-out h-[48px] relative overflow-hidden
          ${expandedContent ? 'px-6 gap-4' : 'px-8 gap-6'}
        `}
      >
        {/* Progress Bar */}
        {(() => {
          const estimatedSeconds = (currentTask?.estimatedTime || 0) * 3600;
          const progress = (estimatedSeconds > 0)
            ? Math.min((displayTime / estimatedSeconds) * 100, 100)
            : 0; // Remove the 60s loop as requested. Bar stays at 0 if no estimate provided.

          return (
            <div
              className="absolute bottom-0 left-0 h-[4px] bg-[#ff3b3b] transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          );
        })()}

        {/* Expanded Content */}
        {expandedContent && (
          <>
            {expandedContent}
            <div className="w-px h-5 bg-white/30" />
          </>
        )}

        {/* Task Selector Button */}
        <div className="relative">
          <button
            ref={toggleButtonRef}
            onClick={() => setShowTaskSelector(!showTaskSelector)}
            className="flex items-center gap-2 group hover:bg-white/10 rounded-full px-4 py-2 transition-all"
            disabled={timerLoading}
          >
            {timerLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <>
                {/* Offline Indicator */}

                <p className="text-sm text-white font-medium group-hover:text-white transition-colors truncate max-w-[200px]">
                  {currentTask?.name || timerState.taskName || "Select Task"}
                </p>
                <ChevronDown className="w-4 h-4 text-white/70 group-hover:text-white transition-colors shrink-0" />
              </>
            )}
          </button>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePlayPause}
            className="text-white hover:text-white/80 transition-all active:scale-90 disabled:opacity-50"
            title={isRunningTask ? "Pause" : "Play"}
            disabled={timerLoading || !currentDisplayTaskId}
          >
            {isRunningTask ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
          <button
            className="text-white hover:text-white/80 transition-all active:scale-90 disabled:opacity-50"
            title="Stop Timer & Save Worklog"
            onClick={handleCompleteClick}
            disabled={timerLoading}
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Timer Display */}
        <div className="font-bold text-white leading-none tracking-tight text-xl tabular-nums">
          {formatTime(displayTime)}
        </div>
      </div>

      {/* Complete description modal */}
      <Modal
        title="Mark as Complete"
        open={showCompleteModal}
        onOk={handleCompleteSubmit}
        onCancel={() => {
          setShowCompleteModal(false);
          setCompleteDescription("");
          setCompleteTaskId(null);
          setAttachments([]);
        }}
        okText="Mark Complete"
        cancelText="Cancel"
        okButtonProps={{ style: { backgroundColor: '#16a34a', borderColor: '#16a34a', boxShadow: 'none' } }}
      >
        <div className="py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remarks
          </label>
          <Input.TextArea
            value={completeDescription}
            onChange={(e) => setCompleteDescription(e.target.value)}
            placeholder="Add final notes about what you completed..."
            rows={4}
            className="w-full"
          />

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            {attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{file.name}</span>
                    </div>
                    <button
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      className="p-1 hover:bg-gray-200 rounded transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-[#ff3b3b] hover:text-[#e03131] transition-colors font-medium">
              <Paperclip className="w-4 h-4" />
              Attach Files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachments([...attachments, ...Array.from(e.target.files)]);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
