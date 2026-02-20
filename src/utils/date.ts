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
 * Calculates the number of working days between two dates, inclusive.
 * Supports custom working days configuration.
 * @param workingDays Array of day names (e.g. ['Monday', 'Friday']) or explicit configuration. Defaults to Mon-Fri.
 */
export const getWorkingDaysCount = (
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
    workingDays?: string[],
    holidays?: { date: string }[]
): number => {
    let count = 0;
    let current = dayjs(start);
    const last = dayjs(end);

    // Ensure we don't calculate if start is after end
    if (current.isAfter(last)) return 0;

    // Map day names to dayjs day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayMap: Record<string, number> = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6
    };

    const activeDays = new Set<number>();

    if (workingDays && workingDays.length > 0) {
        workingDays.forEach(day => {
            const dayNum = dayMap[day.toLowerCase()];
            if (dayNum !== undefined) activeDays.add(dayNum);
        });
    }
    // No else/default: if workingDays is not provided or empty the caller must ensure it is passed.
    // Returning 0 days is intentional — it signals missing company configuration rather than silently
    // assuming Mon–Fri, which would be wrong for companies with different work weeks.

    // Iterate through each day
    while (current.isBefore(last) || current.isSame(last, 'day')) {
        const dayOfWeek = current.day(); // 0 is Sunday, 6 is Saturday
        if (activeDays.has(dayOfWeek)) {
            // Skip public holidays — mirrors backend computeUtilization logic
            const isHoliday = holidays?.some(h => current.isSame(dayjs(h.date), 'day'));
            if (!isHoliday) count++;
        }
        current = current.add(1, 'day');
    }
    return count;
};
