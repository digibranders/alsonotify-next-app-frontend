import { Avatar, Tooltip, App, Button } from 'antd';
import { CheckCircle2, Clock, Hourglass, HandMetal, History, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { overrideBaton, reclaimBaton, reorderTaskMembers } from '@/services/task';
import { queryKeys } from '@/lib/queryKeys';
import { Reorder } from 'framer-motion';
import { useState } from 'react';

interface TaskMember {
  id: number;
  user_id: number;
  status: string;
  estimated_time: number | null;
  seconds_spent: number;
  active_worklog_start_time?: string | null;
  is_current_turn: boolean;
  queue_order: number;
  execution_mode: 'parallel' | 'sequential';
  user: {
    id: number;
    name: string;
    profile_pic?: string;
  };
}

interface TaskMembersListProps {
  taskId: number;
  members: TaskMember[];
  executionMode: 'parallel' | 'sequential';
  currentUser?: { id: number };
  isLeader?: boolean;
}

export function TaskMembersList({ taskId, members, executionMode, currentUser, isLeader }: TaskMembersListProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [items, setItems] = useState(members || []);

  const [prevMembers, setPrevMembers] = useState(members);
  if (members !== prevMembers) {
    setPrevMembers(members);
    setItems(members || []);
  }

  // Sort by queue_order for initial display
  const sortedMembers = [...items].sort((a, b) => (a.queue_order || 0) - (b.queue_order || 0));

  const handleGiveBaton = async (targetUserId: number) => {
    try {
      await overrideBaton(taskId, targetUserId);
      message.success("Baton handed over successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    } catch (error: any) {
      message.error(error.message || "Failed to handover baton");
    }
  };

  const handleReclaimBaton = async () => {
    try {
      await reclaimBaton(taskId);
      message.success("Baton reclaimed successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    } catch (error: any) {
      message.error(error.message || "Failed to reclaim baton");
    }
  };

  const handleReorder = async (newOrder: TaskMember[]) => {
    setItems(newOrder); // Optimistic update
    try {
      const memberIds = newOrder.map(m => m.user_id);
      await reorderTaskMembers(taskId, memberIds);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    } catch (error: any) {
      message.error(error.message || "Failed to reorder members");
      setItems(members); // Rollback
    }
  };

  const myMemberRecord = members?.find(m => m.user_id === currentUser?.id);

  // Can reclaim if: 
  // 1. We are completed 
  // 2. We don't have the turn 
  // 3. We are in sequential mode
  // (Backend enforces the rest of the logic like next person not started)
  const canReclaim = executionMode === 'sequential' && myMemberRecord?.status === 'Completed' && !myMemberRecord?.is_current_turn;

  return (
    <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
      <h3 className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Squad & Progress</span>
          {canReclaim && (
            <Tooltip title="Reclaim baton (only if next member has not started yet)">
              <Button
                size="small"
                type="dashed"
                icon={<History className="w-3 h-3" />}
                onClick={handleReclaimBaton}
                className="text-[10px] h-6 flex items-center gap-1 border-amber-200 text-amber-700 hover:text-amber-800 hover:border-amber-300 bg-amber-50/50"
              >
                Reclaim
              </Button>
            </Tooltip>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide ${executionMode === 'sequential' ? 'bg-[#FFF2E8] text-[#FA541C]' : 'bg-[#E6F4FF] text-[#0091FF]'
          }`}>
          {executionMode} Mode
        </span>
      </h3>

      <div className="space-y-3">
        <Reorder.Group axis="y" values={sortedMembers} onReorder={handleReorder} className="space-y-3">
          {sortedMembers.map((member, index) => {
            const isTurn = member.is_current_turn;
            const isMe = currentUser?.id === member.user_id;

            // Status Badge Logic
            let statusColor = 'text-gray-500 bg-gray-50 border-gray-100';
            let StatusIcon = Hourglass;

            if (member.status === 'Completed') {
              statusColor = 'text-green-600 bg-green-50 border-green-100';
              StatusIcon = CheckCircle2;
            } else if (member.status === 'In_Progress') {
              statusColor = 'text-blue-600 bg-blue-50 border-blue-100';
              StatusIcon = Clock;
            }

            return (
              <Reorder.Item
                key={member.id}
                value={member}
                dragListener={isLeader}
                className={cn(
                  "relative flex items-center gap-4 p-3 rounded-xl border transition-all select-none",
                  isTurn && executionMode === 'sequential'
                    ? 'bg-amber-50/30 border-amber-200 ring-1 ring-amber-100'
                    : 'bg-white border-[#F5F5F5]',
                  isLeader && "cursor-grab active:cursor-grabbing"
                )}
              >
                {/* Drag Handle or Index */}
                {executionMode === 'sequential' && (
                  <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0",
                    isTurn ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                  )}>
                    {isLeader ? <GripVertical className="w-3 h-3" /> : (member.queue_order || index + 1)}
                  </div>
                )}

                {/* Avatar */}
                <Avatar src={member.user.profile_pic} size="default" className="border border-white shadow-sm shrink-0">
                  {member.user.name.charAt(0)}
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-[13px] font-['Manrope:SemiBold',sans-serif] truncate ${isMe ? 'text-[#111111]' : 'text-[#444444]'}`}>
                      {member.user.name} {isMe && '(You)'}
                    </p>
                    {isTurn && executionMode === 'sequential' && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded-full border border-amber-100 animate-pulse">
                        Current Turn
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#888888] mt-0.5">
                    <span className="flex items-center gap-1">
                      est: <span className="text-[#111111]">{member.estimated_time || 0}h</span>
                    </span>
                    <span className="w-[1px] h-3 bg-gray-200"></span>
                    <span className="flex items-center gap-1">
                      logged: <span className="text-[#111111]">{(member.seconds_spent / 3600).toFixed(1)}h</span>
                    </span>
                  </div>
                </div>

                {/* Actions (Leader Only) */}
                {isLeader && executionMode === 'sequential' && !isTurn && member.status !== 'Completed' && (
                  <Tooltip title="Give baton manually to this user">
                    <Button
                      size="small"
                      icon={<HandMetal className="w-3.5 h-3.5" />}
                      onClick={() => handleGiveBaton(member.user_id)}
                      className="shrink-0 border-amber-200 text-amber-600 hover:text-amber-700 hover:border-amber-300"
                    />
                  </Tooltip>
                )}

                {/* Status Badge */}
                <div className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 shrink-0 ${statusColor}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {member.status.replace('_', ' ')}
                  </span>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>
    </div>
  );
}
