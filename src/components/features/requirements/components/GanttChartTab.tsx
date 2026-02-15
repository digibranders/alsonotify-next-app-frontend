'use client';

import { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { Button, Tooltip } from 'antd';
import { format } from 'date-fns';
import { Task } from '@/types/domain';

type GanttViewMode = 'day' | 'week' | 'month';

interface GanttChartTabProps {
  tasks: Task[];
  revisions: Task[];
  ganttView: GanttViewMode;
  setGanttView: (view: GanttViewMode) => void;
}

// Helper functions
const calculateDaysBetween = (start: Date, end: Date): number => {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const getStatusStyles = (status: string): { bg: string; border: string; text: string } => {
  const statusLower = (status || '').toLowerCase();
  if (statusLower === 'completed' || statusLower === 'done') {
    return { bg: 'bg-[#0F9D58]', border: 'border-[#0F9D58]', text: 'text-white' };
  }
  if (statusLower === 'delayed' || statusLower === 'stuck' || statusLower === 'impediment') {
    return { bg: 'bg-[#DC2626]', border: 'border-[#DC2626]', text: 'text-white' };
  }
  if (statusLower === 'in_progress' || statusLower === 'inprogress') {
    return { bg: 'bg-[#2F80ED]', border: 'border-[#2F80ED]', text: 'text-white' };
  }
  return { bg: 'bg-[#F59E0B]', border: 'border-[#F59E0B]', text: 'text-white' };
};

const getProgressPercentage = (task: Task): number => {
  if (task.status?.toLowerCase() === 'completed' || task.status?.toLowerCase() === 'done') return 100;
  if (!task.estimated_time || !task.total_seconds_spent) return 0;
  const estimatedSeconds = Number(task.estimated_time) * 3600;
  const spent = task.total_seconds_spent || 0;
  return Math.min(100, Math.round((spent / estimatedSeconds) * 100));
};

export function GanttChartTab({ tasks, revisions, ganttView, setGanttView }: GanttChartTabProps) {
  const allTasks = useMemo(() => [...tasks, ...revisions], [tasks, revisions]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Calculate timeline bounds from task data
  const { timelineStart, timelineEnd, columnDates } = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();
    let hasValidDates = false;

    allTasks.forEach((task) => {
      if (task.start_date) {
        const start = new Date(task.start_date);
        if (!hasValidDates || start < minDate) minDate = new Date(start);
        hasValidDates = true;
      }
      if (task.end_date) {
        const end = new Date(task.end_date);
        if (!hasValidDates || end > maxDate) maxDate = new Date(end);
        hasValidDates = true;
      }
    });

    // Default range if no valid dates
    if (!hasValidDates) {
      minDate = new Date(today);
      minDate.setDate(minDate.getDate() - 7);
      maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 21);
    } else {
      // Add buffer
      minDate.setDate(minDate.getDate() - 3);
      maxDate.setDate(maxDate.getDate() + 7);
    }

    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(0, 0, 0, 0);

    // Generate column dates based on view
    const dates: Date[] = [];
    const totalDays = calculateDaysBetween(minDate, maxDate) + 1;

    if (ganttView === 'day') {
      // Day view: Show individual days (max 21)
      const daysToShow = Math.min(totalDays, 21);
      for (let i = 0; i < daysToShow; i++) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    } else if (ganttView === 'week') {
      // Week view: Show 4 weeks with days grouped
      const daysToShow = Math.min(totalDays, 28);
      for (let i = 0; i < daysToShow; i++) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    } else {
      // Month view: Show individual days for 2 months
      const daysToShow = Math.min(totalDays, 60);
      for (let i = 0; i < daysToShow; i++) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    }

    return {
      timelineStart: dates[0] || minDate,
      timelineEnd: dates[dates.length - 1] || maxDate,
      columnDates: dates
    };
  }, [allTasks, ganttView, today]);

  const timelineDays = calculateDaysBetween(timelineStart, timelineEnd) + 1;

  // Calculate today's position on the timeline
  const todayPosition = useMemo(() => {
    if (today < timelineStart || today > timelineEnd) return -1;
    return (calculateDaysBetween(timelineStart, today) / timelineDays) * 100;
  }, [today, timelineStart, timelineEnd, timelineDays]);

  // Get bar position for a task
  const getBarPosition = (task: Task) => {
    const startDate = task.start_date ? new Date(task.start_date) : today;
    const endDate = task.end_date ? new Date(task.end_date) : new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const startDiff = calculateDaysBetween(timelineStart, startDate);
    const duration = calculateDaysBetween(startDate, endDate) + 1;

    const left = Math.max(0, (startDiff / timelineDays) * 100);
    const width = Math.min(100 - left, (duration / timelineDays) * 100);

    return { left, width };
  };

  // Get assigned name helper
  const getAssignedName = (task: Task): string => {
    if (task.member_user?.name) return task.member_user.name;
    if (task.task_members?.[0]?.user?.name) return task.task_members[0].user.name;
    return 'Unassigned';
  };

  // Column width based on view mode
  const getColumnWidth = (): string => {
    if (ganttView === 'day') return 'min-w-[60px]';
    if (ganttView === 'week') return 'min-w-[36px]';
    return 'min-w-[24px]';
  };

  // Render week headers for week/month view
  const weekHeaders = useMemo(() => {
    if (ganttView === 'day') return null;

    const weeks: { start: number; end: number; label: string }[] = [];
    columnDates.forEach((date, idx) => {
      const isFirstDay = idx === 0;
      const isMonday = date.getDay() === 1;
      const isLastDay = idx === columnDates.length - 1;

      if (isFirstDay || isMonday) {
        if (weeks.length > 0) {
          weeks[weeks.length - 1].end = idx - 1;
        }
        weeks.push({
          start: idx,
          end: idx,
          label: ganttView === 'week'
            ? `Week ${getWeekNumber(date)}`
            : format(date, 'MMM yyyy')
        });
      }

      if (isLastDay && weeks.length > 0) {
        weeks[weeks.length - 1].end = idx;
      }
    });

    return weeks;
  }, [columnDates, ganttView]);

  return (
    <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-6 border-b border-[#EEEEEE] flex justify-between items-center shrink-0">
        <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111] flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#ff3b3b]" />
          Gantt Chart
          <span className="text-[12px] font-['Inter:Regular',sans-serif] text-[#999999] ml-2">
            {allTasks.length} task{allTasks.length !== 1 ? 's' : ''}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          {/* View Toggle Buttons */}
          <div className="flex bg-[#F7F7F7] rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <Button
                key={mode}
                type="text"
                size="small"
                className={`h-7 px-3 text-[12px] rounded-md transition-all ${ganttView === mode
                  ? 'bg-white shadow-sm text-[#111111] font-semibold'
                  : 'text-[#666666] hover:text-[#111111]'
                  }`}
                onClick={() => setGanttView(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Chart Body */}
      <div className="flex-1 overflow-auto">
        {/* Week/Month Headers (for week and month view) */}
        {weekHeaders && (
          <div className="flex border-b border-[#EEEEEE] min-w-max sticky top-0 bg-[#FAFAFA] z-30">
            <div className="w-[280px] shrink-0 border-r border-[#EEEEEE]" />
            <div className="flex-1 flex">
              {weekHeaders.map((week, idx) => {
                const span = week.end - week.start + 1;
                return (
                  <div
                    key={idx}
                    className="text-center p-2 border-r border-[#EEEEEE] text-[11px] font-['Manrope:SemiBold',sans-serif] text-[#666666] uppercase tracking-wide"
                    style={{ flexBasis: `${(span / columnDates.length) * 100}%` }}
                  >
                    {week.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline Header */}
        <div className="flex border-b border-[#EEEEEE] min-w-max sticky top-0 bg-white z-20" style={{ top: weekHeaders ? '36px' : '0' }}>
          {/* Task Name Column Header */}
          <div className="w-[280px] p-3 font-['Manrope:Bold',sans-serif] text-[12px] text-[#666666] uppercase tracking-wide border-r border-[#EEEEEE] sticky left-0 bg-white z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-2 shrink-0">
            <span>Task</span>
            <span className="text-[#CCCCCC]">|</span>
            <span className="font-normal text-[#999999]">Assigned To</span>
          </div>

          {/* Date Headers */}
          <div className="flex flex-1">
            {columnDates.map((date, i) => {
              const isToday = date.toDateString() === today.toDateString();
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isFirstOfMonth = date.getDate() === 1;

              return (
                <div
                  key={i}
                  className={`flex-1 ${getColumnWidth()} border-r border-[#EEEEEE] py-2 px-1 text-center ${isWeekend ? 'bg-[#FAFAFA]' : ''
                    } ${isToday ? 'bg-[#FFF5F5]' : ''} ${isFirstOfMonth && ganttView !== 'day' ? 'border-l-2 border-l-[#DDDDDD]' : ''
                    }`}
                >
                  {ganttView === 'day' && (
                    <>
                      <div className="text-[10px] text-[#999999] font-['Inter:SemiBold',sans-serif] uppercase">
                        {format(date, 'EEE')}
                      </div>
                      <div className={`text-[12px] font-['Manrope:Bold',sans-serif] ${isToday ? 'text-[#ff3b3b]' : 'text-[#111111]'}`}>
                        {date.getDate()}
                      </div>
                      {i === 0 && (
                        <div className="text-[9px] text-[#999999]">{format(date, 'MMM')}</div>
                      )}
                    </>
                  )}
                  {ganttView === 'week' && (
                    <div className={`text-[10px] font-['Inter:SemiBold',sans-serif] ${isToday ? 'text-[#ff3b3b] font-bold' : isWeekend ? 'text-[#BBBBBB]' : 'text-[#666666]'}`}>
                      {date.getDate()}
                    </div>
                  )}
                  {ganttView === 'month' && (
                    <div className={`text-[9px] font-['Inter:Medium',sans-serif] ${isToday ? 'text-[#ff3b3b] font-bold' : 'text-[#888888]'}`}>
                      {date.getDate()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Rows */}
        <div className="min-w-max relative">
          {/* Today Marker */}
          {todayPosition >= 0 && todayPosition <= 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#ff3b3b] z-10 pointer-events-none"
              style={{ left: `calc(280px + ${todayPosition}% * (100% - 280px) / 100)` }}
            />
          )}

          {allTasks.length > 0 ? (
            allTasks.map((task, taskIdx) => {
              const { left, width } = getBarPosition(task);
              const statusStyles = getStatusStyles(task.status || '');
              const assignedName = getAssignedName(task);
              const isRevision = (task as Task & { type?: string }).type === 'revision';
              const progress = getProgressPercentage(task);

              return (
                <div
                  key={task.id}
                  className="flex border-b border-[#FAFAFA] hover:bg-[#FAFAFA] transition-colors group"
                >
                  {/* Task Info Column */}
                  <div className="w-[280px] p-3 border-r border-[#EEEEEE] flex items-center gap-3 sticky left-0 bg-white group-hover:bg-[#FAFAFA] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] shrink-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${isRevision ? 'bg-[#FFF5F5] text-[#ff3b3b]' : 'bg-[#F7F7F7] text-[#999999]'
                          }`}>
                          #{task.id}
                        </span>
                        <span className="text-[12px] text-[#111111] font-['Manrope:SemiBold',sans-serif] truncate">
                          {task.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#999999] font-['Inter:Regular',sans-serif] mt-0.5 truncate">
                        {assignedName}
                      </div>
                    </div>
                    {/* Mini Progress Indicator */}
                    <div className="w-8 h-8 relative shrink-0">
                      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="12" fill="none" stroke="#EEEEEE" strokeWidth="3" />
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke={progress === 100 ? '#0F9D58' : '#ff3b3b'}
                          strokeWidth="3"
                          strokeDasharray={`${progress * 0.75} 75`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-['Manrope:Bold',sans-serif] text-[#666666]">
                        {progress}%
                      </span>
                    </div>
                  </div>

                  {/* Timeline Area */}
                  <div className="flex-1 relative py-2" style={{ minHeight: '48px' }}>
                    {/* Grid Lines */}
                    {columnDates.map((date, i) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={`absolute inset-y-0 ${isWeekend ? 'bg-[#FAFAFA]' : ''}`}
                          style={{
                            left: `${(i / columnDates.length) * 100}%`,
                            width: `${100 / columnDates.length}%`,
                            borderRight: '1px solid #F5F5F5'
                          }}
                        />
                      );
                    })}

                    {/* Task Bar */}
                    <Tooltip
                      title={
                        <div className="text-xs space-y-1">
                          <div className="font-bold">{task.name}</div>
                          <div>Start: {task.start_date ? format(new Date(task.start_date), 'MMM d, yyyy') : 'Not set'}</div>
                          <div>End: {task.end_date ? format(new Date(task.end_date), 'MMM d, yyyy') : 'Not set'}</div>
                          <div>Assigned: {assignedName}</div>
                          <div>Status: {task.status || 'Pending'}</div>
                          <div>Progress: {progress}%</div>
                        </div>
                      }
                    >
                      <div
                        className={`absolute h-6 rounded-[4px] top-1/2 -translate-y-1/2 flex items-center shadow-sm cursor-pointer hover:shadow-md transition-all overflow-hidden ${statusStyles.bg}`}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 3)}%`,
                          minWidth: '32px'
                        }}
                      >
                        {/* Progress Fill */}
                        <div
                          className="absolute inset-y-0 left-0 bg-black/10"
                          style={{ width: `${progress}%` }}
                        />
                        {/* Task Name on Bar */}
                        <span className={`relative z-10 text-[10px] font-['Manrope:SemiBold',sans-serif] px-2 truncate w-full ${statusStyles.text}`}>
                          {width > 8 ? (task.name) : ''}
                        </span>
                      </div>
                    </Tooltip>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-[#999999] text-[14px] font-['Inter:Regular',sans-serif]">
              <BarChart2 className="w-12 h-12 mx-auto mb-4 text-[#DDDDDD]" />
              No tasks to display on the Gantt chart
            </div>
          )}
        </div>
      </div>

      {/* Footer Legend */}
      <div className="p-4 border-t border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#F59E0B]" />
            <span className="text-[11px] text-[#666666] font-['Inter:Medium',sans-serif]">Assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#2F80ED]" />
            <span className="text-[11px] text-[#666666] font-['Inter:Medium',sans-serif]">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#DC2626]" />
            <span className="text-[11px] text-[#666666] font-['Inter:Medium',sans-serif]">Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#0F9D58]" />
            <span className="text-[11px] text-[#666666] font-['Inter:Medium',sans-serif]">Completed</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-[#ff3b3b]" />
          <span className="text-[11px] text-[#666666] font-['Inter:Medium',sans-serif]">Today</span>
        </div>
      </div>
    </div>
  );
}
