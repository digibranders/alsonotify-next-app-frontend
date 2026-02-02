import { Checkbox, Tooltip, Dropdown, Popover, Input, Button, message, Avatar } from "antd";
import { Clock, MoreVertical, Edit, Trash2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuProps } from "antd";
import { useState, useEffect, memo } from "react";
import { provideEstimate } from "../../../../services/task";
import { SegmentedProgressBar } from "./SegmentedProgressBar";
import { useTimer } from "../../../../context/TimerContext";
import { Task } from "../../../../types/domain";
import { TaskStatusBadge } from "../components/TaskStatusBadge"; 

interface TaskRowProps {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  currentUserId?: number;
  hideRequirements?: boolean;
  onRequestRevision?: () => void;
}

const TaskRowComponent = memo(function TaskRow({
  task,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
  currentUserId,
  hideRequirements = false,
  onRequestRevision
}: TaskRowProps) {
  const router = useRouter();
  const { timerState } = useTimer();
  const { taskId: activeTaskId, elapsedSeconds, isRunning } = timerState;
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimateHours, setEstimateHours] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);

  // Local ticker state for re-rendering live times (read-only from task data + timer context)
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Check if ANY member has an active start time
    const hasActiveMembers = task.task_members?.some(m => m.active_worklog_start_time);

    // Also if this task is the active one in context
    const isContextActive = String(activeTaskId) === String(task.id);

    if (hasActiveMembers || isContextActive) {
      const interval = setInterval(() => {
        setNow(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [task.task_members, activeTaskId, task.id]);

  // Calculate live data for all members
  const liveMembers = (task.task_members || []).map(m => {
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

  // Calculate Aggregated Totals
  const totalSeconds = liveMembers.reduce((acc, m) => acc + m.seconds_spent, 0);
  const totalHours = totalSeconds / 3600;

  // Format helpers
  const formatHours = (hours: number) => Number(hours.toFixed(1));
  const formatDuration = (hours: number | string | null | undefined) => {
    const num = Number(hours || 0);
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  const myMember = task.task_members?.find(m => m.user_id === currentUserId);
  const isPendingEstimate = myMember && myMember.status === 'PendingEstimate';

  // Progress/Styling Logic
  const percentage = task.estTime > 0 ? (totalSeconds / (task.estTime * 3600)) * 100 : 0;
  const isOvertime = percentage > 100;
  const isBlockedOrDelayed = ['Stuck', 'Impediment', 'Delayed'].includes(task.status);
  const showRed = isOvertime || isBlockedOrDelayed;
  const textColor = showRed ? 'text-[#ff3b3b]' : 'text-[#666666]';

  return (
    <div
      onClick={() => {
        const targetUrl = `/dashboard/tasks/${task.id}`;
        router.push(targetUrl);
      }}
      className={`
        group bg-white border rounded-[16px] px-4 py-3 transition-all duration-300 cursor-pointer relative z-10
        ${selected
          ? 'border-[#ff3b3b] shadow-[0_0_0_1px_#ff3b3b] bg-[#FFF5F5]'
          : 'border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-lg'
        }
      `}
    >
      <div className={`grid gap-4 items-center ${hideRequirements ? 'grid-cols-[40px_2.5fr_1.1fr_1fr_0.8fr_1.5fr_0.6fr_40px]' : 'grid-cols-[40px_2.5fr_1.2fr_1.1fr_1fr_0.8fr_1.5fr_0.6fr_40px]'}`}>
        {/* Checkbox */}
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="red-checkbox"
          />
        </div>

        {/* Task Info */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-['Manrope:Bold',sans-serif] text-[14px] !text-[#111111] group-hover:text-[#ff3b3b] transition-colors">
              {task.name}
            </span>
            {task.is_high_priority && (
              <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-red-200">
                HIGH
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#999999] font-['Manrope:Regular',sans-serif]">
              #{task.taskId}
            </span>
            <Link
              href="/dashboard/clients"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] !text-[#111111] visited:!text-[#111111] font-['Manrope:Medium',sans-serif] hover:text-[#ff3b3b] hover:underline"
            >
              • {task.client}
            </Link>
          </div>
        </div>

        {/* Project (Mapped to Requirements Header) */}
        {!hideRequirements && (
          <div>
            <Link
              href="/dashboard/workspace"
              onClick={(e) => e.stopPropagation()}
              className="text-[13px] !text-[#111111] visited:!text-[#111111] font-['Manrope:Medium',sans-serif] truncate hover:text-[#ff3b3b] hover:underline"
            >
              {task.project}
            </Link>
          </div>
        )}

        {/* Timeline */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-['Manrope:Medium',sans-serif] text-[#111111]">
            {task.timelineDate}
          </span>
          <span
            className={`text-[11px] font-['Manrope:Regular',sans-serif] ${task.status === 'Delayed' || task.status === 'Impediment' || task.status === 'Stuck'
              ? 'text-[#dc2626]'
              : task.status === 'Review'
                ? 'text-[#fbbf24]'
                : 'text-[#999999]'
              }`}
          >
            {task.timelineLabel}
          </span>
        </div>

        {/* Assigned To (Avatar Stack) */}
        <div className="flex items-center justify-center">
          <Avatar.Group max={{ count: 3, style: { color: '#666666', backgroundColor: '#EEEEEE' } }}>
            {task.task_members && task.task_members.length > 0 ? (
              task.task_members.map((member) => (
                <Tooltip key={member.id} title={`${member.user.name} (${member.status})`}>
                  <div className="relative">
                    {member.user.profile_pic ? (
                      <Avatar src={member.user.profile_pic} />
                    ) : (
                      <Avatar style={{ backgroundColor: '#CCCCCC' }}>
                        {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                      </Avatar>
                    )}
                  </div>
                </Tooltip>
              ))
            ) : (
              <Tooltip title={typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?.name}>
                <Avatar style={{ backgroundColor: '#CCCCCC' }}>
                  {task.assignedTo ? (typeof task.assignedTo === 'string' ? task.assignedTo.charAt(0).toUpperCase() : task.assignedTo.name?.charAt(0).toUpperCase()) : 'U'}
                </Avatar>
              </Tooltip>
            )}
          </Avatar.Group>
        </div>

        {/* Duration Text */}
        <div className="flex justify-center items-center">
          <span className={`text-[11px] font-['Manrope:Medium',sans-serif] ${textColor}`}>
            {formatHours(totalHours)}h / {formatDuration(task.estTime)}h
          </span>
        </div>

        {/* Progress Bar - Always Show */}
        <div className="flex flex-col gap-1 w-full justify-center">
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-end">
              <span className={`text-[10px] font-bold ${textColor}`}>
                {Math.round(percentage)}%
              </span>
            </div>
            <SegmentedProgressBar
              members={liveMembers}
              totalEstimate={task.estTime}
              taskStatus={task.status}
            />
          </div>
        </div>

        {/* Status (Aggregated) or Estimate Button */}
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          {isPendingEstimate ? (
            // ESTIMATE Button when pending
            <Popover
              open={estimateOpen}
              onOpenChange={setEstimateOpen}
              trigger="click"
              content={
                <div className="p-2 w-48">
                  <p className="text-xs font-medium mb-2">Your Estimate</p>
                  <Input
                    type="number"
                    placeholder="Hours"
                    value={estimateHours}
                    onChange={(e) => setEstimateHours(e.target.value)}
                    className="mb-4 text-sm"
                  />
                  <Button
                    type="primary"
                    size="small"
                    loading={submissionLoading}
                    className="w-full bg-[#EAB308] text-black"
                    onClick={async () => {
                      if (!estimateHours) return;
                      setSubmissionLoading(true);
                      try {
                        await provideEstimate(Number(task.id), Number(estimateHours));
                        message.success("Estimate submitted");
                        setEstimateOpen(false);
                        window.location.reload();
                      } catch (err) {
                        message.error("Failed");
                      } finally {
                        setSubmissionLoading(false);
                      }
                    }}
                  >
                    Submit
                  </Button>
                </div>
              }
            >
              <button
                className="px-2 py-1 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm transition-colors"
              >
                <Clock className="w-3 h-3" /> ESTIMATE
              </button>
            </Popover>
          ) : (
            <TaskStatusBadge status={task.status} showLabel={false} />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'edit',
                  label: 'Edit',
                  icon: <Edit className="w-3.5 h-3.5" />,
                  onClick: () => onEdit?.(),
                  className: "text-[13px] font-['Manrope:Medium',sans-serif]"
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <Trash2 className="w-3.5 h-3.5" />,
                  onClick: () => onDelete?.(),
                  danger: true,
                  className: "text-[13px] font-['Manrope:Medium',sans-serif]"
                },
                {
                  key: 'revision',
                  label: 'Revision',
                  icon: <RotateCcw className="w-3.5 h-3.5" />,
                  onClick: () => onRequestRevision?.(),
                  disabled: task.status !== 'Review', // Typical threshold for revision
                  className: "text-[13px] font-['Manrope:Medium',sans-serif] text-[#ff3b3b]"
                }
              ] as MenuProps['items']
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
              <MoreVertical className="w-4 h-4 text-[#666666]" />
            </button>
          </Dropdown>
        </div>
      </div>
    </div>
  );
});

export const TaskRow = TaskRowComponent;