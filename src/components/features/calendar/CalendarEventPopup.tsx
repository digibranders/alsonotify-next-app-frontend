import { Tag, Avatar, Tooltip } from 'antd';
import { Clock, MapPin, Video } from 'lucide-react';
import dayjs from 'dayjs';
import { CalendarEvent } from './types';
import { GraphEvent } from '@/services/calendar';
import { sanitizeUrl } from '@/utils/sanitizeUrl';

interface CalendarEventPopupProps {
    event: CalendarEvent;
}

export function CalendarEventPopup({ event }: CalendarEventPopupProps) {
    // Extract Teams meeting details from raw GraphEvent
    const graphEvent = event.raw as GraphEvent | undefined;
    const isTeamsMeeting = graphEvent?.isOnlineMeeting || event.location === 'Microsoft Teams';
    const joinUrl = graphEvent?.onlineMeeting?.joinUrl || graphEvent?.onlineMeetingUrl;
    const webLink = graphEvent?.webLink;

    // Extract meeting ID and passcode from description or body content
    let meetingId: string | null = null;
    let passcode: string | null = null;

    if (graphEvent?.body?.content) {
        // Remove HTML tags for text extraction
        const textContent = graphEvent.body.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        // Try to extract meeting ID (format: numbers separated by spaces, e.g., "415 314 166 645 2")
        const meetingIdPatterns = [
            /Meeting ID[:\s]+([\d\s]+)/i,
            /(\d{3}\s+\d{3}\s+\d{3}\s+\d{3}\s+\d+)/,
            /ID[:\s]+([\d\s]{10,})/i
        ];

        for (const pattern of meetingIdPatterns) {
            const match = textContent.match(pattern);
            if (match) {
                meetingId = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Try to extract passcode (alphanumeric, typically 6-10 characters)
        const passcodePatterns = [
            /Passcode[:\s]+([A-Za-z0-9]{4,12})/i,
            /Password[:\s]+([A-Za-z0-9]{4,12})/i,
            /Code[:\s]+([A-Za-z0-9]{4,12})/i
        ];

        for (const pattern of passcodePatterns) {
            const match = textContent.match(pattern);
            if (match) {
                passcode = match[1].trim();
                break;
            }
        }
    }

    return (
        <div className="w-[320px] p-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <Tag color={event.color} className="m-0">{event.type.toUpperCase()}</Tag>
                {event.status && <span className="text-xs text-[#999999] font-normal capitalize">{event.status}</span>}
            </div>

            {/* Title */}
            <h4 className="font-bold text-base text-[#111111] mb-3">{event.title}</h4>

            {/* Date & Time */}
            <div className="flex items-center gap-2 text-[#666666] text-[0.8125rem] font-normal mb-3">
                <Clock className="w-4 h-4" />
                <span>{dayjs(event.date).format('MMM D, YYYY')} • {event.time}</span>
            </div>

            {/* Location */}
            {event.location && (
                <div className="flex items-center gap-2 text-[#666666] text-[0.8125rem] font-normal mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                </div>
            )}

            {/* Meeting Details (for Teams meetings) */}
            {isTeamsMeeting && (meetingId || passcode || joinUrl) && (
                <div className="border-t border-[#EEEEEE] pt-4 mt-4 space-y-3">
                    {meetingId && (
                        <div>
                            <span className="text-[0.8125rem] text-[#616161] font-normal mb-1 block">Meeting ID:</span>
                            <span className="text-[0.8125rem] text-[#242424] font-normal">{meetingId}</span>
                        </div>
                    )}
                    {passcode && (
                        <div>
                            <span className="text-[0.8125rem] text-[#616161] font-normal mb-1 block">Passcode:</span>
                            <span className="text-[0.8125rem] text-[#242424] font-normal">{passcode}</span>
                        </div>
                    )}

                    {/* Meeting Link - For organizers */}
                    {sanitizeUrl(webLink) && (
                        <div className="mt-4">
                            <span className="text-[0.8125rem] text-[#616161] font-normal mb-2 block">For organizers:</span>
                            <a
                                href={sanitizeUrl(webLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[0.8125rem] text-[#5B5FC7] font-normal underline hover:text-[#4A4FC7] transition-colors"
                            >
                                Meeting options
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Join Meeting Button */}
            {isTeamsMeeting && sanitizeUrl(joinUrl) && (
                <div className="mt-4 pt-4 border-t border-[#EEEEEE]">
                    <a
                        href={sanitizeUrl(joinUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#5B5FC7] hover:bg-[#4A4FC7] text-white text-[0.8125rem] font-semibold rounded-lg transition-colors"
                    >
                        <Video className="w-4 h-4" />
                        Join Meeting
                    </a>
                </div>
            )}

            {/* Description */}
            {event.description && !isTeamsMeeting && (
                <div className="mt-4 pt-4 border-t border-[#EEEEEE]">
                    <p className="text-[0.8125rem] text-[#666666] font-normal leading-relaxed">{event.description}</p>
                </div>
            )}

            {/* Participants */}
            {event.participants && event.participants.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#EEEEEE]">
                    <p className="text-xs font-semibold text-[#999999] mb-2">Participants</p>
                    <Avatar.Group maxCount={5} size="small">
                        {event.participants.map((p, idx) => (
                            <Tooltip title={p.name} key={idx}>
                                <Avatar src={p.avatar}>{p.name[0]}</Avatar>
                            </Tooltip>
                        ))}
                    </Avatar.Group>
                </div>
            )}
        </div>
    );
}
