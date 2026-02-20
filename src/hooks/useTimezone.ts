import { useMemo } from 'react';
import dayjs from '@/utils/dayjs';
import { useCurrentUserCompany } from './useUser';

export const useTimezone = () => {
    const { data: companyData } = useCurrentUserCompany();

    const companyTimezone = useMemo(() => {
        return companyData?.result?.timezone || 'Asia/Kolkata';
    }, [companyData]);

    const formatWithTimezone = (date: string | Date | dayjs.Dayjs | null | undefined, formatStr: string) => {
        if (!date) return '-';
        return dayjs(date).tz(companyTimezone).format(formatStr);
    };

    const getDayjsInTimezone = (date?: string | Date | dayjs.Dayjs | null) => {
        return dayjs(date).tz(companyTimezone);
    };

    const companyName = useMemo(() => {
        return companyData?.result?.name || 'Alsonotify';
    }, [companyData]);

    return {
        companyName,
        companyId: companyData?.result?.id,
        companyTimezone,
        companyCurrency: companyData?.result?.currency || 'USD',
        formatWithTimezone,
        getDayjsInTimezone,
        dayjs: dayjs // Exporting the configured dayjs instance
    };
};
