import { Checkbox, Tooltip, Avatar, Dropdown, Button, Input, Popover, message } from "antd";
import { MoreVertical, Edit, Trash2, CheckCircle, RotateCcw, Copy, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, memo } from "react";
import type { MenuProps } from "antd";
import { Task } from "../../../../types/domain";
import { TaskStatusBadge } from "../components/TaskStatusBadge";
import { RevisionModal } from "../../../modals/RevisionModal";
import { provideEstimate, submitReviewDecision, startReviewFromOriginal } from "../../../../services/task";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { TaskLiveProgress } from "./TaskLiveProgress";
import { ReviewDecisionModal } from "../components/ReviewDecisionModal";

interface MobileTaskCardProps {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  currentUserId?: number;
  hideRequirements?: boolean;
  isAdmin?: boolean;
  className?: string;
  onSubmitForReview?: (reviewerId: number) => Promise<void>;
  onStartReview?: () => void;
}

export const MobileTaskCard = memo(function MobileTaskCard({
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
  className = "",
  onSubmitForReview,
  onStartReview
}: MobileTaskCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimateHours, setEstimateHours] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
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
        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
        className={`
          bg-white border rounded-[16px] p-4 flex flex-col gap-3 relative transition-all duration-300
          ${selected ? 'border-[#ff3b3b] bg-[#FFF5F5]' : 'border-[#EEEEEE]'}
          ${className}
        `}
      >
        {/* Row 1: Checkbox, Name, Priority, Menu */}
        <div className="flex items-start gap-3">
          <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
            <Checkbox
              checked={selected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="red-checkbox"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 min-w-0">
              <span className="font-bold task-row-main text-[#111111] truncate block">
                {task.name}
              </span>
              {task.is_review_task && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#F3E8FF] text-[#7E22CE] text-xs font-semibold border border-[#E9D5FF] flex-shrink-0 animate-pulse">
                  REVIEW
                </span>
              )}
              {task.is_high_priority && (
                <div className="w-1.5 h-1.5 bg-[#ff3b3b] rounded-full shrink-0 animate-pulse" />
              )}
            </div>

            {/* Row 2: Client / Project */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#999999]">
              <span className="font-medium text-[#666666] truncate max-w-[120px]">
                {task.client}
              </span>
              {!hideRequirements && task.project && (
                <>
                  <span className="text-[#DDDDDD]">•</span>
                  <Link
                    href="/dashboard/workspace"
                    onClick={(e) => e.stopPropagation()}
                    className="truncate hover:text-[#ff3b3b] transition-colors max-w-[120px]"
                  >
                    {task.project}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Action Menu */}
          <div onClick={(e) => e.stopPropagation()}>
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
                        className: "text-[#16a34a]"
                      },
                      {
                        key: 'request_changes',
                        label: 'Request Changes',
                        icon: <RotateCcw className="w-3.5 h-3.5" />,
                        onClick: () => {
                          setReviewDecisionType('RequestChanges');
                          setReviewDecisionOpen(true);
                        },
                        className: "text-[#ff3b3b]"
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
                      className: "text-[#7E22CE] font-bold"
                    });
                  }

                  if (isAdmin || isLeader || isAssignee) {
                    if (actions.length > 0) actions.push({ type: 'divider' });

                    if (!task.is_review_task) {
                      actions.push({
                        key: 'edit',
                        label: 'Edit',
                        icon: <Edit className="w-3.5 h-3.5" />,
                        onClick: () => onEdit?.(),
                        disabled: task.status === 'Completed'
                      });
                    }

                    actions.push({
                      key: 'duplicate',
                      label: 'Duplicate',
                      icon: <Copy className="w-3.5 h-3.5" />,
                      onClick: () => onDuplicate?.()
                    });

                    if ((isAdmin || isLeader) && task.status !== 'In_Progress') {
                      actions.push({
                        key: 'delete',
                        label: 'Delete',
                        icon: <Trash2 className="w-3.5 h-3.5" />,
                        onClick: () => onDelete?.(),
                        danger: true
                      });
                    }
                  }
                  return actions;
                })() as MenuProps['items']
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button className="p-1 -mr-2 text-[#999999] hover:text-[#111111]">
                <MoreVertical className="w-5 h-5" />
              </button>
            </Dropdown>
          </div>
        </div>

        {/* Row 3: Status & Dates */}
        <div className="flex items-center justify-between gap-2 border-t border-dashed border-[#F5F5F5] pt-3 mt-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs uppercase font-semibold text-[#999999] tracking-wider">Due Date</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[#111111]">
                {task.timelineDate}
              </span>
              <span className={`text-2xs ${task.status === 'Delayed' ? 'text-red-500 font-medium' : 'text-[#999999]'
                }`}>
                {task.timelineLabel === 'Due today' ? 'Today' : task.timelineLabel}
              </span>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            {isPendingEstimate ? (
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
                <button className="px-2 py-0.5 bg-yellow-400 text-black text-2xs font-bold rounded-full">
                  ESTIMATE
                </button>
              </Popover>
            ) : (
              <TaskStatusBadge status={task.status || 'Assigned'} showLabel={true} />
            )}
          </div>
        </div>

        {/* Row 4: Members & Progress */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center -space-x-2">
            <Avatar.Group max={{ count: 3, style: { color: '#666666', backgroundColor: '#EEEEEE', fontSize: "var(--font-size-xs)", width: '24px', height: '24px', lineHeight: '24px' } }}>
              {(task.task_members || []).map((member) => (
                <Tooltip key={member.id} title={member.user.name}>
                  {member.user.profile_pic ? (
                    <Avatar size={24} src={member.user.profile_pic} />
                  ) : (
                    <Avatar size={24} style={{ backgroundColor: '#CCCCCC' }}>
                      {member.user.name?.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                </Tooltip>
              ))}
              {(task.task_members || []).length === 0 && (
                <Avatar size={24} style={{ backgroundColor: '#CCCCCC' }}>U</Avatar>
              )}
            </Avatar.Group>
          </div>

          <div className="flex-1 min-w-0">
            <TaskLiveProgress task={task} currentUserId={currentUserId} />
          </div>
        </div>

      </div>

      <RevisionModal
        open={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        task={task}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
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
