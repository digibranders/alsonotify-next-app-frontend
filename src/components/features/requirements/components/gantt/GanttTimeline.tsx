import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useGantt } from './GanttContext';
import { TimelineHeader } from './TimelineHeader';
import { eachDayOfInterval, isSameDay, format } from 'date-fns';
import { GanttTask } from './types';
import { DependencyLayer } from './DependencyLayer';
import { BarChart2 } from 'lucide-react';

export const GanttTimeline: React.FC = () => {
    const { tasks, dateRange, columnWidth, totalWidth, getDateX, getDateFromX, setVisibleDate, workingDayNumbers } = useGantt();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const scrollLeftPos = useRef(0);

    // Update the visible date label whenever the scroll position changes
    const updateVisibleDate = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const date = getDateFromX(scrollLeft);
        setVisibleDate(date);
    }, [getDateFromX, setVisibleDate]);

    const days = useMemo(() => {
        return eachDayOfInterval({
            start: dateRange.start,
            end: dateRange.end,
        });
    }, [dateRange]);

    // Today's vertical line X position
    const todayX = useMemo(() => getDateX(new Date()), [getDateX]);

    // --- Horizontal Drag-to-Scroll Logic ---
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
        scrollLeftPos.current = scrollContainerRef.current.scrollLeft;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, []);

    const onMouseLeave = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const onMouseUp = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5;
        scrollContainerRef.current.scrollLeft = scrollLeftPos.current - walk;
        updateVisibleDate();
    }, [isDragging, updateVisibleDate]);

    // --- Auto-scroll to center (Today) on Mount ---
    React.useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = totalWidth / 2 - scrollContainerRef.current.clientWidth / 2;
            updateVisibleDate();
        }
    }, [totalWidth]);

    // --- Update visible date on native scroll (wheel/trackpad) ---
    React.useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateVisibleDate, { passive: true });
        return () => el.removeEventListener('scroll', updateVisibleDate);
    }, [updateVisibleDate]);

    const visibleTasks = tasks.filter(t => t._visible);

    if (visibleTasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#FAFAFA]">
                <BarChart2 className="w-10 h-10 text-[#CCCCCC]" />
                <p className="text-[0.8125rem] font-semibold text-[#999999]">No tasks with dates to display</p>
                <p className="text-[0.6875rem] font-normal text-[#BBBBBB]">Add start and end dates to tasks to see them here</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative overflow-hidden">
            {/* Scrollable Container for both Header and Timeline */}
            <div
                ref={scrollContainerRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                className={`flex-grow flex flex-col overflow-x-auto overflow-y-auto relative scrollbar-none
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
                {/* The inner container width is determined by the totalWidth */}
                <div
                    style={{ width: `${totalWidth}px`, minHeight: '100%' }}
                    className="relative flex flex-col bg-white"
                >
                    {/* Header is INSIDE the horizontal scroll area */}
                    <div className="sticky top-0 z-30 border-b border-[#EEEEEE]">
                        <TimelineHeader />
                    </div>

                    <div className="relative flex-grow">
                        {/* Vertical Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                            {days.map((day, i) => {
                                const isNonWorkingDay = !workingDayNumbers.has(day.getDay());
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={i}
                                        style={{ width: `${columnWidth}px` }}
                                        className={`flex-shrink-0 h-full border-r border-[#F0F0F0]/60
                                            ${isNonWorkingDay ? 'bg-[#F5F5F5]/70' : ''}
                                            ${isToday ? 'bg-[#ff3b3b]/5' : ''}`}
                                    />
                                );
                            })}
                        </div>

                        {/* Today Vertical Line */}
                        <div
                            className="absolute top-0 bottom-0 z-20 pointer-events-none"
                            style={{ left: `${todayX}px`, width: '2px', backgroundColor: '#ff3b3b', opacity: 0.5 }}
                        />

                        {/* Rows & Bars */}
                        <div className="flex flex-col relative z-0">
                            {visibleTasks.map((task) => (
                                <TimelineRow key={task.id} task={task} />
                            ))}
                        </div>

                        <DependencyLayer />
                    </div>
                </div>
            </div>
        </div>
    );
};

const TimelineRow: React.FC<{ task: GanttTask }> = ({ task }) => {
    const { getDateX, columnWidth } = useGantt();
    const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

    const startX = task.start_date ? getDateX(new Date(task.start_date)) : 0;
    const endX = task.end_date ? getDateX(new Date(task.end_date)) : startX + columnWidth;
    const width = Math.max(columnWidth * 0.5, endX - startX);

    const tooltipLabel = [
        task.start_date ? `Start: ${format(new Date(task.start_date), 'MMM d, yyyy')}` : null,
        task.end_date ? `End: ${format(new Date(task.end_date), 'MMM d, yyyy')}` : null,
        task.progress != null ? `Progress: ${task.progress}%` : null,
    ].filter(Boolean).join('\n');

    if (!task._visible) return null;

    return (
        <div
            className="h-10 border-b border-[#F5F5F5] flex items-center relative group hover:bg-[#F9FAFB]/60 transition-colors"
            onMouseLeave={() => setTooltip(null)}
        >
            {(task.start_date || task.end_date) && (
                <div
                    className="absolute h-6 rounded-[4px] flex items-center cursor-pointer transition-all hover:brightness-95 shadow-sm overflow-hidden"
                    style={{
                        left: `${startX}px`,
                        width: `${width}px`,
                        backgroundColor: `${task.color}18`,
                        border: `1.5px solid ${task.color}50`,
                    }}
                    onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTooltip({ x: rect.left, y: rect.bottom + 6 });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                >
                    {/* Progress fill */}
                    <div
                        className="absolute left-0 top-0 bottom-0 z-0 rounded-l-[3px]"
                        style={{
                            width: `${task.progress || 0}%`,
                            backgroundColor: task.color,
                            opacity: 0.2
                        }}
                    />
                    <div className="relative z-10 flex items-center w-full px-2 overflow-hidden">
                        <span className="text-[0.625rem] font-bold truncate uppercase tracking-tight"
                            style={{ color: task.color }}>
                            {task.name}
                        </span>
                    </div>
                </div>
            )}

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
                >
                    <div className="bg-[#111111] text-white rounded-[8px] px-3 py-2 shadow-lg min-w-[160px]">
                        <p className="text-[0.6875rem] font-bold mb-1.5 text-white truncate max-w-[220px]">{task.name}</p>
                        {task.start_date && (
                            <p className="text-[0.625rem] font-normal text-[#AAAAAA]">
                                Start: <span className="text-white">{format(new Date(task.start_date), 'MMM d, yyyy')}</span>
                            </p>
                        )}
                        {task.end_date && (
                            <p className="text-[0.625rem] font-normal text-[#AAAAAA]">
                                End: <span className="text-white">{format(new Date(task.end_date), 'MMM d, yyyy')}</span>
                            </p>
                        )}
                        {task.progress != null && (
                            <div className="mt-1.5">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[0.5625rem] font-bold text-[#AAAAAA] uppercase tracking-wide">Progress</span>
                                    <span className="text-[0.5625rem] font-bold text-white">{task.progress}%</span>
                                </div>
                                <div className="h-1 bg-[#333333] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{ width: `${task.progress}%`, backgroundColor: task.color }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
