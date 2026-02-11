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

/**
 * Returns today's date in YYYY-MM-DD format.
 */
export const getTodayForApi = (): string => {
    return dayjs().format(DATE_FORMAT_API);
};
