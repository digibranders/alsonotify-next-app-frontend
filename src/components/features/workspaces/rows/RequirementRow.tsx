import { Checkbox, Tooltip, Dropdown, MenuProps, Progress } from 'antd';
import { Calendar as CalendarIcon, MoreVertical, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';

interface Requirement {
  id: number;
  priority: string;
  title: string;
  client: string;
  department: string | null;
  timeline: string;
  budgetFormatted: string;
  assignedTo: string[];
  tasksCompleted: number;
  tasksTotal: number;
  progress: number;
  status: 'in-progress' | 'completed' | 'delayed';
  startDateValue?: number;
  budgetValue?: number;
}

interface RequirementRowProps {
  req: Requirement;
  workspaceId: number;
  userRole?: string;
}

export const RequirementRow = React.memo(function RequirementRow({ req, workspaceId, userRole }: RequirementRowProps) {
  const router = useRouter();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-5 h-5 rounded-full bg-[#0F9D58] flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        );
      case 'delayed':
        return (
          <div className="w-5 h-5 rounded-full bg-[#EB5757] flex items-center justify-center">
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        );
      default:
        return <Loader2 className="w-5 h-5 text-[#2F80ED] animate-spin" />;
    }
  };

  const menuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [];

    if (userRole !== 'Employee') {
      items.push(
        { key: 'edit', label: 'Edit Details' },
        { key: 'priority', label: 'Set Priority' },
        { type: 'divider' },
        { key: 'delete', label: 'Delete', danger: true },
      );
    }
    return items;
  }, [userRole]);

  return (
    <div
      onClick={() =>
        router.push(`/dashboard/workspace/${workspaceId}/requirements/${req.id}`)
      }
      className="group bg-white border border-[#EEEEEE] rounded-[16px] px-4 py-2 transition-all duration-300 cursor-pointer relative z-10 hover:border-[#ff3b3b]/20 hover:shadow-lg"
    >
      <div className="grid grid-cols-[40px_2.6fr_1.6fr_1.2fr_1.4fr_1.4fr_0.7fr_0.3fr] gap-4 items-center">
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox />
        </div>

        {/* Requirement + client */}
        <div className="flex items-start gap-3">
          <span
            className={`mt-1 w-2.5 h-2.5 rounded-full ${req.priority === 'high'
              ? 'bg-[#ff3b3b]'
              : req.priority === 'low'
                ? 'bg-[#FACC15]'
                : 'bg-[#F59E0B]'
              }`}
          />
          <div>
            <h3 className="task-row-main font-bold text-[#111111] group-hover:text-[#ff3b3b] transition-colors mb-1.5">
              {req.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="task-row-sub text-[#666666] font-medium">
                {req.client}
              </span>
              {req.department && (
                <span className="px-2 py-0.5 rounded-full bg-[#F7F7F7] text-xs font-medium text-[#666666]">
                  {req.department}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-2 task-row-main font-medium text-[#666666]">
          <CalendarIcon className="w-4 h-4 text-[#999999]" />
          <span>{req.timeline}</span>
        </div>

        {/* Budget */}
        <div className="task-row-main font-semibold text-[#16A34A]">
          {req.budgetFormatted}
        </div>

        {/* Team */}
        <div className="flex items-center justify-start">
          {req.assignedTo.length > 0 ? (
            <div className="flex items-center -space-x-2">
              {req.assignedTo.slice(0, 4).map((person: string, i: number) => {
                const initials = person
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <Tooltip key={i} title={person}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center border-2 border-white shadow-sm relative z-[5] hover:z-10 transition-all">
                      <span className="text-2xs text-white font-bold">
                        {initials}
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
              {req.assignedTo.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center border-2 border-white shadow-sm relative z-[1]">
                  <span className="text-2xs text-white font-bold">
                    +{req.assignedTo.length - 4}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="task-row-sub text-[#666666] font-medium">
              N/A
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-[80px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs text-[#666666] font-medium">
                {req.tasksCompleted}/{req.tasksTotal} Tasks
              </span>
              <span className="text-2xs text-[#111111] font-bold">
                {req.progress}%
              </span>
            </div>
            <Progress
              percent={req.progress}
              showInfo={false}
              strokeColor={
                req.status === 'completed'
                  ? '#0F9D58'
                  : req.status === 'delayed'
                    ? '#EB5757'
                    : '#2F80ED'
              }
              railColor="#F7F7F7"
              size="small"
              strokeLinecap="round"
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center">{getStatusIcon(req.status)}</div>

        {/* Actions */}
        <div className="flex justify-start" onClick={(e) => e.stopPropagation()}>
          {menuItems && menuItems.length > 0 && (
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
                <MoreVertical className="w-4 h-4 text-[#999999]" />
              </button>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
});
