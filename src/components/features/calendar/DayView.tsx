'use client';

import { useMemo, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Popover } from 'antd';
import { Skeleton } from '../../ui/Skeleton';
import { CalendarEventPopup } from './CalendarEventPopup';
import { CalendarEvent } from './types';

interface DayViewProps {
    currentDate: dayjs.Dayjs;
    events: CalendarEvent[];
    isLoading?: boolean;
    onTimeSlotClick?: (date: dayjs.Dayjs) => void;
}

// Helper to get minutes from start of day
const getMinutesFromStart = (event: CalendarEvent) => {
    if (event.time === 'All Day' || event.type === 'holiday' || event.type === 'leave') {
        return -1;
    }

    // Use the pre-calculated timezone-aware startDateTime if available
    if (event.startDateTime) {
        return event.startDateTime.hour() * 60 + event.startDateTime.minute();
    }

    if (event.time && event.date) {
        const dateTimeStr = `${event.date} ${event.time}`;
        const parsed = dayjs(dateTimeStr, 'YYYY-MM-DD h:mm A');
        if (parsed.isValid()) {
            return parsed.hour() * 60 + parsed.minute();
        }
    }

    return 9 * 60; // Default if parsing fails
};

const processEvents = (dayEvents: CalendarEvent[]) => {
    const allDayEvents: CalendarEvent[] = [];
    const timeEvents: CalendarEvent[] = [];

    dayEvents.forEach(e => {
        if (e.time === 'All Day' || e.type === 'holiday' || e.type === 'leave') {
            allDayEvents.push(e);
        } else {
            timeEvents.push(e);
        }
    });

    return { allDayEvents, timeEvents };
};

export function DayView({ currentDate, events, isLoading, onTimeSlotClick }: DayViewProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to 8 AM on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            const eightAM = 8 * 60; // 8 hours * 60 minutes
            scrollContainerRef.current.scrollTop = eightAM;
        }
    }, []);

    // Use 24 hours
    const hours = Array.from({ length: 24 }).map((_, i) => i);

    const { allDayEvents, timeEvents } = useMemo(() => {
        const dayEvents = events.filter(e => dayjs(e.date).isSame(currentDate, 'day'));
        return processEvents(dayEvents);
    }, [currentDate, events]);

    const isToday = currentDate.isSame(dayjs(), 'day');

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-white border border-[#EEEEEE] rounded-[16px] overflow-hidden animate-pulse">
                <div className="flex border-b border-[#EEEEEE] bg-white">
                    <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE]"></div>
                    <div className="flex-1 px-4 py-2 flex flex-col items-center">
                        <Skeleton className="h-3 w-16 mb-2" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
                <div className="flex-1 overflow-hidden flex">
                    <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE] space-y-12 py-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="h-3 w-8 mx-auto" />
                        ))}
                    </div>
                    <div className="flex-1 p-4 space-y-4">
                        <Skeleton className="h-20 w-3/4 rounded-lg" />
                        <Skeleton className="h-16 w-1/2 rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white border border-[#EEEEEE] rounded-[16px] overflow-hidden">

            {/* Scrollable Grid containing Header (sticky) and Body */}
            {/* Scrollable Grid containing Header (sticky) and Body */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative bg-white scrollbar-hide">

                {/* Header (Moved inside) */}
                <div className="flex border-b border-[#EEEEEE] sticky top-0 bg-white z-40">
                    <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE] bg-white"></div>
                    <div className="flex-1 px-4 py-2 bg-white flex justify-center border-l-0">
                        <div className="text-center">
                            <div className={`text-2xs font-semibold mb-0.5 ${isToday ? 'text-[#ff3b3b]' : 'text-[#666666]'}`}>
                                {currentDate.format('dddd').toUpperCase()}
                            </div>
                            <div className={`flex items-center justify-center`}>
                                <div className={`text-xl leading-none font-bold w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-[#ff3b3b] text-white' : 'text-[#111111]'}`}>
                                    {currentDate.format('D')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* All Day Section (Moved inside, stays at top under header?) 
                   Wait, all day usually scrolls WITH content in Google Calendar? 
                   Actually Google Calendar All Day section is sticky or separate. 
                   If I put it here, it will scroll up. 
                   If user wants alignment, All Day should also share width context.
                   Let's keep it here, but maybe not sticky? 
                   If it scrolls away, that's fine for now, or I can make it sticky top-[headerHeight].
                   For now, let's just let it scroll.
                */}
                {allDayEvents.length > 0 && (
                    <div className="border-b border-[#EEEEEE] flex">
                        <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE] bg-white flex items-center justify-center">
                            <span className="text-2xs text-[#666666] font-medium">All day</span>
                        </div>
                        <div className="flex-1 p-2 space-y-1">
                            {allDayEvents.map(event => (
                                <Popover key={event.id} content={<CalendarEventPopup event={event} />} trigger="click">
                                    <div
                                        className="px-3 py-1.5 rounded-[6px] text-white text-xs font-medium cursor-pointer inline-block mr-2 mb-1"
                                        style={{ backgroundColor: event.color }}
                                    >
                                        {event.title}
                                    </div>
                                </Popover>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex relative min-h-[1440px] z-0"> {/* 24 hours * 60px */}

                    {/* Time Scale */}
                    <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE] bg-white sticky left-0 z-30 select-none">
                        {hours.map(hour => (
                            <div key={hour} className="h-[60px] relative text-right pr-2">
                                <span className="text-2xs text-[#666666] font-medium -top-2 relative block transform -translate-y-1/2">
                                    {hour === 0 ? '' : dayjs().hour(hour).format('h A')}
                                </span>
                            </div>
                        ))}

                        {/* Current Time Indicator on Left Axis */}
                        <div
                            className="absolute right-0 w-full h-[2px] z-30 pointer-events-none flex items-center justify-end pr-1"
                            style={{ top: dayjs().hour() * 60 + dayjs().minute() }}
                        >
                            <div className="text-2xs font-bold text-white bg-[#ff3b3b] px-1.5 py-0.5 rounded-[4px] relative -top-[1px]">
                                {dayjs().format('h:mm')}
                            </div>
                        </div>
                    </div>

                    {/* Day Column */}
                    <div
                        className="flex-1 min-h-[1440px] relative group hover:bg-gray-50 transition-colors z-[1]"
                    >
                        {/* Grid Lines */}
                        {hours.map(h => (
                            <div key={h} className="absolute w-full border-b border-[#EEEEEE] h-[60px] pointer-events-none" style={{ top: h * 60 }}></div>
                        ))}

                        {/* Click Overlay - FINAL FIX */}
                        <div
                            className="absolute inset-0 z-[10] cursor-pointer"
                            style={{ height: '1440px' }} // Force height match
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const relativeY = e.clientY - rect.top;
                                const safeY = Math.max(0, relativeY);

                                const minutes = safeY;
                                const roundedMinutes = Math.round(minutes / 15) * 15;
                                const dayStart = dayjs(currentDate).startOf('day');
                                const eventTime = dayStart.add(roundedMinutes, 'minute');

                                onTimeSlotClick?.(eventTime);
                            }}
                        />

                        {/* Time Events */}
                        {timeEvents.map(event => {
                            const startMinutes = getMinutesFromStart(event);
                            const duration = 60; // Mock duration

                            return (
                                <Popover key={event.id} content={<CalendarEventPopup event={event} />} trigger="click">
                                    <div
                                        className="absolute w-[95%] left-[2.5%] rounded-[4px] px-4 py-3 cursor-pointer border-l-[3px] hover:shadow-md transition-shadow overflow-hidden z-10"
                                        style={{
                                            top: `${startMinutes}px`,
                                            height: `${duration}px`,
                                            backgroundColor: event.color + '20', // transparent bg
                                            borderLeftColor: event.color
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-[#111111]">
                                                    {event.title}
                                                </div>
                                                <div className="text-2xs font-medium text-[#666666] mt-1">
                                                    {event.time} {event.location ? ` | ${event.location}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        {event.description && (
                                            <div className="mt-2 text-2xs text-[#666666] line-clamp-2">
                                                {event.description}
                                            </div>
                                        )}
                                    </div>
                                </Popover>
                            );
                        })}

                        {/* Current Time Indicator for Today */}
                        {isToday && (
                            <div
                                className="absolute w-full h-[2px] bg-[#ff3b3b] z-30 pointer-events-none flex items-center"
                                style={{ top: dayjs().hour() * 60 + dayjs().minute() }}
                            >
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b3b] -ml-[5px] ring-2 ring-white"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
