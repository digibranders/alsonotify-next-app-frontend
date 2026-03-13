import { Tooltip } from 'antd';
import { getTaskStatusUI } from '@/lib/workflow';

interface StatusBadgeProps {
  status: string;
  showLabel?: boolean;
}

export function TaskStatusBadge({ status, showLabel }: StatusBadgeProps) {
  const config = getTaskStatusUI(status);
  const { color, icon, label } = config;

  if (showLabel) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${color} border border-current/10`}>
        {icon}
        <span className="task-row-main font-semibold uppercase tracking-wide italic lowercase first-letter:uppercase">
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
