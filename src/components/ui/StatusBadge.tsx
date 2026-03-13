import { Tooltip } from 'antd';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  showLabel?: boolean;
}

export function StatusBadge({ status, showLabel = false }: StatusBadgeProps) {
  let color = "bg-[#F7F7F7] text-[#666666]";
  let icon = <Clock className="w-3.5 h-3.5" />;
  let label = status;

  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      color = "bg-[#E8F5E9] text-[#0F9D58]";
      icon = <CheckCircle2 className="w-3.5 h-3.5" />;
      label = "Completed";
      break;
    case 'delayed':
      color = "bg-[#FFF5F5] text-[#ff3b3b]";
      icon = <AlertCircle className="w-3.5 h-3.5" />;
      label = "Delayed";
      break;
    case 'in-progress':
    case 'in_progress':
      color = "bg-[#E3F2FD] text-[#2F80ED]";
      icon = <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      label = "In Progress";
      break;
    case 'todo':
    case 'pending':
      color = "bg-[#F7F7F7] text-[#666666]";
      icon = <Clock className="w-3.5 h-3.5" />;
      label = "To Do";
      break;
  }

  if (showLabel) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${color} border border-current/10`}>
        {icon}
        <span className="task-row-main font-semibold uppercase tracking-wide lowercase first-letter:uppercase">
          {label}
        </span>
      </div>
    );
  }

  return (
    <Tooltip title={label}>
      <div className={`flex items-center justify-center w-7 h-7 rounded-full ${color} border border-current/10 cursor-help transition-transform hover:scale-110`}>
        {icon}
      </div>
    </Tooltip>
  );
}
