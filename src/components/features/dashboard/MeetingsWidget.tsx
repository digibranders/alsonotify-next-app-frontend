import svgPaths from "@/constants/iconPaths";
import { Video, Clock, Plus } from "lucide-react";
import { useState, useMemo, memo } from 'react';
import { Button, Popover } from 'antd';
import { Skeleton } from '@/components/ui/Skeleton';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useCurrentUserCompany } from '@/hooks/useUser';
import { useTeamsConnectionStatus, useCalendarEvents } from '@/hooks/useCalendar';
import { GraphEvent } from '@/services/calendar';
import { MeetingCreateModal } from '@/components/modals/MeetingCreateModal';

dayjs.extend(utc);
dayjs.extend(timezone);


export function MeetingsWidget({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [showDialog, setShowDialog] = useState(false);

  const { data: teamsStatus } = useTeamsConnectionStatus();
  const isConnected = teamsStatus?.result?.connected ?? false;

  const { data: companyData } = useCurrentUserCompany();
  const companyTimeZone = companyData?.result?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const startISO = dayjs().startOf("day").toISOString();
  const endISO = dayjs().add(7, "day").endOf("day").toISOString();
  const { data: eventsData, isLoading, isError, refetch: refetchCalendarEvents } = useCalendarEvents(startISO, endISO);


  // Removed manual refetch intervals — React Query's refetchInterval handles this
  // (useTeamsConnectionStatus has refetchInterval: 2min, useCalendarEvents has refetchInterval: 2min)

  // Transform and filter meetings
  const processedMeetings = useMemo(() => {
    if (!eventsData?.result) return [];

    const now = dayjs().tz(companyTimeZone);

    // Filter meetings that haven't ended yet (show until meeting end time)
    // Parse event times properly - they come in ISO format and may be in UTC
    const upcoming = (eventsData.result as GraphEvent[])
      .filter((event: GraphEvent) => {
        if (event.isCancelled) return false;

        // Parse end time - event.end.dateTime is in ISO format
        // Convert to company timezone for proper comparison
        const endTime = dayjs.utc(event.end.dateTime).tz(companyTimeZone);

        // Show meeting if current time is before the meeting end time
        // This means meetings will be shown until they end (including in-progress meetings)
        // Use 'minute' precision to avoid microsecond comparison issues
        const shouldShow = now.isBefore(endTime, 'minute') || now.isSame(endTime, 'minute');

        return shouldShow;
      })
      .sort((a: GraphEvent, b: GraphEvent) =>
        dayjs.utc(a.start.dateTime).tz(companyTimeZone).valueOf() - dayjs.utc(b.start.dateTime).tz(companyTimeZone).valueOf()
      )
      .slice(0, 3) // Show only first 3 meetings (upcoming or in-progress)
      .map((event: GraphEvent) => {
        // Parse times with timezone awareness - convert to company timezone
        const startTime = dayjs.utc(event.start.dateTime).tz(companyTimeZone);
        const endTime = dayjs.utc(event.end.dateTime).tz(companyTimeZone);
        const durationMinutes = endTime.diff(startTime, 'minute');

        // Format duration
        // eslint-disable-next-line no-useless-assignment
        let duration = '';
        if (durationMinutes < 60) {
          duration = `${durationMinutes} mins`;
        } else if (durationMinutes === 60) {
          duration = '1 hour';
        } else {
          const hours = Math.floor(durationMinutes / 60);
          const mins = durationMinutes % 60;
          duration = mins > 0 ? `${hours}.${Math.round(mins / 60 * 10)} hours` : `${hours} hour${hours > 1 ? 's' : ''}`;
        }

        // Get attendees from event attendees
        const attendees = (event.attendees || []).slice(0, 3).map((attendee: { emailAddress?: { name?: string; address?: string } }) => ({
          name: attendee?.emailAddress?.name || attendee?.emailAddress?.address?.split('@')[0] || 'Unknown',
          avatar: '' // GraphEvent doesn't have avatar, use empty string
        }));

        // Determine status - use company timezone for now
        const nowTz = dayjs().tz(companyTimeZone);
        const isInProgress = nowTz.isAfter(startTime) && nowTz.isBefore(endTime);
        const status = isInProgress ? 'in-progress' : 'upcoming';

        // Get platform from onlineMeeting
        // Priority: 1. onlineMeetingProvider, 2. Check joinUrl/onlineMeetingUrl for platform indicators
        let platform = 'Teams'; // Default to Teams for Microsoft Graph API events
        if (event.isOnlineMeeting) {
          // Check onlineMeetingProvider first (most reliable)
          if (event.onlineMeetingProvider === 'teamsForBusiness') {
            platform = 'Teams';
          } else {
            // Check URLs for platform indicators
            const joinUrl = event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || '';
            const urlLower = joinUrl.toLowerCase();

            if (urlLower.includes('teams.microsoft.com') || urlLower.includes('teams.live.com') || urlLower.includes('/meetup-join/')) {
              platform = 'Teams';
            } else if (urlLower.includes('zoom.us') || urlLower.includes('zoom.com')) {
              platform = 'Zoom';
            } else if (urlLower.includes('meet.google.com') || urlLower.includes('google.com/meet')) {
              platform = 'Meet';
            } else if (event.onlineMeetingProvider) {
              // If provider is set but not teamsForBusiness, default to Teams for Microsoft Graph
              platform = 'Teams';
            }
            // If no indicators found and isOnlineMeeting is true, default to Teams (Microsoft Graph API)
          }
        }

        // Get organizer
        const organizer = event.organizer?.emailAddress?.name || event.organizer?.emailAddress?.address?.split('@')[0] || 'Unknown';

        // Get join URL for the meeting
        const joinUrl = event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || event.webLink || null;

        // Get full attendees list for details modal
        const allAttendees = (event.attendees || []).map((attendee: { emailAddress?: { name?: string; address?: string } }) => ({
          name: attendee?.emailAddress?.name || attendee?.emailAddress?.address?.split('@')[0] || 'Unknown',
          email: attendee?.emailAddress?.address || '',
          avatar: ''
        }));

        return {
          id: event.id,
          title: event.subject || 'Untitled Meeting',
          time: startTime.format('h:mm A'),
          duration: duration,
          date: {
            month: startTime.format('MMM').toUpperCase(),
            day: startTime.date()
          },
          attendees: attendees,
          totalAttendees: event.attendees?.length || 0,
          status: status,
          platform: platform,
          organizer: organizer,
          joinUrl: joinUrl,
          allAttendees: allAttendees,
          description: event.body?.content || null,
          startDateTime: startTime.toISOString(),
          endDateTime: endTime.toISOString()
        };
      });

    return upcoming;
  }, [eventsData, companyTimeZone]);

  return (
    <>
      <div className="bg-white rounded-[24px] p-4 w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xl text-[#111111]">Meetings</h3>
            <button onClick={() => setShowDialog(true)} aria-label="Schedule meeting" className="hover:scale-110 active:scale-95 transition-transform rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b3b] focus-visible:ring-offset-2">
              <Plus className="size-5 text-[#ff3b3b]" strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="View all meetings" className="flex items-center gap-1 text-[#666666] text-sm font-semibold hover:text-[#111111] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b3b] focus-visible:ring-offset-2" onClick={() => onNavigate && onNavigate('calendar')}>
              <span>View All</span>
              <svg className="size-[17px]" fill="none" viewBox="0 0 17 17">
                <path d={svgPaths.p3ac7a560} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Meetings List */}
        <div className="flex flex-col gap-2.5 flex-1 mt-2 overflow-y-auto min-h-0 pr-1 pb-1">
          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col p-3 rounded-[16px] border border-gray-100 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16 rounded-md" />
                        <Skeleton className="h-3 w-12 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="w-8 h-8 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex -space-x-2">
                      <Skeleton className="w-6 h-6 rounded-full border-2 border-white" />
                      <Skeleton className="w-6 h-6 rounded-full border-2 border-white" />
                      <Skeleton className="w-6 h-6 rounded-full border-2 border-white" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError && !eventsData ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm font-medium text-[#666666]">
                Unable to load meetings at the moment. Please connect to Teams.
              </p>
            </div>
          ) : processedMeetings.length === 0 ? (
            <div className="bg-white rounded-[10px] border border-dashed border-[#CCCCCC] py-4 flex items-center justify-center">
              <p className="text-sm font-medium text-[#888888]">No upcoming meetings</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {processedMeetings.map((meeting) => (
                <MeetingItem
                  key={meeting.id}
                  {...meeting}
                  onJoin={(joinUrl) => {
                    if (joinUrl) {
                      window.open(joinUrl, '_blank');
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <MeetingCreateModal
        open={showDialog}
        onCancel={() => setShowDialog(false)}
        onSuccess={async () => {
          await refetchCalendarEvents();
        }}
        companyTimeZone={companyTimeZone}
      />
    </>
  );
}


const MeetingItem = memo(function MeetingItem({
  title,
  time,
  date,
  attendees,
  totalAttendees,
  platform,
  organizer,
  joinUrl,
  allAttendees = [],
  startDateTime,
  endDateTime,
  onJoin
}: {
  title: string;
  time: string;
  duration: string;
  date: { month: string; day: number };
  attendees: { name: string; avatar: string | null }[];
  totalAttendees: number;
  platform: string;
  organizer: string;
  joinUrl?: string | null;
  allAttendees?: Array<{ name: string; email: string; avatar: string }>;
  description?: string | null;
  startDateTime?: string;
  endDateTime?: string;
  onJoin?: (joinUrl: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  // Strip HTML tags from description - using DOMParser for XSS safety

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (joinUrl && onJoin) {
      onJoin(joinUrl);
    }
  };

  const handleCardClick = () => {
    setShowDetails(true);
  };
  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Truncate organizer name to 12 characters (to fit before attendees section)
  const truncateOrganizer = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  // Truncate meeting title to 27 characters (to align with red line position)
  const truncateTitle = (title: string, maxLength: number = 36) => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength) + '...';
  };

  // Platform colors
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'teams':
        return { bg: '#E3F2FD', text: '#1565C0' };
      case 'zoom':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'meet':
        return { bg: '#FFF3E0', text: '#E65100' };
      default:
        return { bg: '#F7F7F7', text: '#666666' };
    }
  };

  const platformColor = getPlatformColor(platform);
  const today = dayjs();
  // Check if the meeting date matches today
  const isToday = today.date() === date.day && today.format('MMM').toUpperCase() === date.month;
  const isRedDate = isToday; // Red for today's date, grey for future

  return (
    <>
      <Popover
        open={showDetails}
        onOpenChange={setShowDetails}
        trigger="click"
        placement="right"
        styles={{ container: { padding: 0 } }}
        content={
          <div className="w-[300px] bg-white rounded-[12px] shadow-lg border border-[#EEEEEE] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#EEEEEE]">
              <h4 className="font-semibold text-sm text-[#111111] mb-1.5 line-clamp-2 leading-tight">
                {title}
              </h4>
              <div className="flex items-center gap-1.5 text-[#666666] text-xs font-medium">
                <Clock className="size-3" strokeWidth={2} />
                <span>{time}</span>
                <span className="text-[#CCCCCC]">•</span>
                {/* <span>{duration}</span> */}
              </div>
            </div>

            {/* Content - Compact & Clean */}
            <div className="px-4 py-3 space-y-2.5 bg-white">
              {/* Host */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#999999] uppercase tracking-wide min-w-[45px]">Host</span>
                <span className="text-xs font-medium text-[#111111]">{organizer}</span>
              </div>

              {/* Date & Time */}
              {startDateTime && endDateTime && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#999999] uppercase tracking-wide min-w-[45px]">When</span>
                  <span className="text-xs font-medium text-[#111111]">
                    {dayjs(startDateTime).format('MMM D, YYYY')} • {time} - {dayjs(endDateTime).format('h:mm A')}
                  </span>
                </div>
              )}

              {/* Attendees - Compact */}
              {allAttendees && allAttendees.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-[#999999] uppercase tracking-wide min-w-[45px] pt-0.5">With</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-[#111111] leading-relaxed">
                      {allAttendees.slice(0, 3).map((a) => a.name).join(', ')}
                      {allAttendees.length > 3 && (
                        <span className="text-[#999999]"> +{allAttendees.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Join Button */}
            {joinUrl && (
              <div className="px-4 py-3 bg-[#FAFAFA] border-t border-[#EEEEEE]">
                <Button
                  type="primary"
                  onClick={() => {
                    if (joinUrl && onJoin) {
                      onJoin(joinUrl);
                    }
                    setShowDetails(false);
                  }}
                  className="w-full h-9 rounded-lg bg-[#111111] hover:bg-[#000000]/90 text-white text-xs font-semibold transition-all active:scale-95 border-none flex items-center justify-center gap-2 shadow-sm"
                  icon={<Video className="w-3.5 h-3.5" />}
                >
                  Join {platform} Meeting
                </Button>
              </div>
            )}
          </div>
        }
      >
        <div
          className="group p-3 rounded-xl border border-[#EEEEEE] hover:border-[#ff3b3b]/20 transition-all duration-300 hover:shadow-lg cursor-pointer shrink-0"
          onClick={handleCardClick}
        >
          <div className="flex items-start gap-2.5">
            {/* Date Badge - Rounded Square */}
            <div className="flex-shrink-0">
              <div className={`w-[48px] h-[48px] rounded-[12px] flex flex-col items-center justify-center ${isRedDate
                ? 'bg-[#ff3b3b]'
                : 'bg-[#E5E5E5]'
                }`}>
                <span className={`text-2xs font-medium uppercase leading-none mb-0.5 ${isRedDate ? 'text-white' : 'text-[#666666]'
                  }`}>
                  {date.month}
                </span>
                <span className={`text-xl font-bold leading-none ${isRedDate ? 'text-white' : 'text-[#111111]'
                  }`}>
                  {date.day}
                </span>
              </div>
            </div>

            {/* Meeting Info */}
            <div className="flex-1 min-w-0">
              {/* Title & Platform Tag */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-xs text-[#111111] line-clamp-1 flex-1">
                  {truncateTitle(title)}
                </h4>
                {joinUrl ? (
                  <button
                    onClick={handleJoinClick}
                    className="px-1.5 py-0.5 rounded-full text-2xs font-medium flex-shrink-0 flex items-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ backgroundColor: platformColor.bg, color: platformColor.text }}
                    title={`Join ${platform} meeting`}
                  >
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                    {platform}
                  </button>
                ) : (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-2xs font-medium flex-shrink-0 flex items-center gap-0.5"
                    style={{ backgroundColor: platformColor.bg, color: platformColor.text }}
                  >
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                    {platform}
                  </span>
                )}
              </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[#666666] text-xs font-medium">
                      <Clock className="size-3.5" strokeWidth={2} />
                      <span>{time}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-[#CCCCCC]" />
                    <span className="text-[#666666] text-xs font-medium">Host: {truncateOrganizer(organizer)}</span>
                  </div>

                  {/* Attendees - Aligned to the right on same line - Commented out to save space for time and host */}
                  {/* <div className="flex items-center -space-x-2 flex-shrink-0">
                    {attendees.slice(0, 3).map((attendee, index) => {
                      const initials = getInitials(attendee.name);
                      return (
                        <div
                          key={index}
                          className="w-6 h-6 rounded-full border-2 border-white bg-[#E5E5E5] flex items-center justify-center shadow-sm relative z-[5] hover:z-10 transition-all"
                        >
                          <span className="text-2xs text-[#666666] font-bold">{initials}</span>
                        </div>
                      );
                    })}
                    {totalAttendees > attendees.length && (
                      <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm relative z-[1] ${isRedDate ? 'bg-[#ff3b3b]' : 'bg-[#E5E5E5]'
                        }`}>
                        <span className={`text-2xs font-semibold ${isRedDate ? 'text-white' : 'text-[#666666]'
                          }`}>
                          +{totalAttendees - attendees.length}
                        </span>
                      </div>
                    )}
                  </div> */}
                </div>
            </div>
          </div>
        </div>
      </Popover>
    </>
  );
});