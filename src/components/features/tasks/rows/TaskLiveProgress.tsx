import React, { useState, useEffect, useMemo } from 'react';
import { useTimer } from '@/context/TimerContext';
import { Task } from '@/types/domain';
import { SegmentedProgressBar } from './SegmentedProgressBar';

interface TaskLiveProgressProps {
  task: Task;
  currentUserId?: number;
}

export function TaskLiveProgress({ task, currentUserId }: TaskLiveProgressProps) {
  const { timerState } = useTimer();
  const { taskId: activeTaskId, elapsedSeconds, isRunning } = timerState;

  // Local ticker state for re-rendering live times (read-only from task data + timer context)
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Check if ANY member has an active start time
    const hasActiveMembers = task.task_members?.some(m => m.active_worklog_start_time);

    // Also if this task is the active one in context
    const isContextActive = String(activeTaskId) === String(task.id);

    if (hasActiveMembers || (isContextActive && isRunning)) {
      const interval = setInterval(() => {
        setNow(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [task.task_members, activeTaskId, task.id, isRunning]);

  // Calculate live data for all members
  const liveMembers = useMemo(() => {
    return (task.task_members || []).map(m => {
      let liveSeconds = m.seconds_spent;

      // Check if this member is currently running in global context (Current User)
      const isCurrentUser = m.user_id === currentUserId; // currentUserId passed as prop (number)
      const isContextActive = String(activeTaskId) === String(task.id) && isRunning;

      if (isCurrentUser && isContextActive) {
        // Use the global context elapsed time for perfect sync
        liveSeconds += elapsedSeconds;
      } else if (m.active_worklog_start_time) {
        // For other members (or fallback), calculate from start time
        const startTime = new Date(m.active_worklog_start_time).getTime();
        const diff = Math.max(0, (now.getTime() - startTime) / 1000);
        liveSeconds += diff;
      }

      return {
        ...m,
        seconds_spent: liveSeconds,
        // Status overrides for SegmentedProgressBar color logic:
        isWorking: (isCurrentUser && isContextActive) || !!m.active_worklog_start_time
      };
    });
  }, [task.task_members, task.id, currentUserId, activeTaskId, isRunning, elapsedSeconds, now]);

  // Calculate Aggregated Totals
  const totalSeconds = liveMembers.reduce((acc, m) => acc + m.seconds_spent, 0);
  const totalHours = totalSeconds / 3600;

  // Format helpers
  const formatHours = (hours: number) => Number(hours.toFixed(1));
  const formatDuration = (hours: number | string | null | undefined) => {
    const num = Number(hours || 0);
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  // Progress/Styling Logic
  const percentage = task.estTime > 0 ? (totalSeconds / (task.estTime * 3600)) * 100 : 0;
  const isOvertime = percentage > 100;
  const isBlockedOrDelayed = task.status === 'Delayed';
  const showRed = isOvertime || isBlockedOrDelayed;
  const textColor = showRed ? 'text-[#ff3b3b]' : 'text-[#666666]';

  return (
    <>
      {/* Duration Text */}
      <div className="flex justify-center items-center">
        <span className={`text-sm font-medium whitespace-nowrap ${textColor}`}>
          {formatHours(totalHours)}h / {formatDuration(task.estTime)}h
        </span>
      </div>

      {/* Progress Bar - Always Show */}
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="flex-1 min-w-0">
          <SegmentedProgressBar
            members={liveMembers.sort((a, b) => {
              if (task.execution_mode === 'sequential') {
                return (a.queue_order || 0) - (b.queue_order || 0);
              }
              return 0; // Keep default order (by ID usually or DB order) for parallel
            })}
            totalEstimate={task.estTime}
            taskStatus={task.status || 'Assigned'}
            executionMode={task.execution_mode || 'parallel'}
          />
        </div>
        <span className={`text-[0.6875rem] font-bold whitespace-nowrap ${textColor}`}>
          {Math.round(percentage)}%
        </span>
      </div>
    </>
  );
}
