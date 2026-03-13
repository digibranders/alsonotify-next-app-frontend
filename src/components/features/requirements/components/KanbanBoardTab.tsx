'use client';

import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Task } from '@/types/domain';

interface KanbanBoardTabProps {
  tasks: Task[];
  revisions: Task[];
}

type KanbanColumn = 'assigned' | 'in-progress' | 'delayed' | 'review' | 'completed';

const columnConfig: Record<KanbanColumn, { color: string; bg: string; dotBg: string; label: string }> = {
  'assigned': { color: 'text-[#666666]', bg: 'bg-[#F7F7F7]', dotBg: 'bg-[#666666]', label: 'Assigned' },
  'in-progress': { color: 'text-[#2F80ED]', bg: 'bg-[#E3F2FD]', dotBg: 'bg-[#2F80ED]', label: 'In Progress' },
  'delayed': { color: 'text-[#ff3b3b]', bg: 'bg-[#FFF5F5]', dotBg: 'bg-[#ff3b3b]', label: 'Delayed' },
  'review': { color: 'text-[#9C27B0]', bg: 'bg-[#F3E5F5]', dotBg: 'bg-[#9C27B0]', label: 'Review' },
  'completed': { color: 'text-[#0F9D58]', bg: 'bg-[#E8F5E9]', dotBg: 'bg-[#0F9D58]', label: 'Completed' }
};

export function KanbanBoardTab({ tasks, revisions }: KanbanBoardTabProps) {
  const allTasks = useMemo(() => [...tasks, ...revisions], [tasks, revisions]);

  const getColumnTasks = (column: KanbanColumn): Task[] => {
    return allTasks.filter((t) => {
      const status = (t.status || '').toLowerCase().replace(' ', '_');
      switch (column) {
        case 'assigned':
          return status === 'assigned' || status === 'pending' || status === 'todo' || !t.status;
        case 'in-progress':
          return status === 'in_progress' || status === 'inprogress';
        case 'delayed':
          return status === 'delayed' || status === 'on_hold';
        case 'review':
          return status === 'review';
        case 'completed':
          return status === 'completed' || status === 'done';
        default:
          return false;
      }
    });
  };

  const getAssignedInfo = (task: Task) => {
    if (task.member_user?.name) return { name: task.member_user.name, pic: task.member_user.profile_pic };
    if (task.task_members?.[0]?.user?.name) return { name: task.task_members[0].user.name, pic: task.task_members[0].user.profile_pic };
    return { name: 'Unassigned', pic: null };
  };

  const columns: KanbanColumn[] = ['assigned', 'in-progress', 'delayed', 'review', 'completed'];

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-5 min-w-[1000px] h-full pb-4">
        {columns.map((columnKey) => {
          const columnTasks = getColumnTasks(columnKey);
          const style = columnConfig[columnKey];

          return (
            <div key={columnKey} className="flex-1 min-w-[260px] flex flex-col bg-[#F7F7F7] rounded-[16px] p-4 border border-[#EEEEEE]">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${style.bg} w-fit`}>
                  <div className={`w-2 h-2 rounded-full ${style.dotBg}`} />
                  <span className={`text-xs font-bold ${style.color}`}>{style.label}</span>
                </div>
                <span className="text-xs font-semibold text-[#999999]">{columnTasks.length}</span>
              </div>

              {/* Column Content */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {columnTasks.length > 0 ? (
                  columnTasks.map((task) => {
                    const assignee = getAssignedInfo(task);
                    const isRevision = (task as Task & { type?: string }).type === 'revision';

                    return (
                      <div
                        key={task.id}
                        className="bg-white rounded-[12px] p-4 shadow-sm border border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-md transition-all cursor-pointer group"
                      >
                        {/* Task ID Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[0.625rem] px-1.5 py-0.5 rounded font-mono ${isRevision ? 'bg-[#FFF5F5] text-[#ff3b3b]' : 'bg-[#F7F7F7] text-[#999999]'
                            }`}>
                            #{task.id}
                          </span>
                          {task.is_high_priority && (
                            <span className="text-[0.5625rem] font-bold text-[#ff3b3b] uppercase">
                              High Priority
                            </span>
                          )}
                        </div>

                        {/* Task Title */}
                        <h4 className="text-xs font-semibold text-[#111111] mb-3 line-clamp-2">
                          {task.name}
                        </h4>

                        {/* Due Date */}
                        {task.end_date && (
                          <div className="flex items-center gap-1.5 mb-3 text-[0.6875rem] text-[#666666]">
                            <Clock className="w-3 h-3" />
                            <span>Due {format(new Date(task.end_date), 'MMM d')}</span>
                          </div>
                        )}

                        {/* Assignee */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[#EEEEEE]">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center shadow-sm">
                            <span className="text-[0.5625rem] text-white font-bold">
                              {assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <span className="text-[0.6875rem] text-[#666666] font-medium truncate">
                            {assignee.name}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-[#DDDDDD] rounded-[12px]">
                    <p className="text-xs text-[#999999] font-normal">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
