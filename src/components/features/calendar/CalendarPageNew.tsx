import { useState, useMemo } from 'react';
import { useTabSync } from '@/hooks/useTabSync';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Loader2 } from 'lucide-react';
import { PageLayout } from '../../layout/PageLayout';
import { usePublicHolidays } from '@/hooks/useHoliday';
import dayjs from 'dayjs';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'deadline' | 'event' | 'leave' | 'holiday';
  participants?: string[];
  location?: string;
  color: string;
}

const eventsData: CalendarEvent[] = [
  {
    id: '1',
    title: 'Client Review - Triem Security',
    date: '2025-11-20',
    time: '10:00 AM',
    type: 'meeting',
    participants: ['Satyam Yadav', 'Appurva Panchakshai'],
    location: 'Zoom',
    color: '#3B82F6'
  },
  {
    id: '2',
    title: 'Cleanstart Podcast Deadline',
    date: '2025-11-22',
    time: '5:00 PM',
    type: 'deadline',
    color: '#ff3b3b'
  },
  {
    id: '3',
    title: 'Team Standup',
    date: '2025-11-21',
    time: '9:30 AM',
    type: 'meeting',
    participants: ['All Team'],
    location: 'Conference Room',
    color: '#16a34a'
  },
  {
    id: '4',
    title: 'Design Sprint Review',
    date: '2025-11-25',
    time: '2:00 PM',
    type: 'event',
    participants: ['Design Team'],
    color: '#8b5cf6'
  },
  {
    id: '5',
    title: 'Yusuf Shaikh - Sick Leave',
    date: '2025-11-26',
    time: 'All Day',
    type: 'leave',
    color: '#f59e0b'
  }
];

export function CalendarPage() {
  const [activeView, setActiveView] = useTabSync<'month' | 'week' | 'day' | 'agenda'>({
    defaultTab: 'month',
    validTabs: ['month', 'week', 'day', 'agenda']
  });

  const [currentMonth, setCurrentMonth] = useState('November 2025');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch Holidays
  const { data: holidaysData, isLoading: isLoadingHolidays } = usePublicHolidays();

  // Merge events with holidays
  const allEvents = useMemo(() => {
    const holidays: CalendarEvent[] = (holidaysData?.result || [])
      .filter((h: any) => !h.is_deleted)
      .map((h: any) => ({
        id: `holiday-${h.id}`,
        title: h.name,
        date: dayjs(h.date).format('YYYY-MM-DD'),
        time: 'All Day',
        type: 'holiday',
        color: '#8B5CF6' // Purple for holidays
      }));
    
    return [...eventsData, ...holidays];
  }, [holidaysData]);

  // Generate calendar days for November 2025
  const daysInMonth = 30;
  const startDay = 5;
  const calendarDays = [];

  for (let i = startDay - 1; i >= 0; i--) {
    calendarDays.push({ day: 31 - i, isCurrentMonth: false, date: `2025-10-${31 - i}` });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, isCurrentMonth: true, date: `2025-11-${i.toString().padStart(2, '0')}` });
  }

  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false, date: `2025-12-${i}` });
  }

  const getEventsForDate = (date: string) => {
    return allEvents.filter(event => event.date === date);
  };

  const todayEvents = allEvents.filter(e => e.date === '2025-11-20' && e.type !== 'holiday');
  const upcomingEvents = allEvents.filter(e => e.date > '2025-11-20' && e.type !== 'holiday').slice(0, 3);

  return (
    <PageLayout
      title="Calendar"
      tabs={[
        { id: 'month', label: 'Month' },
        { id: 'week', label: 'Week' },
        { id: 'day', label: 'Day' },
        { id: 'agenda', label: 'Agenda' }
      ]}
      activeTab={activeView}
      onTabChange={(tabId) => setActiveView(tabId as 'month' | 'week' | 'day' | 'agenda')}
      titleAction={{
        onClick: () => { }
      }}
    >
      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button className="w-9 h-9 rounded-[8px] border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F7F7F7] transition-colors">
          <ChevronLeft className="w-4 h-4 text-[#666666]" />
        </button>
        <div className="px-4 py-2 bg-[#F7F7F7] rounded-[8px] border border-[#EEEEEE]">
          <span className="font-['Manrope:SemiBold',sans-serif] text-sm text-[#111111]">
            {currentMonth}
          </span>
        </div>
        <button className="w-9 h-9 rounded-[8px] border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F7F7F7] transition-colors">
          <ChevronRight className="w-4 h-4 text-[#666666]" />
        </button>
        <button className="px-4 py-2 text-xs font-['Manrope:Medium',sans-serif] text-[#666666] hover:text-[#111111] transition-colors">
          Today
        </button>
      </div>

      <div className="flex-1 grid grid-cols-[1fr_320px] gap-6 overflow-hidden">
        {/* Calendar Grid */}
        <div className="overflow-y-auto scrollbar-hide">
          <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center py-2">
                  <span className="font-['Manrope:SemiBold',sans-serif] text-xs text-[#666666]">
                    {day}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((dayObj, index) => {
                const events = getEventsForDate(dayObj.date);
                const isToday = dayObj.date === '2025-11-20';

                return (
                  <div
                    key={index}
                    className={`min-h-[90px] p-2 rounded-[8px] border transition-all cursor-pointer ${dayObj.isCurrentMonth
                      ? 'bg-white border-[#EEEEEE] hover:border-[#ff3b3b] hover:bg-[#FFF5F5]'
                      : 'bg-[#F7F7F7] border-transparent'
                      } ${isToday ? 'border-[#ff3b3b] bg-[#FFF5F5]' : ''}`}
                    onClick={() => setSelectedDate(dayObj.date)}
                  >
                    <div className={`font-['Manrope:SemiBold',sans-serif] text-xs mb-1 ${dayObj.isCurrentMonth ? 'text-[#111111]' : 'text-[#999999]'
                      } ${isToday ? 'text-[#ff3b3b]' : ''}`}>
                      {dayObj.day}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="px-2 py-1 rounded-[4px] text-2xs font-['Manrope:Medium',sans-serif] text-white truncate"
                          style={{ backgroundColor: event.color }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-2xs font-['Manrope:Medium',sans-serif] text-[#666666] px-2">
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 overflow-y-auto scrollbar-hide">
          {/* Today's Events */}
          <div className="bg-[#F7F7F7] rounded-[16px] p-5 flex-shrink-0">
            <h4 className="font-['Manrope:SemiBold',sans-serif] text-sm text-[#111111] mb-4">
              Today&apos;s Events
            </h4>
            <div className="space-y-3">
              {isLoadingHolidays ? (
                 <div className="text-center py-2"><Loader2 className="w-4 h-4 animate-spin mx-auto text-[#999999]" /></div>
              ) : todayEvents.length > 0 ? (
                todayEvents.map((event) => (
                  <div key={event.id} className="bg-white rounded-[12px] p-4 border border-[#EEEEEE]">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-full rounded-full mt-1"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-['Manrope:SemiBold',sans-serif] text-xs text-[#111111] mb-1 break-words">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-['Manrope:Regular',sans-serif] text-[#666666] mb-2">
                          <Clock className="w-3 h-3" />
                          {event.time}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                        {event.type === 'holiday' && (
                          <div className="flex items-center gap-1 text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">
                             Public Holiday
                          </div>
                        )}
                        {event.type === 'holiday' && (
                          <div className="flex items-center gap-1 text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">
                             Public Holiday
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs font-['Manrope:Regular',sans-serif] text-[#999999]">
                  No events today
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-[#F7F7F7] rounded-[16px] p-5 flex-shrink-0">
            <h4 className="font-['Manrope:SemiBold',sans-serif] text-sm text-[#111111] mb-4">
              Upcoming
            </h4>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-[12px] p-4 border border-[#EEEEEE]">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1 h-full rounded-full mt-1"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1 min-w-0 w-full max-w-full">
                      <div className="font-['Manrope:SemiBold',sans-serif] text-xs text-[#111111] mb-1 break-words">
                        {event.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {event.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Types Legend */}
          <div className="bg-[#F7F7F7] rounded-[16px] p-5">
            <h4 className="font-['Manrope:SemiBold',sans-serif] text-sm text-[#111111] mb-4">
              Event Types
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                <span className="text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">Meetings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff3b3b]" />
                <span className="text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">Deadlines</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                <span className="text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span className="text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">Leaves</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                <span className="text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">Holidays</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                <span className="text-xs font-['Manrope:Regular',sans-serif] text-[#666666]">Holidays</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}