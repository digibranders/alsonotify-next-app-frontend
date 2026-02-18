import React from 'react';
import { useGantt } from './GanttContext';
import { ChevronRight, ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const GanttSidebar: React.FC = () => {
    const { tasks, toggleRow } = useGantt();

    return (
        <div className="flex flex-col h-full bg-white border-r border-[#EEEEEE]">
            {/* Sidebar Header */}
            <div className="h-[68px] border-b border-[#EEEEEE] flex items-center px-4 bg-[#FAFAFA] flex-shrink-0">
                <div className="flex-grow text-[0.6875rem] font-bold text-[#999999] uppercase tracking-widest">Task</div>
                <div className="w-14 text-center text-[0.625rem] font-bold text-[#999999] uppercase tracking-wider">Assignee</div>
            </div>

            {/* Sidebar Body */}
            <div className="flex-grow overflow-y-auto scrollbar-hide">
                <div className="flex flex-col">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="h-10 border-b border-[#F5F5F5] flex items-center px-2 hover:bg-[#F9FAFB] transition-colors group"
                        >
                            {/* Indent & Expander */}
                            <div
                                className="flex items-center min-w-0 flex-grow"
                                style={{ paddingLeft: `${task._depth * 14}px` }}
                            >
                                <div className="w-5 flex-shrink-0 flex items-center justify-center">
                                    {task._hasChildren ? (
                                        <button
                                            onClick={() => toggleRow(String(task.id))}
                                            className="p-0.5 hover:bg-[#EEEEEE] rounded transition-colors"
                                        >
                                            {task._isExpanded ? (
                                                <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5 text-[#666666]" />
                                            )}
                                        </button>
                                    ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#DDDDDD] ml-1 flex-shrink-0" />
                                    )}
                                </div>

                                {/* Task Label */}
                                <span className={cn(
                                    "ml-1.5 text-xs truncate",
                                    task._hasChildren
                                        ? "font-semibold text-[#111111]"
                                        : "font-normal text-[#555555]"
                                )}>
                                    {task.name}
                                </span>
                            </div>

                            {/* Assignee Avatar */}
                            <div className="w-14 flex-shrink-0 flex justify-center">
                                {task.member_user ? (
                                    <div
                                        className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[0.5625rem] font-bold text-white shadow-sm"
                                        style={{ backgroundColor: task.color || '#666666' }}
                                        title={task.member_user.name ?? undefined}
                                    >
                                        {task.member_user.name?.[0]?.toUpperCase() || <User className="w-3 h-3 text-white" />}
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-[#F5F5F5] border border-[#EEEEEE] flex items-center justify-center" title="Unassigned">
                                        <User className="w-3 h-3 text-[#CCCCCC]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
