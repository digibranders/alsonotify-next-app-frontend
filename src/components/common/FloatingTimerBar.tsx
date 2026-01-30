'use client';
import { useState, useEffect, useMemo } from "react";
import { usePathname } from 'next/navigation';
import {
  Play,
  Pause,
  CheckCircle,
  ChevronDown,
  Loader2,
  WifiOff,
  Clock
} from "lucide-react";
import { useFloatingMenu } from '../../context/FloatingMenuContext';
import { useTimer } from '../../context/TimerContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAssignedTasks, updateTaskStatusById } from '../../services/task';
import { useUserDetails } from '../../hooks/useUser';
import { App, Tooltip } from 'antd';
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
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);

  // Network Status listener
  useEffect(() => {
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

      setIsFormOpen(!!isDrawerOpen || !!isModalOpen);
    };

    // Initial check
    checkFormOpen();

    // Create observer
    const observer = new MutationObserver((mutations) => {
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

  // Visibility Logic - also hide on task details and requirement details
  const isHidden = (pathname && (
    HIDDEN_ROUTES.some(route => pathname.startsWith(route)) ||
    pathname.includes('/dashboard/requirements/') ||
    pathname.includes('/dashboard/tasks/')
  )) || isFormOpen;

  const { expandedContent } = useFloatingMenu();
  const { timerState, startTimer, stopTimer, isLoading: timerLoading } = useTimer();

  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Sync selected task with running timer ONLY if user hasn't actively selected another one?
  // Or strictly follow the running timer.
  // We'll initialize it, and keep it in sync if the timer starts from elsewhere.
  useEffect(() => {
    if (timerState.taskId) {
      setSelectedTaskId(timerState.taskId);
    }
  }, [timerState.taskId]);


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
        const shouldHideReview = status === 'review' && !t.is_revision;
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
          name: t.name || t.title || "Untitled Task",
          project: t.task_workspace?.name || t.task_project?.company?.name || "Unknown Project",
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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTaskName = currentTask?.name || "Select Task";

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
    setSelectedTaskId(task.id);
    setShowTaskSelector(false);

    // Immediate Switch Strategy per Plan
    // If we are already running a different task, switch immediately.
    // If we are stopped, just select it (wait for Play).
    if (timerState.isRunning && timerState.taskId !== task.id) {
      message.info(`Switching to ${task.name}...`);
      await startTimer(task.id, task.name, task.project);

      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
    }
  };

  const handleComplete = async () => {
    if (!timerState.isRunning) {
      message.warning("No active timer to complete");
      return;
    }

    // 1. Stop the Timer (Log time) - Optimistic update handled in TimerContext
    await stopTimer();

    // 2. Update Status to 'Review' (Submit for Review)
    if (currentDisplayTaskId) {
      try {
        await updateTaskStatusById(currentDisplayTaskId, 'Review');
        message.success("Task worklog saved and submitted for Review!");

        // CLEAR SELECTION immediately to reset UI status
        setSelectedTaskId(null);
      } catch (e: any) {
        console.error("Failed to update status", e);
        // Specialized error handling
        if (e.message?.includes('Review to Review')) {
          // Task is already in review, likely a race condition or double click
          // Treat as success for UI purposes (hide it)
          setSelectedTaskId(null);
          message.info("Task is already in Review.");
        } else {
          message.warning("Worklog saved, but failed to update status.");
        }
      }
    } else {
      message.success("Worklog saved!");
    }

    // 3. Refresh Data
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
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
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowTaskSelector(false)}
          />
          <div className="absolute bottom-full mb-3 bg-white rounded-[20px] shadow-xl border border-[#EEEEEE] p-3 animate-in slide-in-from-bottom-2 duration-200 z-[10000] w-[320px]">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-[10px] text-[#999999] font-['Inter:SemiBold',sans-serif] uppercase tracking-wide">
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
                        <p className={`text-[13px] font-['Manrope:SemiBold',sans-serif] truncate ${currentDisplayTaskId === task.id ? 'text-white' : 'text-inherit'
                          }`}>
                          {task.name}
                        </p>
                        <p className={`text-[10px] font-['Inter:Regular',sans-serif] mt-0.5 truncate ${currentDisplayTaskId === task.id ? 'text-white/80' : 'text-inherit opacity-70'
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
            onClick={() => setShowTaskSelector(!showTaskSelector)}
            className="flex items-center gap-2 group hover:bg-white/10 rounded-full px-4 py-2 transition-all"
            disabled={timerLoading}
          >
            {timerLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <>
                {/* Offline Indicator */}
                {!isOnline && (
                  <Tooltip title="Offline - Changes may not save">
                    <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
                  </Tooltip>
                )}
                <p className="text-[14px] text-white font-['Inter:Medium',sans-serif] group-hover:text-white transition-colors truncate max-w-[200px]">
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
            onClick={handleComplete}
            disabled={timerLoading}
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Timer Display */}
        <div className="font-['Manrope:Bold',sans-serif] text-white leading-none tracking-tight text-[20px] tabular-nums">
          {formatTime(displayTime)}
        </div>
      </div>
    </div>
  );
}
