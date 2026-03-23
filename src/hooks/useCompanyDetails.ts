import { useState, useCallback } from 'react';
import { CompanyProfile } from '@/types/auth';
import { CompanyUpdateInput } from '@/types/domain';
import { trimStr } from '@/utils/trim';

interface UseCompanyDetailsProps {
    initialData?: CompanyProfile | null;
}

export const useCompanyDetails = ({ initialData }: UseCompanyDetailsProps) => {
    const [formData, setFormData] = useState({
        companyName: initialData?.name || '',
        companyLogo: initialData?.logo || '',
        taxId: initialData?.tax_id || '',
        taxIdType: initialData?.tax_id_type || '',
        timeZone: initialData?.timezone || 'Asia/Kolkata',
        currency: initialData?.currency || 'USD',
        country: initialData?.country || '',
        address: initialData?.address || '',
        addressLine1: initialData?.address_line_1 || '',
        addressLine2: initialData?.address_line_2 || '',
        city: initialData?.city || '',
        state: initialData?.state || '',
        zipcode: initialData?.zipcode || '',
        defaultEmployeePassword: initialData?.default_employee_password || 'Pass@123',
        accountManagerIds: initialData?.account_managers?.map(v => v.id) || []
    });

    const [prevInitialData, setPrevInitialData] = useState(initialData);

    // Adjust state during render when initialData changes. 
    // This is the recommended pattern to avoid useEffect cascading renders.
    if (initialData !== prevInitialData) {
        setPrevInitialData(initialData);
        setFormData({
            companyName: initialData?.name || '',
            companyLogo: initialData?.logo || '',
            taxId: initialData?.tax_id || '',
            taxIdType: initialData?.tax_id_type || '',
            timeZone: initialData?.timezone || 'Asia/Kolkata',
            currency: initialData?.currency || 'USD',
            country: initialData?.country || '',
            address: initialData?.address || '',
            addressLine1: initialData?.address_line_1 || '',
            addressLine2: initialData?.address_line_2 || '',
            city: initialData?.city || '',
            state: initialData?.state || '',
            zipcode: initialData?.zipcode || '',
            defaultEmployeePassword: initialData?.default_employee_password || 'Pass@123',
            accountManagerIds: initialData?.account_managers?.map(v => v.id) || []
        });
    }

    const resetCompanyDetails = useCallback(() => {
        if (initialData) {
            setFormData({
                companyName: initialData.name || '',
                companyLogo: initialData.logo || '',
                taxId: initialData.tax_id || '',
                taxIdType: initialData.tax_id_type || '',
                timeZone: initialData.timezone || 'Asia/Kolkata',
                currency: initialData.currency || 'USD',
                country: initialData.country || '',
                address: initialData.address || '',
                addressLine1: initialData.address_line_1 || '',
                addressLine2: initialData.address_line_2 || '',
                city: initialData.city || '',
                state: initialData.state || '',
                zipcode: initialData.zipcode || '',
                defaultEmployeePassword: initialData.default_employee_password || 'Pass@123',
                accountManagerIds: initialData.account_managers?.map(v => v.id) || []
            });
        }
    }, [initialData]);

    const getCompanyDetailsPayload = useCallback((): Partial<CompanyUpdateInput> => {
        return {
            name: trimStr(formData.companyName),
            logo: trimStr(formData.companyLogo) || undefined,
            tax_id: trimStr(formData.taxId) || undefined,
            tax_id_type: trimStr(formData.taxIdType) || undefined,
            timezone: trimStr(formData.timeZone),
            currency: trimStr(formData.currency),
            country: trimStr(formData.country) || undefined,
            address: trimStr(formData.address) || undefined,
            address_line_1: trimStr(formData.addressLine1) || undefined,
            address_line_2: trimStr(formData.addressLine2) || undefined,
            city: trimStr(formData.city) || undefined,
            state: trimStr(formData.state) || undefined,
            zipcode: trimStr(formData.zipcode) || undefined,
            default_employee_password: trimStr(formData.defaultEmployeePassword) || undefined,
            account_manager_ids: formData.accountManagerIds,
        };
    }, [formData]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateField = useCallback((field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    return {
        ...formData,
        setCompanyName: (val: string) => updateField('companyName', val),
        setCompanyLogo: (val: string) => updateField('companyLogo', val),
        setTaxId: (val: string) => updateField('taxId', val),
        setTaxIdType: (val: string) => updateField('taxIdType', val),
        setTimeZone: (val: string) => updateField('timeZone', val),
        setCurrency: (val: string) => updateField('currency', val),
        setCountry: (val: string) => updateField('country', val),
        setAddress: (val: string) => updateField('address', val),
        setAddressLine1: (val: string) => updateField('addressLine1', val),
        setAddressLine2: (val: string) => updateField('addressLine2', val),
        setCity: (val: string) => updateField('city', val),
        setState: (val: string) => updateField('state', val),
        setZipcode: (val: string) => updateField('zipcode', val),
        setDefaultEmployeePassword: (val: string) => updateField('defaultEmployeePassword', val),
        setAccountManagerIds: (val: number[]) => updateField('accountManagerIds', val),
        resetCompanyDetails,
        getCompanyDetailsPayload
    };
};
