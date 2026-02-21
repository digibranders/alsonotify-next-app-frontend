import { Checkbox, Tooltip, Dropdown, Popover, Input, Button, message, Avatar } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { MoreVertical, Edit, Trash2, RotateCcw, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuProps } from "antd";
import { useState, useEffect, memo } from "react";
import { provideEstimate } from "../../../../services/task";
import { SegmentedProgressBar } from "./SegmentedProgressBar";
import { useTimer } from "../../../../context/TimerContext";
import { Task } from "../../../../types/domain";
import { TaskStatusBadge } from "../components/TaskStatusBadge";
import { RevisionModal } from "../../../modals/RevisionModal";

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
  isAdmin?: boolean;
  userRole?: string;
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
  isAdmin = false,
  userRole
}: TaskRowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { timerState } = useTimer();
  const { taskId: activeTaskId, elapsedSeconds, isRunning } = timerState;
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimateHours, setEstimateHours] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

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
  const isBlockedOrDelayed = task.status === 'Delayed';
  const showRed = isOvertime || isBlockedOrDelayed;
  const textColor = showRed ? 'text-[#ff3b3b]' : 'text-[#666666]';

  return (
    <>
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
        <div className={`grid gap-4 items-center ${hideRequirements ? 'grid-cols-[40px_2.5fr_1fr_1fr_1fr_1.4fr_60px_40px]' : 'grid-cols-[40px_2.5fr_1.2fr_1fr_1fr_1fr_1.4fr_60px_40px]'}`}>
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
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Tooltip title={task.name} placement="topLeft" mouseEnterDelay={0.5}>
                <span className="font-bold text-sm !text-[#111111] group-hover:text-[#ff3b3b] transition-colors truncate cursor-help">
                  {task.name}
                </span>
              </Tooltip>
              {task.is_high_priority && (
                <Tooltip title="High Priority">
                  <div className="w-1.5 h-1.5 bg-[#ff3b3b] rounded-full shadow-sm blink-animation flex-shrink-0" />
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* <span className="text-[0.6875rem] text-[#999999] font-normal">
                #{task.taskId}
              </span> */}
              <span
                className="text-[0.6875rem] text-[#999999] font-medium truncate"
              >
                {task.client}
              </span>
            </div>
          </div>

          {/* Project (Mapped to Requirements Header) */}
          {!hideRequirements && (
            <div className="min-w-0">
              <Tooltip title={task.project} placement="topLeft" mouseEnterDelay={0.5}>
                <Link
                  href="/dashboard/workspace"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm !text-[#111111] visited:!text-[#111111] font-medium truncate block hover:text-[#ff3b3b] hover:underline cursor-help"
                >
                  {task.project}
                </Link>
              </Tooltip>
            </div>
          )}

          {/* Timeline */}
          <div className="flex flex-col gap-0.5">
            <Tooltip title={task.dueDate !== 'TBD' ? task.dueDate : undefined}>
              <span className="text-sm font-medium text-[#111111] w-fit">
                {task.timelineDate}
              </span>
            </Tooltip>
            <span
              className={`text-[0.6875rem] font-normal ${task.status === 'Delayed'
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
          <div className="flex items-center">
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

          {/* Status (Aggregated) or Estimate Button */}
          <div className="flex items-center min-w-0" onClick={(e) => e.stopPropagation()}>
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
                          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
                          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
                        } catch {
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
                  className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-black text-[0.625rem] font-bold rounded-full flex items-center shadow-sm transition-colors whitespace-nowrap"
                >
                  ESTIMATE
                </button>
              </Popover>
            ) : (
              <TaskStatusBadge status={task.status || 'Assigned'} showLabel={false} />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Dropdown
              menu={{
                items: (() => {
                  const isLeader = task.leader_id === currentUserId || task.leader_user?.id === currentUserId;
                  const isReview = task.status === 'Review';
                  const isInProgress = task.status === 'In_Progress';

                  // Scenario 1: Leader is the ONLY active member — self-assigned, no review needed
                  const activeMemberIds = (task.task_members || []).map((m: { user_id: number }) => m.user_id);
                  const leaderId = task.leader_id ?? task.leader_user?.id;
                  const isSelfAssigned =
                    isInProgress &&
                    isLeader &&
                    leaderId !== undefined &&
                    activeMemberIds.length === 1 &&
                    activeMemberIds[0] === leaderId &&
                    currentUserId === leaderId;

                  const actions: MenuProps['items'] = [];

                  if (isReview && isLeader) {
                    actions.push(
                      {
                        key: 'approve',
                        label: 'Approve & Complete',
                        icon: <CheckCircle className="w-3.5 h-3.5" />,
                        onClick: () => onStatusChange?.('Completed'),
                        className: "text-[0.8125rem] font-medium text-[#16a34a]"
                      },
                      {
                        key: 'revision',
                        label: 'Request Revision',
                        icon: <RotateCcw className="w-3.5 h-3.5" />,
                        onClick: () => setRevisionModalOpen(true),
                        className: "text-[0.8125rem] font-medium text-[#ff3b3b]"
                      }
                    );
                  }

                  // Scenario 1: Self-assigned task — leader can mark complete directly
                  if (isSelfAssigned) {
                    actions.push({
                      key: 'mark_complete',
                      label: 'Mark Complete',
                      icon: <CheckCircle className="w-3.5 h-3.5" />,
                      onClick: () => onStatusChange?.('Completed'),
                      className: "text-[0.8125rem] font-medium text-[#16a34a]"
                    });
                  }

                  // Admin or Leader Actions
                  if ((isAdmin || isLeader) && userRole !== 'Employee') {
                    if (actions.length > 0) {
                      actions.push({ type: 'divider' });
                    }

                    actions.push({
                      key: 'edit',
                      label: 'Edit',
                      icon: <Edit className="w-3.5 h-3.5" />,
                      onClick: () => onEdit?.(),
                      disabled: task.status === 'Completed',
                      className: "text-[0.8125rem] font-medium"
                    });

                    // Admin/Leader Delete (Hidden if In_Progress)
                    if (task.status !== 'In_Progress') {
                      actions.push({
                        key: 'delete',
                        label: 'Delete',
                        icon: <Trash2 className="w-3.5 h-3.5" />,
                        onClick: () => onDelete?.(),
                        danger: true,
                        className: "text-[0.8125rem] font-medium"
                      });
                    }
                  }

                  return actions;
                })() as MenuProps['items']
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              {/* Only show button if there are menu items */}
              {(() => {
                const isLeader = task.leader_id === currentUserId || task.leader_user?.id === currentUserId;
                const isReview = task.status === 'Review';

                // If it's review and leader, we always have items (Approve/Reject)
                if (isReview && isLeader) {
                  return (
                    <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
                      <MoreVertical className="w-4 h-4 text-[#666666]" />
                    </button>
                  );
                }

                // Otherwise check for Admin/Leader actions AND Employee restriction
                const hasActions = (isAdmin || isLeader) && userRole !== 'Employee';

                if (hasActions) {
                  return (
                    <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
                      <MoreVertical className="w-4 h-4 text-[#666666]" />
                    </button>
                  );
                }

                return null;
              })()}
            </Dropdown>
          </div>
        </div>
      </div >
      <RevisionModal
        open={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        task={task}
        onSuccess={() => {
          // Refresh list or optimistic update?
          // Usually parent re-fetches, but we might want to manually trigger
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
        }}
      />
    </>
  );
});

export const TaskRow = TaskRowComponent;