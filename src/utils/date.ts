import dayjs from './dayjs';

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

/**
 * Formats a date for display in the UI, respecting the provided timezone.
 * Defaults to the system timezone or 'Asia/Kolkata' if no timezone is provided.
 */
export const formatDateForDisplay = (date: string | Date | dayjs.Dayjs, timezone: string = DEFAULT_TIMEZONE): string => {
    if (!date) return '-';
    return dayjs.utc(date).tz(timezone).format('MMM D, YYYY');
};

/**
 * Formats a date for display including time, respecting the provided timezone.
 */
export const formatDateTimeForDisplay = (date: string | Date | dayjs.Dayjs, timezone: string = DEFAULT_TIMEZONE): string => {
    if (!date) return '-';
    return dayjs.utc(date).tz(timezone).format('MMM D, YYYY h:mm A');
};

/**
 * Formats a date as a simple YYYY-MM-DD string for API consumption.
 * This is used for PostgreSQL @db.Date columns to avoid timezone shifting.
 */
export const formatDateForApi = (date: string | Date | dayjs.Dayjs): string => {
    if (!date) return '';
    return dayjs(date).format('YYYY-MM-DD');
};

/**
 * Returns today's date in YYYY-MM-DD format.
 */
export const getTodayForApi = (): string => {
    return dayjs().format('YYYY-MM-DD');
};
