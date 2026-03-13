import React, { useMemo } from 'react';
import { useGantt } from './GanttContext';
import { format, eachDayOfInterval, isSameDay, getISOWeek, startOfISOWeek } from 'date-fns';

export const TimelineHeader: React.FC = () => {
    const { dateRange, columnWidth, workingDayNumbers } = useGantt();

    const days = useMemo(() => {
        return eachDayOfInterval({
            start: dateRange.start,
            end: dateRange.end,
        });
    }, [dateRange]);

    // Group days into ISO week spans for the top header row
    const weekIntervals = useMemo(() => {
        const weeks: { label: string; width: number }[] = [];
        if (days.length === 0) return weeks;

        let currentWeekKey = format(startOfISOWeek(days[0]), 'yyyy-ww');
        let currentWeekDays = 0;
        let currentWeekNum = getISOWeek(days[0]);

        days.forEach((day, idx) => {
            const weekKey = format(startOfISOWeek(day), 'yyyy-ww');
            if (weekKey !== currentWeekKey) {
                weeks.push({ label: `W${currentWeekNum}`, width: currentWeekDays * columnWidth });
                currentWeekKey = weekKey;
                currentWeekNum = getISOWeek(day);
                currentWeekDays = 1;
            } else {
                currentWeekDays++;
            }
            if (idx === days.length - 1) {
                weeks.push({ label: `W${currentWeekNum}`, width: currentWeekDays * columnWidth });
            }
        });

        return weeks;
    }, [days, columnWidth]);

    return (
        <div className="flex flex-col flex-shrink-0 bg-white">
            {/* Week Number Row */}
            <div className="flex h-9 bg-[#FAFAFA] border-b border-[#EEEEEE]">
                {weekIntervals.map((week, i) => (
                    <div
                        key={i}
                        style={{ width: `${week.width}px` }}
                        className="flex-shrink-0 border-r border-[#EEEEEE] flex items-center px-3"
                    >
                        <span className="text-xxs font-bold text-[#999999] uppercase tracking-[0.12em] truncate select-none">
                            {week.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Days Row */}
            <div className="flex h-8 bg-white border-b border-[#EEEEEE]">
                {days.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    const isNonWorkingDay = !workingDayNumbers.has(day.getDay());

                    return (
                        <div
                            key={i}
                            style={{ width: `${columnWidth}px` }}
                            className={`flex-shrink-0 border-r border-[#F0F0F0] flex flex-col items-center justify-center
                                ${isToday ? 'bg-[#ff3b3b]/5' : isNonWorkingDay ? 'bg-[#FAFAFA]' : ''}`}
                        >
                            {/* Day abbreviation */}
                            <span className={`text-[7px] font-bold uppercase tracking-tight mb-0.5 select-none
                                ${isToday ? 'text-[#ff3b3b]' : isNonWorkingDay ? 'text-[#BBBBBB]' : 'text-[#AAAAAA]'}`}>
                                {format(day, 'EEE')}
                            </span>

                            {/* Day number — today gets a red circle */}
                            {isToday ? (
                                <span className="w-4.5 h-4.5 flex items-center justify-center rounded-full bg-[#ff3b3b] text-white text-3xs font-bold select-none">
                                    {format(day, 'd')}
                                </span>
                            ) : (
                                <span className={`text-3xs font-bold select-none
                                    ${isNonWorkingDay ? 'text-[#BBBBBB]' : 'text-[#666666]'}`}>
                                    {format(day, 'd')}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
