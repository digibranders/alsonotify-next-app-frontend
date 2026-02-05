import { useState, useEffect, useCallback } from 'react';
import { CompanyProfile } from '@/types/auth'; // Adjust import based on actual location
import { CompanyUpdateInput } from '@/types/genericTypes';

interface UseCompanyDetailsProps {
    companyData?: { result?: CompanyProfile };
}

export const useCompanyDetails = ({ companyData }: UseCompanyDetailsProps) => {
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState('');
    const [taxId, setTaxId] = useState('');
    const [taxIdType, setTaxIdType] = useState('');
    const [timeZone, setTimeZone] = useState('Asia/Kolkata');
    const [currency, setCurrency] = useState('USD');
    const [country, setCountry] = useState('');
    const [address, setAddress] = useState('');

    const [defaultEmployeePassword, setDefaultEmployeePassword] = useState('Pass@123');

    // Sync with backend data
    useEffect(() => {
        if (companyData?.result) {
            setCompanyName(companyData.result.name || '');
            setCompanyLogo(companyData.result.logo || '');
            setTaxId(companyData.result.tax_id || '');
            setTaxIdType(companyData.result.tax_id_type || '');
            setTimeZone(companyData.result.timezone || 'Asia/Kolkata');
            setCurrency(companyData.result.currency || 'USD');
            setCountry(companyData.result.country || '');
            setAddress(companyData.result.address || '');
            setDefaultEmployeePassword(companyData.result.default_employee_password || 'Pass@123');
        }
    }, [companyData]);

    const resetCompanyDetails = useCallback(() => {
        if (companyData?.result) {
            setCompanyName(companyData.result.name || '');
            setCompanyLogo(companyData.result.logo || '');
            setTaxId(companyData.result.tax_id || '');
            setTaxIdType(companyData.result.tax_id_type || '');
            setTimeZone(companyData.result.timezone || 'Asia/Kolkata');
            setCurrency(companyData.result.currency || 'USD');
            setCountry(companyData.result.country || '');
            setAddress(companyData.result.address || '');
            setDefaultEmployeePassword(companyData.result.default_employee_password || 'Pass@123');
        }
    }, [companyData]);

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
