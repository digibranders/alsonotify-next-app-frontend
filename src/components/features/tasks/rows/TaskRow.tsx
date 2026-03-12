import { Checkbox, Tooltip, Dropdown, Popover, Input, Button, message, Avatar } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { MoreVertical, Edit, Trash2, RotateCcw, CheckCircle, Copy, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuProps } from "antd";
import { useState, memo } from "react";
import { provideEstimate, submitReviewDecision, startReviewFromOriginal } from "../../../../services/task";
import { Task } from "../../../../types/domain";
import { TaskStatusBadge } from "../components/TaskStatusBadge";
import { RevisionModal } from "../../../modals/RevisionModal";
import { TaskLiveProgress } from "./TaskLiveProgress";
import { ReviewerSelectionModal } from "../components/ReviewerSelectionModal";
import { ReviewDecisionModal } from "../components/ReviewDecisionModal";
import { useTimer } from "@/context/TimerContext";

interface TaskRowProps {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  onStartReview?: () => void;
  onSubmitForReview?: (reviewerId: number) => Promise<void>;
  currentUserId?: number;
  hideRequirements?: boolean;
  onRequestRevision?: () => void;
  isAdmin?: boolean;
}

const TaskRowComponent = memo(function TaskRow({
  task,
  selected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
  currentUserId,
  hideRequirements = false,
  isAdmin = false,
  onSubmitForReview,
  onStartReview
}: TaskRowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { stopTimer, timerState } = useTimer();
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimateHours, setEstimateHours] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [reviewerModalOpen, setReviewerModalOpen] = useState(false);
  const [reviewerModalLoading, setReviewerModalLoading] = useState(false);

  const [reviewDecisionOpen, setReviewDecisionOpen] = useState(false);
  const [reviewDecisionType, setReviewDecisionType] = useState<'Approve' | 'RequestChanges' | null>(null);
  const [reviewDecisionLoading, setReviewDecisionLoading] = useState(false);

  const myMember = task.task_members?.find(m => m.user_id === currentUserId);
  const isPendingEstimate = myMember && myMember.status === 'PendingEstimate';

  const handleReviewDecisionConfirm = async (notes: string) => {
    if (!reviewDecisionType) return;
    setReviewDecisionLoading(true);
    try {
      await submitReviewDecision(
        Number(task.id),
        reviewDecisionType === 'Approve' ? 'Approved' : 'ChangesRequested',
        notes
      );
      message.success(reviewDecisionType === 'Approve' ? 'Task approved!' : 'Changes requested');
      setReviewDecisionOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
    } catch {
      message.error('Failed to submit decision');
    } finally {
      setReviewDecisionLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={() => {
          const targetUrl = `/dashboard/tasks/${task.id}`;
          router.push(targetUrl);
        }}
        className={`
        group bg-white border rounded-[16px] px-4 py-2 transition-all duration-300 cursor-pointer relative z-10
        ${selected
            ? 'border-[#ff3b3b] shadow-[0_0_0_1px_#ff3b3b] bg-[#FFF5F5]'
            : 'border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-lg'
          }
      `}
      >
        <div className={`grid gap-4 items-center ${hideRequirements ? 'grid-cols-[40px_3.6fr_0.9fr_0.7fr_1.5fr_0.5fr_40px]' : 'grid-cols-[40px_2fr_1.6fr_0.9fr_0.7fr_1.5fr_0.5fr_40px]'}`}>
          {/* Checkbox */}
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
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
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[0.75rem] !text-[#111111] group-hover:text-[#ff3b3b] transition-colors truncate cursor-help block">
                    {task.name}
                  </span>
                  {task.is_review_task && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#F3E8FF] text-[#7E22CE] text-xs font-bold border border-[#E9D5FF] flex-shrink-0 animate-pulse">
                      REVIEW
                    </span>
                  )}
                </div>
              </Tooltip>
              {task.is_high_priority && (
                <Tooltip title="High Priority">
                  <div className="w-1.5 h-1.5 bg-[#ff3b3b] rounded-full shadow-sm blink-animation flex-shrink-0" />
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* <span className="text-[0.75rem] text-[#999999] font-normal">
                #{task.taskId}
              </span> */}
              <span
                className="text-[0.625rem] text-[#999999] font-medium truncate"
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
                  className="text-[0.75rem] !text-[#111111] visited:!text-[#111111] font-normal truncate block hover:text-[#ff3b3b] hover:underline cursor-help"
                >
                  {task.project}
                </Link>
              </Tooltip>
            </div>
          )}

          {/* Timeline */}
          <div className="flex flex-col gap-0.5">
            <Tooltip title={task.dueDate !== 'TBD' ? task.dueDate : undefined}>
              <span className="text-[0.75rem] font-medium text-[#111111] w-fit">
                {task.timelineDate}
              </span>
            </Tooltip>
            <span
              className={`text-[0.625rem] font-medium ${task.status === 'Delayed'
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
            <Avatar.Group size={24} max={{ count: 3, style: { color: '#666666', backgroundColor: '#EEEEEE' } }}>
              {task.task_members && task.task_members.length > 0 ? (
                task.task_members.map((member) => (
                  <Tooltip key={member.id} title={`${member.user.name} (${member.status})`}>
                    <div className="relative">
                      <Avatar
                        size={26}
                        src={member.user.profile_pic || undefined}
                        style={{ backgroundColor: '#CCCCCC', color: '#111111' }}
                      >
                        {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                      </Avatar>
                    </div>
                  </Tooltip>
                ))
              ) : (
                <Tooltip title={typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?.name}>
                  <Avatar size={24} style={{ backgroundColor: '#CCCCCC', color: '#111111' }}>
                    {task.assignedTo ? (typeof task.assignedTo === 'string' ? task.assignedTo.charAt(0).toUpperCase() : task.assignedTo.name?.charAt(0).toUpperCase()) : 'U'}
                  </Avatar>
                </Tooltip>
              )}
            </Avatar.Group>
          </div>

          <TaskLiveProgress task={task} currentUserId={currentUserId} />

          {/* Status (Aggregated) or Estimate Button */}
          <div className="flex items-center justify-center min-w-0" onClick={(e) => e.stopPropagation()}>
            {isPendingEstimate ? (
              // ESTIMATE Button when pending
              <Popover
                open={estimateOpen}
                onOpenChange={setEstimateOpen}
                trigger="click"
                content={
                  <div className="p-2 w-48">
                    <p className="text-[0.75rem] font-medium mb-2">Your Estimate</p>
                    <Input
                      type="number"
                      placeholder="Hours"
                      value={estimateHours}
                      onChange={(e) => setEstimateHours(e.target.value)}
                      className="mb-4 text-[0.75rem]"
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
                  className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center shadow-sm transition-colors whitespace-nowrap"
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
                  const myMember = task.task_members?.find(m => m.user_id === currentUserId);
                  const isAssignee = !!myMember;
                  const isLeader = task.leader_id === currentUserId || task.leader_user?.id === currentUserId;
                  const isReview = task.status === 'Review';

                  const actions: MenuProps['items'] = [];

                  // Review task: Approve / Request Changes (for reviewer)
                  if (task.is_review_task && (isAssignee || isLeader)) {
                    actions.push(
                      {
                        key: 'approve',
                        label: 'Approve',
                        icon: <CheckCircle className="w-3.5 h-3.5" />,
                        onClick: () => {
                          setReviewDecisionType('Approve');
                          setReviewDecisionOpen(true);
                        },
                        className: "text-[0.75rem] font-medium text-[#16a34a]"
                      },
                      {
                        key: 'request_changes',
                        label: 'Request Changes',
                        icon: <RotateCcw className="w-3.5 h-3.5" />,
                        onClick: () => {
                          setReviewDecisionType('RequestChanges');
                          setReviewDecisionOpen(true);
                        },
                        className: "text-[0.75rem] font-medium text-[#ff3b3b]"
                      }
                    );
                  }

                  // Original task in Review: "Start Review" shortcut for the reviewer
                  if (!task.is_review_task && isReview && !isLeader && !isAssignee) {
                    actions.push({
                      key: 'start_review',
                      label: 'Start Review',
                      icon: <Eye className="w-3.5 h-3.5" />,
                      onClick: async () => {
                        try {
                          const response = await startReviewFromOriginal(Number(task.id));
                          if (response?.result?.reviewTaskId) {
                            router.push(`/dashboard/tasks/${response.result.reviewTaskId}`);
                          }
                        } catch {
                          message.error('Failed to start review');
                        }
                      },
                      className: "text-[0.75rem] font-medium text-[#7E22CE]"
                    });
                  }

                  // Admin, Leader, or Assignee Actions
                  if (isAdmin || isLeader || isAssignee) {
                    if (actions.length > 0) {
                      actions.push({ type: 'divider' });
                    }

                    if (!task.is_review_task) {
                      actions.push({
                        key: 'edit',
                        label: 'Edit',
                        icon: <Edit className="w-3.5 h-3.5" />,
                        onClick: () => onEdit?.(),
                        disabled: task.status === 'Completed',
                        className: "text-xs font-medium"
                      });
                    }

                    actions.push({
                      key: 'duplicate',
                      label: 'Duplicate',
                      icon: <Copy className="w-3.5 h-3.5" />,
                      onClick: () => onDuplicate?.(),
                      className: "text-[0.75rem] font-medium"
                    });

                    if ((isAdmin || isLeader) && task.status !== 'In_Progress') {
                      actions.push({
                        key: 'delete',
                        label: 'Delete',
                        icon: <Trash2 className="w-3.5 h-3.5" />,
                        onClick: () => onDelete?.(),
                        danger: true,
                        className: "text-[0.75rem] font-medium"
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
                const myMember = task.task_members?.find(m => m.user_id === currentUserId);
                const isAssignee = !!myMember;
                const isLeader = task.leader_id === currentUserId || task.leader_user?.id === currentUserId;
                const isReview = task.status === 'Review';

                // Review task: reviewer has Approve/Request Changes
                if (task.is_review_task && (isLeader || isAssignee)) {
                  return (
                    <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
                      <MoreVertical className="w-4 h-4 text-[#666666]" />
                    </button>
                  );
                }

                // Original task in Review: non-leader/non-assignee may be the reviewer
                if (!task.is_review_task && isReview && !isLeader && !isAssignee) {
                  return (
                    <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
                      <MoreVertical className="w-4 h-4 text-[#666666]" />
                    </button>
                  );
                }

                // Admin/Leader/Assignee actions
                const hasActions = isAdmin || isLeader || isAssignee;
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
      <ReviewerSelectionModal
        open={reviewerModalOpen}
        onClose={() => setReviewerModalOpen(false)}
        defaultReviewerId={task.leader_id || undefined}
        loading={reviewerModalLoading}
        onConfirm={async (reviewerId) => {
          if (!onSubmitForReview) return;
          setReviewerModalLoading(true);
          try {
            await onSubmitForReview(reviewerId);
            setReviewerModalOpen(false);
          } finally {
            setReviewerModalLoading(false);
          }
        }}
      />
      <ReviewDecisionModal
        open={reviewDecisionOpen}
        decision={reviewDecisionType}
        taskName={task.name}
        loading={reviewDecisionLoading}
        onClose={() => setReviewDecisionOpen(false)}
        onConfirm={handleReviewDecisionConfirm}
      />
    </>
  );
});

export const TaskRow = TaskRowComponent;