import { format } from 'date-fns';
import { MoreVertical } from 'lucide-react';
import { Checkbox } from 'antd';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function SubTaskRow({
  task,
  isRevision,
  selected = false,
  onSelect
}: Readonly<{
  task: any;
  isRevision?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}>) {
  const assignedName = task.assigned_to ? `User ${task.assigned_to}` : 'Unassigned';
  // Fallback for name/initials
  const initials = (task.member_user?.name || task.assigned_members?.[0]?.name || assignedName)
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div
      onClick={onSelect}
      className={`
        group bg-white border rounded-[16px] p-4 transition-all duration-300 cursor-pointer relative z-10
        ${selected
          ? 'border-[#ff3b3b] shadow-[0_0_0_1px_#ff3b3b] bg-[#FFF5F5]'
          : 'border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-lg'
        }
      `}
    >
      <div className="grid grid-cols-[40px_2fr_1fr_1fr_0.6fr_0.3fr] gap-4 items-center">
        {/* Checkbox */}
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onChange={onSelect}
            disabled={isRevision}
            className="border-[#DDDDDD] [&.ant-checkbox-checked]:bg-[#ff3b3b] [&.ant-checkbox-checked]:border-[#ff3b3b]"
          />
        </div>

        {/* Task Info */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold task-row-main text-[#111111] group-hover:text-[#ff3b3b] transition-colors">
              {task.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="task-row-sub text-[#666666] font-medium">
              #{task.id}
            </span>
          </div>
        </div>

        {/* Assigned To */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {initials}
            </span>
          </div>
        </div>

        {/* Due Date */}
        <div className="flex justify-center">
          <span className="task-row-main text-[#666666] font-medium">
            {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'N/A'}
          </span>
        </div>

        {/* Status */}
        <div className="flex justify-center">
          <StatusBadge status={task.status || 'todo'} />
        </div>

        {/* Actions */}
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
            <MoreVertical className="w-4 h-4 text-[#666666]" />
          </button>
        </div>
      </div>
    </div>
  );
}
