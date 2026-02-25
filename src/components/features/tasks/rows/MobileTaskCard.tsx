import { Checkbox, Tooltip, Avatar, Dropdown, Button, Input, Popover, message } from "antd";
import { MoreVertical, Edit, Trash2, CheckCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, memo } from "react";
import type { MenuProps } from "antd";
import { Task } from "../../../../types/domain";
import { SegmentedProgressBar } from "./SegmentedProgressBar";
import { TaskStatusBadge } from "../components/TaskStatusBadge";
import { RevisionModal } from "../../../modals/RevisionModal";
import { provideEstimate } from "../../../../services/task";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface MobileTaskCardProps {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  currentUserId?: number;
  hideRequirements?: boolean;
  isAdmin?: boolean;
  className?: string;
}

export const MobileTaskCard = memo(function MobileTaskCard({
  task,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
  currentUserId,
  hideRequirements = false,
  isAdmin = false,
  className = ""
}: MobileTaskCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimateHours, setEstimateHours] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  // Simplified logic for mobile (no live ticker for now to save performance, just snapshot)
  // Or reuse exact same logic if needed. Let's use simple snapshot for now.
  // Actually, let's just use the props values directly.

  const totalSeconds = task.total_seconds_spent || 0;
  const totalHours = totalSeconds / 3600;

  const formatHours = (hours: number) => Number(hours.toFixed(1));
  const formatDuration = (hours: number | string | null | undefined) => {
    const num = Number(hours || 0);
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  const percentage = task.estTime > 0 ? (totalSeconds / (task.estTime * 3600)) * 100 : 0;

  const myMember = task.task_members?.find(m => m.user_id === currentUserId);
  const isPendingEstimate = myMember && myMember.status === 'PendingEstimate';

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
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm text-[#111111] truncate block">
                {task.name}
              </span>
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
                  const isLeader = task.leader_id === currentUserId || task.leader_user?.id === currentUserId;
                  const isReview = task.status === 'Review';
                  const isInProgress = task.status === 'In_Progress';

                  const actions: MenuProps['items'] = [];

                  if (isReview && (isLeader || isAdmin)) {
                    actions.push(
                      {
                        key: 'approve',
                        label: 'Approve',
                        icon: <CheckCircle className="w-3.5 h-3.5" />,
                        onClick: () => onStatusChange?.('Completed'),
                        className: "text-[#16a34a]"
                      },
                      {
                        key: 'revision',
                        label: 'Revision',
                        icon: <RotateCcw className="w-3.5 h-3.5" />,
                        onClick: () => setRevisionModalOpen(true),
                        className: "text-[#ff3b3b]"
                      }
                    );
                  }

                   // Self-assigned shortcut
                   const activeMemberIds = (task.task_members || []).map((m: { user_id: number }) => m.user_id);
                   const leaderId = task.leader_id ?? task.leader_user?.id;
                   const isSelfAssigned =
                     isInProgress &&
                     isLeader &&
                     leaderId !== undefined &&
                     activeMemberIds.length === 1 &&
                     activeMemberIds[0] === leaderId &&
                     currentUserId === leaderId;

                   if (isSelfAssigned) {
                     actions.push({
                       key: 'mark_complete',
                       label: 'Mark Complete',
                       icon: <CheckCircle className="w-3.5 h-3.5" />,
                       onClick: () => onStatusChange?.('Completed'),
                       className: "text-[#16a34a]"
                     });
                   }

                  if (isAdmin || isLeader) {
                    if (actions.length > 0) actions.push({ type: 'divider' });
                    actions.push({
                      key: 'edit',
                      label: 'Edit',
                      icon: <Edit className="w-3.5 h-3.5" />,
                      onClick: () => onEdit?.(),
                      disabled: task.status === 'Completed'
                    });
                    if (task.status !== 'In_Progress') {
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
             <span className="text-[10px] uppercase font-bold text-[#999999] tracking-wider">Due Date</span>
             <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[#111111]">
                  {task.timelineDate}
                </span>
                <span className={`text-[10px] ${
                  task.status === 'Delayed' ? 'text-red-500 font-medium' : 'text-[#999999]'
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
               <button className="px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-bold rounded-full">
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
              <Avatar.Group max={{ count: 3, style: { color: '#666666', backgroundColor: '#EEEEEE', fontSize: '10px', width: '24px', height: '24px', lineHeight: '24px' } }}>
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

           <div className="flex-1 flex flex-col items-end gap-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-[#666666]">
                 <span className="font-medium text-[#111111]">{formatHours(totalHours)}h</span>
                 <span>/</span>
                 <span>{formatDuration(task.estTime)}h</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                 <div
                   className={`h-full rounded-full ${percentage > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                   style={{ width: `${Math.min(percentage, 100)}%` }}
                 />
              </div>
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
    </>
  );
});
