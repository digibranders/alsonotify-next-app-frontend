import { MeetingType } from '@/services/meeting';
import { LeaveType } from '@/services/leave';
import { GraphEvent } from '@/services/calendar';
import { TaskDto } from '@/types/dto/task.dto';
import { Holiday } from '@/types/domain';

export interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    type: 'meeting' | 'deadline' | 'event' | 'leave' | 'holiday';
    participants?: { name: string; avatar?: string }[];
    location?: string;
    description?: string;
    status?: string;
    color: string;
    raw?: MeetingType | LeaveType | GraphEvent | TaskDto | Holiday | unknown;
    endDate?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startDateTime?: any; // dayjs.Dayjs - keep as is or import dayjs
}

export type ViewType = 'month' | 'week' | 'day';
