import { useState, useCallback, useEffect } from 'react';
import { CompanyProfile } from '@/types/auth';
import { CompanyUpdateInput } from '@/types/genericTypes';
import { trimStr } from '@/utils/trim';

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
            name: trimStr(companyName),
            logo: trimStr(companyLogo) || undefined,
            tax_id: trimStr(taxId) || undefined,
            tax_id_type: trimStr(taxIdType) || undefined,
            timezone: trimStr(timeZone),
            currency: trimStr(currency),
            country: trimStr(country) || undefined,
            address: trimStr(address) || undefined,
            default_employee_password: trimStr(defaultEmployeePassword) || undefined,
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
