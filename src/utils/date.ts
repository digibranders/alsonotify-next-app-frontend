import dayjs from './dayjs';

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

export const DATE_FORMAT_API = 'YYYY-MM-DD';
export const DATE_FORMAT_DISPLAY = 'MMM D, YYYY';
export const DATETIME_FORMAT_DISPLAY = 'MMM D, YYYY h:mm A';

/**
 * Formats a date for display in the UI, respecting the provided timezone.
 * Defaults to the system timezone or 'Asia/Kolkata' if no timezone is provided.
 */
export const formatDateForDisplay = (date: string | Date | dayjs.Dayjs, timezone: string = DEFAULT_TIMEZONE): string => {
    if (!date) return '-';
    const d = dayjs.utc(date).tz(timezone);
    return d.isValid() ? d.format(DATE_FORMAT_DISPLAY) : '-';
};

/**
 * Formats a date for display including time, respecting the provided timezone.
 */
export const formatDateTimeForDisplay = (date: string | Date | dayjs.Dayjs, timezone: string = DEFAULT_TIMEZONE): string => {
    if (!date) return '-';
    const d = dayjs.utc(date).tz(timezone);
    return d.isValid() ? d.format(DATETIME_FORMAT_DISPLAY) : '-';
};

/**
 * Formats a date as a simple YYYY-MM-DD string for API consumption.
 * This is used for PostgreSQL @db.Date columns to avoid timezone shifting.
 */
export const formatDateForApi = (date: string | Date | dayjs.Dayjs): string => {
    if (!date) return '';
    const d = dayjs(date);
    return d.isValid() ? d.format(DATE_FORMAT_API) : '';
};

export const getTodayForApi = (): string => {
    return dayjs().format(DATE_FORMAT_API);
};

/**
 * Calculates the number of working days (Mon-Fri) between two dates, inclusive.
 */
export const getWorkingDaysCount = (start: dayjs.Dayjs, end: dayjs.Dayjs): number => {
    let count = 0;
    let current = dayjs(start);
    const last = dayjs(end);

    // Ensure we don't calculate if start is after end
    if (current.isAfter(last)) return 0;

    // Iterate through each day
    while (current.isBefore(last) || current.isSame(last, 'day')) {
        const dayOfWeek = current.day(); // 0 is Sunday, 6 is Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        current = current.add(1, 'day');
    }
    return count;
};
