'use client';

import { useMemo, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Popover } from 'antd';
import { Skeleton } from '../../ui/Skeleton';
import { CalendarEventPopup } from './CalendarEventPopup';
import { CalendarEvent } from './types';

interface WeekViewProps {
    currentDate: dayjs.Dayjs;
    events: CalendarEvent[];
    isLoading?: boolean;
    onTimeSlotClick?: (date: dayjs.Dayjs) => void;
}

export function WeekView({ currentDate, events, isLoading, onTimeSlotClick }: WeekViewProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to 8 AM on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            const eightAM = 8 * 60; // 8 hours * 60 minutes
            scrollContainerRef.current.scrollTop = eightAM;
        }
    }, []);

    const weekDays = useMemo(() => {
        const startOfWeek = currentDate.startOf('week'); // Sunday
        return Array.from({ length: 7 }).map((_, i) => {
            const date = startOfWeek.add(i, 'day');
            return {
                date: date,
                label: date.format('ddd'),
                day: date.format('D'),
                isToday: date.isSame(dayjs(), 'day')
            };
        });
    }, [currentDate]);

    // Use 24 hours
    const hours = Array.from({ length: 24 }).map((_, i) => i);


    const getEventsForDay = (date: dayjs.Dayjs) => {
        return events.filter(e => dayjs(e.date).isSame(date, 'day'));
    };

    // Need a function to parse the time string from the event object properly as it seems loosely typed in existing code ('10:00 AM', 'All Day', 'Deadline')
    // Existing code constructs 'time' string for display. We need valid datetime for positioning.
    // The `raw` field might have the ISO strings.
    
    // Helper to get minutes from start of day
    const getMinutesFromStart = (event: CalendarEvent) => {
        if (event.time === 'All Day' || event.type === 'holiday' || event.type === 'leave') {
             return -1; // All day events handled separately
        }
        
        // Use the pre-calculated timezone-aware startDateTime if available
        if (event.startDateTime) {
            return event.startDateTime.hour() * 60 + event.startDateTime.minute();
        }

        // Check if event.time is a valid time string (e.g. "10:00 AM")
        if (event.time && event.date) {
             // Construct a parseable string
             const dateTimeStr = `${event.date} ${event.time}`;
             const parsed = dayjs(dateTimeStr, 'YYYY-MM-DD h:mm A');
             if (parsed.isValid()) {
                return parsed.hour() * 60 + parsed.minute();
             }
        }

        // Fallback
        return 9 * 60; // Default to 9 AM if parsing fails
    };

    // Group events into "All Day" and "Time" events
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

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-white border border-[#EEEEEE] rounded-[16px] overflow-hidden animate-pulse">
                <div className="flex border-b border-[#EEEEEE] bg-white">
                    <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE]"></div>
                    <div className="flex-1 grid grid-cols-7">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="py-2 text-center border-r border-[#EEEEEE] last:border-r-0">
                                <Skeleton className="h-3 w-8 mx-auto mb-2" />
                                <Skeleton className="h-7 w-7 rounded-full mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden flex">
                    <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE] space-y-12 py-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="h-3 w-8 mx-auto" />
                        ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="border-r border-[#EEEEEE] last:border-r-0 p-2 space-y-4">
                                <Skeleton className="h-12 w-full rounded" />
                                <Skeleton className="h-16 w-full rounded" />
                            </div>
                        ))}
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
                
                {/* Header (Moved inside to share scrollbar width context) */}
                <div className="flex border-b border-[#EEEEEE] sticky top-0 bg-white z-40">
                    <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE] bg-white"></div>
                    <div className="flex-1 grid grid-cols-7">
                        {weekDays.map((d, i) => (
                            <div key={i} className={`py-2 text-center border-r border-[#EEEEEE] last:border-r-0 ${d.isToday ? 'bg-[#ff3b3b]/5' : ''}`}>
                                <div className={`text-[11px] font-['Manrope:SemiBold',sans-serif] mb-0.5 ${d.isToday ? 'text-[#ff3b3b]' : 'text-[#666666]'}`}>
                                    {d.label.toUpperCase()}
                                </div>
                                <div className={`flex items-center justify-center`}>
                                    <div className={`text-[20px] leading-none font-['Manrope:Bold',sans-serif] w-8 h-8 flex items-center justify-center rounded-full ${d.isToday ? 'bg-[#ff3b3b] text-white' : 'text-[#111111]'}`}>
                                        {d.day}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex relative min-h-[1440px] z-0"> {/* 24 hours * 60px */}
                    
                    {/* Time Scale */}
                    <div className="w-16 flex-shrink-0 border-r border-[#EEEEEE] bg-white sticky left-0 z-30 select-none">
                        {hours.map(hour => (
                            <div key={hour} className="h-[60px] relative text-right pr-2">
                                <span className="text-[11px] text-[#666666] font-['Manrope:Medium',sans-serif] -top-2 relative block transform -translate-y-1/2">
                                    {hour === 0 ? '' : dayjs().hour(hour).format('h A')}
                                </span>
                            </div>
                        ))}

                        {/* Current Time Indicator on Left Axis */}
                        <div 
                            className="absolute right-0 w-full h-[2px] z-30 pointer-events-none flex items-center justify-end pr-1"
                            style={{ top: dayjs().hour() * 60 + dayjs().minute() }}
                        >
                             <div className="text-[10px] font-['Manrope:Bold',sans-serif] text-white bg-[#ff3b3b] px-1.5 py-0.5 rounded-[4px] relative -top-[1px]">
                                {dayjs().format('h:mm')}
                            </div>
                        </div>
                    </div>

                    {/* Days Columns */}
                    <div className="flex-1 grid grid-cols-7 h-full">
                         {weekDays.map((dayObj, dayIndex) => {
                             const { allDayEvents, timeEvents } = processEvents(getEventsForDay(dayObj.date));

                             return (
                                 <div 
                                    key={dayIndex} 
                                    className={`relative border-r border-[#E0E0E0] last:border-r-0 min-h-[1440px] ${dayObj.isToday ? 'bg-[#F7F7F7]' : ''} group z-[1]`}
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
                                            
                                            const dayStart = dayjs(dayObj.date).startOf('day');
                                            const eventTime = dayStart.add(roundedMinutes, 'minute');
                                            
                                            onTimeSlotClick?.(eventTime);
                                        }}
                                     />

                                     {/* All Day Events Stacked at top */}
                                     {allDayEvents.map((ep, idx) => (
                                         <Popover key={ep.id} content={<CalendarEventPopup event={ep} />} trigger="click">
                                             <div 
                                                className="absolute w-[95%] left-[2.5%] text-[10px] px-2 py-1 rounded-[4px] text-white truncate cursor-pointer z-20 hover:opacity-90"
                                                style={{ 
                                                    top: `${idx * 22 + 2}px`, 
                                                    height: '20px',
                                                    backgroundColor: ep.color 
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                             >
                                                {ep.title}
                                             </div>
                                         </Popover>
                                     ))}

                                     {/* Time Events */}
                                     {timeEvents.map(event => {
                                         const startMinutes = getMinutesFromStart(event);
                                         const duration = 60; 
                                         
                                         return (
                                            <Popover key={event.id} content={<CalendarEventPopup event={event} />} trigger="click">
                                             <div
                                                 className="absolute w-[95%] left-[2.5%] rounded-[4px] px-2 py-1 cursor-pointer border-l-[3px] hover:shadow-md transition-shadow overflow-hidden z-10"
                                                 style={{
                                                     top: `${startMinutes}px`,
                                                     height: `${duration}px`,
                                                     backgroundColor: event.color + '20', // transparent bg
                                                     borderLeftColor: event.color
                                                 }}
                                                 onClick={(e) => e.stopPropagation()}
                                             >
                                                 <div className="text-[11px] font-['Manrope:SemiBold',sans-serif] text-[#111111] leading-tight truncate">
                                                     {event.title}
                                                 </div>
                                                 <div className="text-[10px] font-['Manrope:Medium',sans-serif] text-[#666666] leading-tight truncate mt-0.5">
                                                     {event.time}
                                                 </div>
                                             </div>
                                            </Popover>
                                         );
                                     })}
                                     
                                     {/* Current Time Line in the grid (Line only) */}
                                     {dayObj.isToday && (
                                         <div 
                                            className="absolute w-full h-[2px] bg-[#ff3b3b] z-30 pointer-events-none flex items-center"
                                            style={{ top: dayjs().hour() * 60 + dayjs().minute() }}
                                         >
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b3b] -ml-[5px] ring-2 ring-white"></div>
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                    </div>
                </div>
             </div>
        </div>
    );
}

