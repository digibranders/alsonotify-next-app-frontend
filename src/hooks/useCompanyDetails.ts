import { useState, useCallback, useEffect } from 'react';
import { CompanyProfile } from '@/types/auth'; // Adjust import based on actual location
import { CompanyUpdateInput } from '@/types/genericTypes';

interface UseCompanyDetailsProps {
    initialData?: CompanyProfile | null;
}

export const useCompanyDetails = ({ initialData }: UseCompanyDetailsProps) => {
    const [companyName, setCompanyName] = useState(initialData?.name || '');
    const [companyLogo, setCompanyLogo] = useState(initialData?.logo || '');
    const [taxId, setTaxId] = useState(initialData?.tax_id || '');
    const [taxIdType, setTaxIdType] = useState(initialData?.tax_id_type || '');
    const [timeZone, setTimeZone] = useState(initialData?.timezone || 'Asia/Kolkata');
    const [currency, setCurrency] = useState(initialData?.currency || 'USD');
    const [country, setCountry] = useState(initialData?.country || '');
    const [address, setAddress] = useState(initialData?.address || '');

    const [defaultEmployeePassword, setDefaultEmployeePassword] = useState(initialData?.default_employee_password || 'Pass@123');

    // Sync state when initialData becomes available after mount (e.g. companyData loads asynchronously).
    useEffect(() => {
        if (!initialData) return;
        setCompanyName(initialData.name || '');
        setCompanyLogo(initialData.logo || '');
        setTaxId(initialData.tax_id || '');
        setTaxIdType(initialData.tax_id_type || '');
        setTimeZone(initialData.timezone || 'Asia/Kolkata');
        setCurrency(initialData.currency || 'USD');
        setCountry(initialData.country || '');
        setAddress(initialData.address || '');
        setDefaultEmployeePassword(initialData.default_employee_password || 'Pass@123');
    }, [initialData]);

    const resetCompanyDetails = useCallback(() => {
        if (initialData) {
            setCompanyName(initialData.name || '');
            setCompanyLogo(initialData.logo || '');
            setTaxId(initialData.tax_id || '');
            setTaxIdType(initialData.tax_id_type || '');
            setTimeZone(initialData.timezone || 'Asia/Kolkata');
            setCurrency(initialData.currency || 'USD');
            setCountry(initialData.country || '');
            setAddress(initialData.address || '');
            setDefaultEmployeePassword(initialData.default_employee_password || 'Pass@123');
        }
    }, [initialData]);

    const getCompanyDetailsPayload = useCallback((): Partial<CompanyUpdateInput> => {
        return {
            name: companyName,
            logo: companyLogo,
            tax_id: taxId,
            tax_id_type: taxIdType,
            timezone: timeZone,
            currency: currency,
            country: country,
            address: address,
            default_employee_password: defaultEmployeePassword,
        };
    }, [companyName, companyLogo, taxId, taxIdType, timeZone, currency, country, address, defaultEmployeePassword]);

    return {
        companyName, setCompanyName,
        companyLogo, setCompanyLogo,
        taxId, setTaxId,
        taxIdType, setTaxIdType,
        timeZone, setTimeZone,
        currency, setCurrency,
        country, setCountry,
        address, setAddress,
        defaultEmployeePassword, setDefaultEmployeePassword,
        resetCompanyDetails,
        getCompanyDetailsPayload
    };
};
