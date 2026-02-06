import { Button } from 'antd';
import { PlayCircle, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

interface TaskMember {
  id: number;
  user_id: number;
  status: string;
  is_current_turn: boolean;
  execution_mode: 'parallel' | 'sequential';
  queue_order: number;
}

interface TaskActionPanelProps {
  task: {
    id: number;
    execution_mode: 'parallel' | 'sequential';
    task_members: TaskMember[];
  };
  currentUser: { id: number };
  onAction: (action: 'start') => void;
  onCompleteRequest?: () => void;
  canStart?: boolean;
  isLoading?: boolean;
}

export function TaskActionPanel({ task, currentUser, onAction, onCompleteRequest, canStart = true, isLoading }: TaskActionPanelProps) {
  const currentMember = task.task_members?.find(m => m.user_id === currentUser.id);

  if (!currentMember) return null; // Not assigned

  const { status, is_current_turn, execution_mode } = currentMember;
  const isCompleted = status === 'Completed';

  if (isCompleted) {
    return (
      <div className="fixed bottom-8 right-8 z-50">
        <div className="bg-white border border-green-200 shadow-lg rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-green-100 p-2 rounded-full text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">You completed your part</p>
            <p className="text-xs text-gray-500">Good job!</p>
          </div>
        </div>
      </div>
    );
  }

  // LOGIC MATRIX
  let canAct = false;
  let actionType: 'start' | 'complete' | null = null;
  let label = '';
  let subLabel = '';
  let Icon = PlayCircle;
  let disabledReason = '';

  if (execution_mode === 'sequential') {
    if (is_current_turn) {
      canAct = true;
      if (status === 'In_Progress') {
        actionType = 'complete';
        label = 'Complete & Pass Baton';
        subLabel = 'Next member will be notified';
        Icon = ArrowRight;
      } else {
        actionType = 'start';
        label = 'Start My Turn';
        subLabel = 'Timer will start automatically';
        Icon = PlayCircle;
      }
    } else {
      // Not my turn
      canAct = false;
      label = 'Waiting for Turn';
      const activeMember = task.task_members?.find(m => m.is_current_turn);
      disabledReason = activeMember 
        ? `Waiting for member #${activeMember.queue_order || '?'}` // Could use name if joined
        : 'Waiting for previous steps';
      Icon = Lock;
    }
  } else {
    // Parallel
    canAct = true;
    if (status === 'In_Progress') {
      actionType = 'complete';
      label = 'Mark as Completed';
      Icon = CheckCircle2;
    } else {
      actionType = 'start';
      label = 'Start Working';
      Icon = PlayCircle;
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="bg-white border border-[#EEEEEE] shadow-xl rounded-2xl p-1.5 pr-6 flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-2xl">
        <Button
          type="primary"
          size="large"
          disabled={!canAct || isLoading || (actionType === 'start' && !canStart)}
          onClick={() => {
            if (!actionType) return;
            if (actionType === 'complete' && onCompleteRequest) {
              onCompleteRequest();
            } else if (actionType === 'start') {
              onAction('start');
            }
          }}
          className={`h-14 rounded-xl px-6 flex items-center gap-3 text-[14px] font-bold shadow-none transition-colors border-none ${
             !canAct ? 'bg-gray-100 text-gray-400' :
             actionType === 'start' ? 'bg-[#111111] hover:bg-black' : 
             'bg-[#10B981] hover:bg-[#059669]'
          }`}
        >
          {isLoading ? 'Updating...' : (
             <>
               <Icon className="w-5 h-5" />
               {label}
             </>
          )}
        </Button>
        
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-[#111111]">
            {canAct ? 'Action Required' : 'Status'}
          </span>
          <span className="text-[11px] text-[#666666] font-medium">
            {canAct ? subLabel : disabledReason}
          </span>
        </div>
      </div>
    </div>
  );
}
