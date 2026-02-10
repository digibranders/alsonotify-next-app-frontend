'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTabSync } from '@/hooks/useTabSync';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Video, Plus, LogOut } from 'lucide-react';
import { Skeleton } from '../../ui/Skeleton';
import { PageLayout } from '../../layout/PageLayout';
import { Popover, Button, App, Popconfirm } from 'antd';
import dayjs from '@/utils/dayjs';
import { formatDateForApi, formatDateForDisplay } from '@/utils/date';

import { useTasks } from '@/hooks/useTask';
import { useMeetings } from '@/hooks/useMeeting';
import { useLeaves, useCompanyLeaves } from '@/hooks/useLeave';
import { useTeamsConnectionStatus, useCalendarEvents, useDisconnectTeams } from '@/hooks/useCalendar';
import { usePublicHolidays } from '@/hooks/useHoliday';
import { MicrosoftUserOAuth, GraphEvent } from '@/services/calendar';
import { useEmployees, useCurrentUserCompany, useUserDetails } from '@/hooks/useUser';
// import { TaskType } from '@/services/task'; // Removed to avoid confusion
import { MeetingType } from '@/services/meeting';
import { LeaveType } from '@/services/leave';
import { Holiday, Task } from '@/types/domain';

import { CalendarEventForm } from '../../modals/CalendarEventForm';
import { CalendarEvent } from './types';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { CalendarEventPopup } from './CalendarEventPopup';

export function CalendarPage() {
  const { message } = App.useApp();

  const [currentDate, setCurrentDate] = useState(dayjs());
  // Use standardized tab sync hook for consistent URL handling
  type CalendarView = 'month' | 'week' | 'day';
  const [activeView, setActiveView] = useTabSync<CalendarView>({
    defaultTab: 'month',
    validTabs: ['month', 'week', 'day'],
    paramName: 'view'
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(dayjs().format('YYYY-MM-DD'));
  const [connecting, setConnecting] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventType, setEventType] = useState<'event' | 'leave'>('event');
  const [initialSelectedDate, setInitialSelectedDate] = useState<dayjs.Dayjs | null>(null);

  // Fetch employees for autocomplete
  const { data: employeesData } = useEmployees(showEventDialog ? 'limit=100' : '');

  // Get company timezone
  const { data: companyData } = useCurrentUserCompany();
  const companyTimeZone = companyData?.result?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  // Fetch calendar events
  const startISO = currentDate.startOf('month').subtract(7, 'day').toISOString();
  const endISO = currentDate.endOf('month').add(7, 'day').toISOString();

  const { data: calendarEventsData, refetch: refetchCalendarEvents } = useCalendarEvents(startISO, endISO);

  const { data: tasks, isLoading: isLoadingTasks } = useTasks();
  const { data: meetings, isLoading: isLoadingMeetings } = useMeetings();
  const { data: leaves, isLoading: isLoadingLeaves } = useLeaves();
  const { data: holidays, isLoading: isLoadingHolidays } = usePublicHolidays();
  const { data: teamsStatus, isLoading: isLoadingTeamsStatus, refetch: refetchTeamsStatus } = useTeamsConnectionStatus();
  const { mutate: disconnectTeams, isPending: isDisconnecting } = useDisconnectTeams();
  const { data: leavesData } = useCompanyLeaves();

  const isLoading = isLoadingTasks || isLoadingMeetings || isLoadingLeaves || isLoadingHolidays;
  const isConnected = teamsStatus?.result?.connected ?? false;

  const availableLeaveTypes = useMemo((): string[] => {
    if (!leavesData?.result) return ['Sick Leave', 'Casual Leave', 'Vacation'];
    if (!leavesData?.result) return ['Sick Leave', 'Casual Leave', 'Vacation'];
    const types = new Set((leavesData.result as LeaveType[]).map((leave) => leave.leave_type));
    return Array.from(types).filter(Boolean).length > 0
      ? Array.from(types).filter((t): t is string => Boolean(t))
      : ['Sick Leave', 'Casual Leave', 'Vacation'];
  }, [leavesData]);

  const connectToTeams = useCallback(async () => {
    try {
      setConnecting(true);
      const response = await MicrosoftUserOAuth();
      if (response?.result) {
        window.location.href = response.result;
      }
    } catch (error) {
      message.error("Failed to connect to Microsoft Teams");
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    refetchTeamsStatus();
  }, [refetchTeamsStatus]);

  const handleCancel = () => {
    setShowEventDialog(false);
    setEventType('event');
  };

  const handleTimeSlotClick = useCallback((dateTime: dayjs.Dayjs) => {
    setInitialSelectedDate(dateTime);
    setEventType('event');
    setShowEventDialog(true);
  }, []);

  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    const calendarEvents = calendarEventsData?.result;

    if (tasks?.result) {
      tasks.result.forEach((task: Task) => {
        if (task.dueDate) {
          allEvents.push({
            id: `task-${task.id}`,
            title: task.title || task.name || 'Untitled',
            date: formatDateForApi(task.dueDate),
            time: 'Deadline',
            type: 'deadline',
            description: task.description,
            status: task.status,
            color: '#ff3b3b',
            raw: task
          });
        }
      });
    }

    if (calendarEvents) {
      (calendarEvents as GraphEvent[]).forEach((event: GraphEvent) => {
        if (event.isCancelled) return;
        const startTime = dayjs.utc(event.start.dateTime).tz(companyTimeZone);
        allEvents.push({
          id: `calendar-event-${event.id}`,
          title: event.subject || 'Untitled Meeting',
          date: formatDateForApi(startTime),
          time: startTime.format('h:mm A'),
          type: 'meeting',
          location: event.isOnlineMeeting ? 'Microsoft Teams' : undefined,
          description: event.body?.content || '',
          status: 'scheduled',
          participants: event.attendees?.map((a) => ({
            name: a.emailAddress?.name || a.emailAddress?.address?.split('@')[0] || 'Unknown',
            avatar: undefined
          })),
          color: '#3B82F6',
          startDateTime: startTime, // Pass the timezone-converted Dayjs object
          raw: event
        });
      });
    }

    if (meetings?.result && (!calendarEvents || calendarEvents.length === 0)) {
      meetings.result.forEach((meeting: MeetingType) => {
        allEvents.push({
          id: `meeting-${meeting.id}`,
          title: meeting.title,
          date: formatDateForApi(meeting.start_time),
          time: dayjs(meeting.start_time).format('h:mm A'),
          type: 'meeting',
          location: meeting.platform || meeting.meeting_link,
          description: meeting.description,
          status: meeting.status,
          participants: meeting.participants?.map((p) => {
            const part = p as { name?: string; avatar?: string };
            return { name: part.name || 'Unknown', avatar: part.avatar };
          }),
          // We can try to cast p as {name: string, avatar: string} if we trust backend
          color: '#3B82F6',
          raw: meeting
        });
      });
    }

    if (leaves?.result) {
      leaves.result.forEach((leave: LeaveType) => {
        const start = dayjs(leave.start_date);
        const end = dayjs(leave.end_date);
        const diff = end.diff(start, 'day');
        for (let i = 0; i <= diff; i++) {
          const date = formatDateForApi(start.add(i, 'day'));
          allEvents.push({
            id: `leave-${leave.id}-${i}`,
            title: `${leave.user?.name || 'Employee'} - ${leave.leave_type} Leave`,
            date: date,
            time: 'All Day',
            type: 'leave',
            description: leave.reason,
            status: leave.status,
            color: '#f59e0b',
            raw: leave
          });
        }
      });
    }

    if (holidays?.result) {
      holidays.result.forEach((holiday: Holiday) => {
        if (holiday.is_deleted) return;
        allEvents.push({
          id: `holiday-${holiday.id}`,
          title: holiday.name,
          date: formatDateForApi(holiday.date),
          time: 'All Day',
          type: 'holiday',
          description: `Public Holiday: ${holiday.name}`,
          status: 'holiday',
          color: '#8b5cf6',
          raw: holiday
        });
      });
    }

    return allEvents;
  }, [tasks, meetings, leaves, calendarEventsData, holidays, companyTimeZone]);

  const handlePrev = () => {
    if (activeView === 'month') setCurrentDate(currentDate.subtract(1, 'month'));
    else if (activeView === 'week') setCurrentDate(currentDate.subtract(1, 'week'));
    else setCurrentDate(currentDate.subtract(1, 'day'));
  };

  const handleNext = () => {
    if (activeView === 'month') setCurrentDate(currentDate.add(1, 'month'));
    else if (activeView === 'week') setCurrentDate(currentDate.add(1, 'week'));
    else setCurrentDate(currentDate.add(1, 'day'));
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
    setSelectedDate(formatDateForApi(dayjs()));
  };

  const dateLabel = useMemo(() => {
    if (activeView === 'month') return currentDate.format('MMMM YYYY');
    if (activeView === 'week') {
      const start = currentDate.startOf('week');
      const end = currentDate.endOf('week');
      if (start.month() === end.month()) {
        return `${start.format('MMM D')} - ${end.format('D, YYYY')}`;
      } else {
        if (start.year() === end.year()) {
          return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
        }
        return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
      }
    }
    return currentDate.format('MMMM D, YYYY');
  }, [currentDate, activeView]);

  // Fetch current user details for leave filtering
  const { data: userDetails } = useUserDetails();
  const currentUserId = userDetails?.result?.id;

  const todayEvents = events.filter(e => e.date === formatDateForApi(dayjs()));
  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => {
        const isFuture = dayjs(e.date).isAfter(dayjs(), 'day');
        if (!isFuture) return false;

        if (e.type === 'meeting') return true;
        if (e.type === 'leave') return (e.raw as LeaveType).user_id === currentUserId;
        if (e.type === 'holiday') {
          const eventDate = dayjs(e.date);
          const now = dayjs();
          return eventDate.month() === now.month() && eventDate.year() === now.year();
        }

        // Exclude others (tasks/deadlines) based on request "only show..."
        return false;
      })
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
      .slice(0, 10);
  }, [events, currentUserId]);

  return (
    <PageLayout
      title="Calendar"
      tabs={[
        { id: 'month', label: 'Month' },
        { id: 'week', label: 'Week' },
        { id: 'day', label: 'Day' }
      ]}
      activeTab={activeView}
      onTabChange={(tabId) => setActiveView(tabId as 'month' | 'week' | 'day')}
      titleAction={{
        label: 'Create Event',
        icon: <Plus className="w-5 h-5" />,
        onClick: () => {
          setEventType('event');
          setShowEventDialog(true);
        }
      }}
      action={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="h-9 px-4 rounded-[8px] border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F7F7F7] transition-colors font-['Manrope:SemiBold',sans-serif] text-[13px] text-[#111111] focus:ring-2 focus:ring-[#111111] focus:outline-none"
            >
              Today
            </button>
            <button onClick={handlePrev} className="w-9 h-9 rounded-[8px] border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F7F7F7] transition-colors focus:ring-2 focus:ring-[#111111] focus:outline-none">
              <ChevronLeft className="w-4 h-4 text-[#666666]" />
            </button>
            <div className="px-4 py-2 bg-[#F7F7F7] rounded-[8px] border border-[#EEEEEE]" role="status">
              <span className="font-['Manrope:SemiBold',sans-serif] text-[14px] text-[#111111]">
                {dateLabel}
              </span>
            </div>
            <button onClick={handleNext} className="w-9 h-9 rounded-[8px] border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F7F7F7] transition-colors focus:ring-2 focus:ring-[#111111] focus:outline-none">
              <ChevronRight className="w-4 h-4 text-[#666666]" />
            </button>
          </div>
          {!isLoadingTeamsStatus && (
            <>
              {isConnected ? (
                <Popconfirm
                  title="Disconnect Teams"
                  description="Are you sure you want to disconnect your Microsoft Teams account?"
                  onConfirm={() => {
                    disconnectTeams(undefined, {
                      onSuccess: () => {
                        message.success("Disconnected from Microsoft Teams");
                      },
                      onError: () => {
                        message.error("Failed to disconnect");
                      }
                    });
                  }}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ loading: isDisconnecting, danger: true }}
                >
                  <Button
                    type="default"
                    className="h-9 px-4 text-[13px] font-['Manrope:SemiBold',sans-serif] text-[#111111] border-[#EEEEEE] hover:text-red-500 hover:border-red-200 flex items-center gap-2 group transition-all"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500 group-hover:bg-red-500 transition-colors" />
                    Connected
                    <LogOut className="w-3.5 h-3.5 ml-1 text-[#CCCCCC] group-hover:text-red-500 transition-colors" />
                  </Button>
                </Popconfirm>
              ) : (
                <Button type="primary" icon={<Video className="w-4 h-4" />} loading={connecting} onClick={connectToTeams} className="h-9 px-4 text-[13px] font-['Manrope:SemiBold',sans-serif] bg-[#111111] hover:bg-[#000000]/90 border-none">Connect to Teams</Button>
              )}
            </>
          )}
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 grid grid-cols-[1fr_280px] gap-6 overflow-hidden min-h-0">

          {/* Using CSS visibility to prevent DOM unmounting and flickering */}
          <div className="overflow-hidden h-full flex flex-col">
            <div style={{ display: activeView === 'month' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
              <MonthView
                currentDate={currentDate}
                events={events}
                isLoading={isLoading}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            <div style={{ display: activeView === 'week' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
              <WeekView
                currentDate={currentDate}
                events={events}
                isLoading={isLoading}
                onTimeSlotClick={handleTimeSlotClick}
              />
            </div>
            <div style={{ display: activeView === 'day' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
              <DayView
                currentDate={currentDate}
                events={events}
                isLoading={isLoading}
                onTimeSlotClick={handleTimeSlotClick}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto scrollbar-hide">
            {/* Today's Events */}
            <div className="bg-[#F7F7F7] rounded-[16px] p-5">
              <h4 className="font-['Manrope:SemiBold',sans-serif] text-[14px] text-[#111111] mb-4">
                Today&apos;s Events
              </h4>
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-[12px] p-4 border border-[#EEEEEE] animate-pulse">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-1 h-12 rounded-full mt-1" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : todayEvents.length > 0 ? (
                  todayEvents.map((event) => (
                    <Popover key={event.id} content={<CalendarEventPopup event={event} />} title="" trigger="click" placement="left">
                      <div className="bg-white rounded-[12px] p-4 border border-[#EEEEEE] cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="w-1 h-full rounded-full mt-1" style={{ backgroundColor: event.color }} />
                          <div className="flex-1">
                            <div className="font-['Manrope:SemiBold',sans-serif] text-[13px] text-[#111111] mb-1">{event.title}</div>
                            <div className="flex items-center gap-1 text-[11px] font-['Manrope:Regular',sans-serif] text-[#666666] mb-2">
                              <Clock className="w-3 h-3" />
                              {event.time}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1 text-[11px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Popover>
                  ))
                ) : (
                  <div className="text-center py-6 text-[13px] font-['Manrope:Regular',sans-serif] text-[#999999]">
                    No events today
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-[#F7F7F7] rounded-[16px] p-5 min-h-[300px]">
              <h4 className="font-['Manrope:SemiBold',sans-serif] text-[14px] text-[#111111] mb-4">Upcoming</h4>
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-[12px] p-4 border border-[#EEEEEE] animate-pulse">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-1 h-10 rounded-full mt-1" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : upcomingEvents.length > 0 ? (upcomingEvents.map((event) => (
                  <Popover key={event.id} content={<CalendarEventPopup event={event} />} title="" trigger="click" placement="left">
                    <div key={event.id} className="bg-white rounded-[12px] p-4 border border-[#EEEEEE] cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-1 h-full rounded-full mt-1" style={{ backgroundColor: event.color }} />
                        <div className="flex-1">
                          <div className="font-['Manrope:SemiBold',sans-serif] text-[13px] text-[#111111] mb-1">{event.title}</div>
                          <div className="flex items-center gap-1 text-[11px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                            <CalendarIcon className="w-3 h-3" />
                            {event.endDate ? (
                              dayjs(event.date).month() === dayjs(event.endDate).month() ?
                                `${dayjs(event.date).format('MMM D')} - ${dayjs(event.endDate).format('D')}` :
                                `${dayjs(event.date).format('MMM D')} - ${dayjs(event.endDate).format('MMM D')}`
                            ) : (
                              dayjs(event.date).format('MMM D')
                            )} • {event.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Popover>
                ))) : (
                  <div className="text-center py-6 text-[13px] font-['Manrope:Regular',sans-serif] text-[#999999]">No upcoming events</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CalendarEventForm
        open={showEventDialog}
        onCancel={handleCancel}
        onSuccess={async () => {
          handleCancel();
          await refetchCalendarEvents();
        }}
        initialType={eventType}
        initialDate={initialSelectedDate}
        employeesData={employeesData}
        availableLeaveTypes={availableLeaveTypes}
        companyTimeZone={companyTimeZone}
      />
    </PageLayout>
  );
}