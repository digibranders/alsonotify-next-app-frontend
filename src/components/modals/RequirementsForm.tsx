'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Input, Select, Button, DatePicker, Checkbox, App } from 'antd';
import { Upload as UploadIcon, FileText, ChevronDown, User } from 'lucide-react';
import { useOutsourcePartners, useEmployees } from '@/hooks/useUser';
import { FormLayout } from '@/components/common/FormLayout';

const { TextArea } = Input;
const { Option } = Select;

import { CreateRequirementRequestDto } from '@/types/dto/requirement.dto';

export interface RequirementFormData {
    title: string;
    workspace: string | number | undefined;
    type: 'inhouse' | 'outsourced';
    contactPerson?: string;
    contact_person_id?: number;
    dueDate: string;
    budget?: string;
    quoted_price?: string;
    currency?: string;
    is_high_priority?: boolean;
    description: string;
    status?: string;
    receiver_company_id?: number;
}

interface RequirementsFormProps {
    initialData?: RequirementFormData;
    onSubmit: (data: CreateRequirementRequestDto, files?: File[]) => void;
    onCancel: () => void;
    workspaces: { id: number | string; name: string }[];
    isLoading?: boolean;
    isEditing?: boolean;
}

export function RequirementsForm({
    initialData,
    onSubmit,
    onCancel,
    workspaces,
    isLoading = false,
    isEditing = false,
}: Readonly<RequirementsFormProps>) {
    const { data: partnersData, isLoading: isLoadingPartners, refetch: refetchPartners } = useOutsourcePartners();
    const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
    const { message } = App.useApp();


    // Refetch partners when form opens to ensure fresh data (especially after status changes)
    useEffect(() => {
        refetchPartners();
    }, [refetchPartners]);

    // Process partners - filter for active and ensure unique IDs
    const partners = (partnersData?.result || [])
        // Relaxed filter: Allow if status is ACCEPTED OR if is_active is explicitly true (handling potential missing status in legacy data)
        .filter((item: any) => (item.status === 'ACCEPTED' || item.is_active === true) && item.is_active !== false)
        .map((item: any) => {
            // Fix: Backend returns client_id/outsource_id/association_id/invite_id, not user_... prefixes
            const id = item.id ?? item.user_id ?? item.partner_user_id ?? item.client_id ?? item.outsource_id ?? item.association_id ?? item.invite_id;
            return {
                id: (typeof id === 'number' ? id : undefined) as number | undefined,
                name: (item.partner_user?.name || item.name || item.partner_user?.company || item.company || 'Unknown Partner') as string,
                company: (item.partner_user?.company || item.company) as string | undefined,
                company_id: item.company_id as number | undefined // Preserve company_id for receiver_company_id logic
            };
        })
        .filter((p: { id?: number }) => p.id !== undefined);

    // Process employees
    const employees = (employeesData?.result || [])
        .filter((item: any) => item.user_employee?.is_active !== false)
        .map((item: any) => {
            const id = item.user_id ?? item.id;
            return {
                id: (typeof id === 'number' ? id : undefined) as number | undefined,
                name: (item.name || 'Unknown Employee') as string,
                designation: item.designation as string | undefined
            };
        })
        .filter((e: { id?: number }) => e.id !== undefined);

    const defaultFormData: RequirementFormData = {
        title: '',
        workspace: undefined,
        type: 'inhouse',
        contactPerson: undefined,
        dueDate: '',
        budget: '',
        is_high_priority: false,
        description: '',
    };

    const [formData, setFormData] = useState<RequirementFormData>({
        ...defaultFormData,
        ...initialData,
    });

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    // Reset form when initialData changes (for editing mode switching or new creation)
    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({
                ...prev,
                ...initialData,
                contact_person_id: initialData.contact_person_id ?? undefined,
                workspace: initialData.workspace ?? undefined
            }));
            setSelectedFiles([]); // Reset files on edit mode change or reopen
        } else {
            // Explicitly reset to defaults when no initialData is provided (New Requirement mode)
            setFormData(defaultFormData);
            setSelectedFiles([]);
        }
    }, [initialData]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const maxSize = 50 * 1024 * 1024; // 50MB

            // Validate file sizes
            const oversizedFiles = files.filter(file => file.size > maxSize);
            if (oversizedFiles.length > 0) {
                message.error(`File size must be less than 50MB. ${oversizedFiles.length} file(s) exceeded the limit.`);
                return;
            }

            setSelectedFiles(files);
        }
    };

    const handleSubmit = () => {
        // Find the selected partner to extract receiver_company_id
        const selectedPartner = partners.find(p => p.id === formData.contact_person_id);

        console.log('RequirementsForm handleSubmit DEBUG:', {
            formDataType: formData.type,
            formDataContactPersonId: formData.contact_person_id,
            formDataWorkspace: formData.workspace,
            partnersCount: partners.length,
            selectedPartner,
            derivedReceiverCompanyId: selectedPartner?.company_id,
        });

        // Build payload with workspace_id
        const payload: CreateRequirementRequestDto = {
            name: formData.title,
            title: formData.title, // Keep title for DTO compatibility if needed, but 'name' is what backend reads
            workspace_id: formData.workspace ? Number(formData.workspace) : 0, // Ensure valid ID
            description: formData.description,
            type: formData.type,
            status: 'Assigned', // specific string literal if required or mapped
            is_high_priority: formData.is_high_priority,
            contact_person_id: formData.contact_person_id,
            contact_person: formData.contactPerson,
            receiver_company_id: selectedPartner?.company_id,
            budget: Number(formData.budget) || 0,
            quoted_price: Number(formData.quoted_price) || undefined,
            currency: formData.currency || 'USD',
            end_date: formData.dueDate ? dayjs(formData.dueDate).toISOString() : undefined,
            start_date: new Date().toISOString(),
            // Note: priority enum removed - backend uses is_high_priority boolean directly
        };

        onSubmit(payload, selectedFiles);
    };

    return (
        <FormLayout
            title={isEditing ? 'Edit Requirement' : 'New Requirement'}
            subtitle="Define a new requirement and send it for approval/processing."
            icon={FileText}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitLabel={isEditing ? 'Update Requirement' : 'Send Requirement'}
        >
            {/* Row 1: Title & Workspace */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
                <div className="space-y-1.5">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Requirement Title</span>
                    <Input
                        placeholder="Enter requirement title"
                        className="h-11 rounded-lg border border-[#EEEEEE]"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>
                <div className="space-y-1.5">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Workspace</span>
                    <Select
                        showSearch={{
                            filterOption: (input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }}
                        className="w-full h-11"
                        placeholder="Select workspace"
                        value={formData.workspace ? String(formData.workspace) : undefined}
                        onChange={(v) => setFormData({ ...formData, workspace: v })}
                        popupStyle={{ zIndex: 2000 }}
                        suffixIcon={<ChevronDown className="w-4 h-4 text-gray-400" />}
                        disabled={false}
                    >
                        {workspaces && workspaces.length > 0 ? (
                            workspaces.map((w) => (
                                <Option key={String(w.id)} value={String(w.id)}>
                                    {w.name}
                                </Option>
                            ))
                        ) : (
                            <Option value="none" disabled>
                                No workspaces available
                            </Option>
                        )}
                    </Select>
                </div>
            </div>

            {/* Row 2: Requirement Type & Contact Person */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
                <div className="space-y-1.5">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Requirement Type</span>
                    <Select
                        className="w-full h-11"
                        placeholder="Select type"
                        value={formData.type}
                        onChange={(v) => setFormData({
                            ...formData,
                            type: v,
                            contact_person_id: undefined,
                            contactPerson: undefined,
                            // Keep workspace even if outsourced
                            workspace: formData.workspace
                        })}
                        suffixIcon={<ChevronDown className="w-4 h-4 text-gray-400" />}
                    >
                        <Option value="inhouse">In-house</Option>
                        <Option value="outsourced">Partner (Outsourced)</Option>
                    </Select>
                </div>

                <div className="space-y-1.5" id="contact-person-selection">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Contact Person</span>
                    <Select
                        showSearch={{
                            filterOption: (input, option) =>
                                (String(option?.label ?? '')).toLowerCase().includes(input.toLowerCase())
                        }}
                        className="w-full h-11"
                        placeholder={`Select ${formData.type === 'inhouse' ? 'employee' : 'partner'}`}
                        value={typeof formData.contact_person_id === 'number' ? formData.contact_person_id : undefined}
                        onChange={(v, option: any) => setFormData({
                            ...formData,
                            contact_person_id: typeof v === 'number' ? v : undefined,
                            contactPerson: option?.label
                        })}
                        loading={formData.type === 'inhouse' ? isLoadingEmployees : isLoadingPartners}
                        suffixIcon={<ChevronDown className="w-4 h-4 text-gray-400" />}
                    >
                        {formData.type === 'inhouse' ? (
                            employees.map((e: any) => (
                                <Option key={e.id} value={e.id} label={e.name}>
                                    <div className="flex flex-col py-1">
                                        <span className="font-semibold">{e.name}</span>
                                        {e.designation && <span className="text-[10px] text-gray-400 font-normal">{e.designation}</span>}
                                    </div>
                                </Option>
                            ))
                        ) : (
                            partners.map((p: any) => (
                                <Option key={p.id} value={p.id} label={p.name}>
                                    <div className="flex flex-col py-1">
                                        <span className="font-semibold">{p.name}</span>
                                        {p.company && <span className="text-[10px] text-gray-400 font-normal">{p.company}</span>}
                                    </div>
                                </Option>
                            ))
                        )}
                    </Select>
                </div>
            </div>
            {/* Row 3: Standard Fields (Due Date & Priority) */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
                <div className="space-y-1.5">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Due Date</span>
                    <DatePicker
                        placeholder="Select due date"
                        className="w-full h-11 rounded-lg border-[#EEEEEE]"
                        value={formData.dueDate ? dayjs(formData.dueDate) : null}
                        onChange={(date, dateString) => setFormData({ ...formData, dueDate: Array.isArray(dateString) ? dateString[0] : dateString })}
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                </div>
                <div className="space-y-1.5 flex flex-col justify-center">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-2">Priority</span>
                    <Checkbox
                        checked={formData.is_high_priority}
                        onChange={(e) => setFormData({ ...formData, is_high_priority: e.target.checked })}
                        className="font-medium text-sm"
                    >
                        High Priority
                    </Checkbox>
                </div>
            </div>



            {/* Description */}
            <div className="space-y-1.5 mb-4">
                <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Description</span>
                <TextArea
                    placeholder="Describe the requirement..."
                    className="min-h-[100px] rounded-lg border border-[#EEEEEE] resize-none p-3.5"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            {/* Upload Documents */}
            <div className="space-y-1.5">
                <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Upload Documents</span>
                <label
                    className="border-2 border-dashed border-[#EEEEEE] rounded-xl p-3 flex flex-col items-center justify-center text-center hover:border-[#ff3b3b]/30 hover:bg-[#FFFAFA] transition-colors cursor-pointer bg-white group"
                >
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpeg,.jpg,.png"
                    />
                    <div className="w-8 h-8 rounded-full bg-[#F7F7F7] group-hover:bg-white flex items-center justify-center mb-1.5 transition-colors">
                        <UploadIcon className="w-4 h-4 text-[#999999] group-hover:text-[#ff3b3b] transition-colors" />
                    </div>
                    {selectedFiles.length > 0 ? (
                        <div className="space-y-1">
                            <p className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-0.5">
                                {selectedFiles.length} file(s) selected
                            </p>
                            <div className="text-[10px] text-[#666666] font-['Inter:Regular',sans-serif]">
                                {selectedFiles.map(f => f.name).join(', ')}
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-0.5">
                                Choose files or drop them here
                            </p>
                            <p className="text-[10px] text-[#999999] font-['Inter:Regular',sans-serif]">
                                pdf, docx, xlsx - Up to 50MB
                            </p>
                        </>
                    )}
                </label>
            </div>
        </FormLayout>
    );
}
