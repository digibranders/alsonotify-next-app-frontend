import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Popover, Modal } from 'antd';
import { Skeleton } from '../../ui/Skeleton';
import { CalendarEventPopup } from './CalendarEventPopup';
import { CalendarEvent } from './types';

interface MonthViewProps {
    readonly currentDate: dayjs.Dayjs;
    readonly events: CalendarEvent[];
    readonly isLoading?: boolean;
    readonly selectedDate: string | null;
    readonly onSelectDate: (date: string) => void;
}

export function MonthView({ currentDate, events, isLoading, selectedDate, onSelectDate }: MonthViewProps) {
    const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
    const [moreModalDate, setMoreModalDate] = useState<string | null>(null);

    const handleMoreClick = (e: React.MouseEvent, date: string) => {
        e.stopPropagation();
        setMoreModalDate(date);
        setIsMoreModalOpen(true);
    };

    const calendarDays = useMemo(() => {
        const startOfMonth = currentDate.startOf('month');
        const startDayOfWeek = startOfMonth.day(); // 0 (Sun) to 6 (Sat)
        const daysInMonth = currentDate.daysInMonth();

        const days = [];

        // Previous month filler
        const prevMonth = currentDate.subtract(1, 'month');
        const daysInPrevMonth = prevMonth.daysInMonth();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const d = prevMonth.date(daysInPrevMonth - i);
            days.push({
                day: d.date(),
                isCurrentMonth: false,
                date: d.format('YYYY-MM-DD')
            });
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            const d = currentDate.date(i);
            days.push({
                day: i,
                isCurrentMonth: true,
                date: d.format('YYYY-MM-DD')
            });
        }

        // Next month filler - only fill to complete current row, not entire rows
        const totalDays = days.length;
        const remainingSlotsInLastRow = totalDays % 7;
        if (remainingSlotsInLastRow > 0) {
            // Only fill the remaining slots in the current row
            const nextMonth = currentDate.add(1, 'month');
            for (let i = 1; i <= (7 - remainingSlotsInLastRow); i++) {
                const d = nextMonth.date(i);
                days.push({
                    day: i,
                    isCurrentMonth: false,
                    date: d.format('YYYY-MM-DD')
                });
            }
        }

        // Remove last row if it contains only next month days
        if (days.length >= 7) {
            const lastRow = days.slice(-7);
            const allNextMonth = lastRow.every(day => !day.isCurrentMonth);
            if (allNextMonth) {
                return days.slice(0, -7);
            }
        }

        return days;
    }, [currentDate]);

    const weeks = useMemo(() => {
        const result = [];
        for (let i = 0; i < calendarDays.length; i += 7) {
            result.push(calendarDays.slice(i, i + 7));
        }
        return result;
    }, [calendarDays]);

    const getEventsForDate = (date: string) => {
        return events.filter(event => event.date === date);
    };

    if (isLoading) {
        return (
            <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-4 h-full flex flex-col animate-pulse">
                <table className="w-full h-full table-fixed border-separate border-spacing-2">
                    <thead>
                        <tr>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <th key={day} className="text-center py-2">
                                    <Skeleton className="h-4 w-8 mx-auto" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: 7 }).map((_, j) => (
                                    <td key={j} className="p-2 rounded-[8px] border border-[#EEEEEE] align-top h-24">
                                        <Skeleton className="h-4 w-4 mb-2" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-3 w-full rounded" />
                                            <Skeleton className="h-3 w-4/5 rounded" />
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-4 h-full flex flex-col overflow-auto scrollbar-hide">
            {/* Day Headers - using Table */}
            <table className="w-full h-full table-fixed border-separate border-spacing-2" role="grid" aria-label="Calendar Month View">
                <thead>
                    <tr>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <th key={day} className="text-center py-2">
                                <span className="font-semibold text-[0.8125rem] text-[#666666]">
                                    {day}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week, weekIndex) => (
                        <tr key={week[0].date} style={{ height: `${100 / weeks.length}%` }}>
                            {week.map((dayObj, dayIndex) => {
                                const index = weekIndex * 7 + dayIndex;
                                const dayEvents = getEventsForDate(dayObj.date);
                                const isToday = dayObj.date === dayjs().format('YYYY-MM-DD');
                                const isSelected = selectedDate === dayObj.date;
                                const dateDesc = dayjs(dayObj.date).format('dddd, MMMM D, YYYY');
                                const label = isToday ? `Today, ${dateDesc}` : dateDesc;

                                return (
                                    <td
                                        key={index}
                                        aria-label={label}
                                        aria-selected={isSelected}
                                        tabIndex={0}
                                        className={`p-2 rounded-[8px] border transition-all cursor-pointer align-top focus:ring-2 focus:ring-[#111111] focus:outline-none overflow-hidden ${dayObj.isCurrentMonth
                                            ? 'bg-white border-[#EEEEEE] hover:border-[#ff3b3b] hover:bg-[#FFF5F5]'
                                            : 'bg-[#F7F7F7] border-transparent'
                                            } ${isToday ? 'border-[#ff3b3b] bg-[#FFF5F5]' : ''} ${isSelected && !isToday ? 'border-gray-400' : ''}`}
                                        onClick={() => onSelectDate(dayObj.date)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onSelectDate(dayObj.date);
                                            }
                                            // Navigation logic update
                                            const table = e.currentTarget.closest('table');
                                            if (!table) return;
                                            const cells = Array.from(table.querySelectorAll('tbody td')) as HTMLElement[];
                                            const currentIndex = cells.indexOf(e.currentTarget);

                                            let nextIndex = -1;
                                            if (e.key === 'ArrowRight') nextIndex = currentIndex + 1;
                                            if (e.key === 'ArrowLeft') nextIndex = currentIndex - 1;
                                            if (e.key === 'ArrowDown') nextIndex = currentIndex + 7;
                                            if (e.key === 'ArrowUp') nextIndex = currentIndex - 7;

                                            if (nextIndex >= 0 && nextIndex < cells.length) {
                                                e.preventDefault();
                                                cells[nextIndex].focus();
                                            }
                                        }}
                                    >
                                        <div className="flex flex-col h-full">
                                            <div className={`font-semibold text-[0.8125rem] mb-1 flex justify-between items-center ${dayObj.isCurrentMonth ? 'text-[#111111]' : 'text-[#999999]'
                                                } ${isToday ? 'text-[#ff3b3b]' : ''}`}>
                                                <span aria-hidden="true">{dayObj.day}</span>
                                                {isToday && <span className="text-[0.625rem] bg-[#ff3b3b] text-white px-1.5 rounded" aria-hidden="true">Today</span>}
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                {dayEvents.slice(0, 3).map((event) => (
                                                    <Popover key={event.id} content={<CalendarEventPopup event={event} />} trigger="click">
                                                        <button
                                                            type="button"
                                                            aria-label={`Event: ${event.title}`}
                                                            className="px-2 py-1 rounded-[4px] text-[0.625rem] font-medium text-white truncate cursor-pointer hover:opacity-80 transition-opacity focus:ring-1 focus:ring-white focus:outline-none w-full text-left border-none"
                                                            style={{ backgroundColor: event.color }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.stopPropagation();
                                                                }
                                                            }}
                                                        >
                                                            {event.title}
                                                        </button>
                                                    </Popover>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div 
                                                        className="text-[0.625rem] font-medium text-[#666666] px-2 mt-1 cursor-pointer hover:underline"
                                                        onClick={(e) => handleMoreClick(e, dayObj.date)}
                                                    >
                                                        +{dayEvents.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            <Modal
                title={`Events on ${moreModalDate ? dayjs(moreModalDate).format('MMMM D, YYYY') : ''}`}
                open={isMoreModalOpen}
                onCancel={() => setIsMoreModalOpen(false)}
                footer={null}
                centered
            >
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 mt-4">
                    {moreModalDate && getEventsForDate(moreModalDate).map((event) => (
                        <Popover key={event.id} content={<CalendarEventPopup event={event} />} trigger="click">
                            <div
                                className="px-3 py-2 rounded-[6px] text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity w-full text-left"
                                style={{ backgroundColor: event.color }}
                            >
                                <div className="font-semibold">{event.title}</div>
                                <div className="text-xs opacity-90">{event.time}</div>
                            </div>
                        </Popover>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
