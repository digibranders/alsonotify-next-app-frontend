import { useState, useMemo, useCallback } from 'react';
import dayjs from '@/utils/dayjs';
import { formatDateForApi, getTodayForApi } from '@/utils/date';
import { Input, DatePicker, Checkbox, App, Button, Modal, Select } from 'antd';
import { Upload as UploadIcon, FileText, ChevronDown } from 'lucide-react';
import { useOutsourcePartners, useEmployees } from '@/hooks/useUser';
import { FormLayout } from '@/components/common/FormLayout';
import { trimStr } from '@/utils/trim';
import { WorkspaceForm } from './WorkspaceForm';

const { TextArea } = Input;
const { Option } = Select;

import { CreateRequirementRequestDto } from '@/types/dto/requirement.dto';

export interface RequirementFormData {
    title: string;
    workspace: string | number | undefined;
    type: 'inhouse' | 'outsourced' | 'client' | 'Client work' | 'Client Work';
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
    /** Save as draft: create → backend sets Draft; edit → update fields, keep Draft */
    onSubmit: (data: CreateRequirementRequestDto, files?: File[]) => void;
    /** Send requirement: create then set Waiting/Assigned; edit Draft → set Waiting/Assigned */
    onSubmitAndSend?: (data: CreateRequirementRequestDto, files?: File[]) => void;
    onCancel: () => void;
    workspaces: { id: number | string; name: string; company_name?: string }[];
    isLoading?: boolean;
    isEditing?: boolean;
    open?: boolean; // Added for Modal support
}

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

export function RequirementsForm(props: Readonly<RequirementsFormProps>) {
    const { open, onCancel } = props;

    // Use Modal wrapper pattern if 'open' prop is provided, otherwise render content directly
    // (Legacy support for components that wrap it in a Modal themselves)
    if (open !== undefined) {
        return (
            <Modal
                open={open}
                onCancel={onCancel}
                footer={null}
                title={null}
                width={700}
                centered
                destroyOnHidden={true}
                className="rounded-[16px] overflow-hidden"
                styles={{
                    body: {
                        padding: 0,
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                <RequirementsFormContent {...props} />
            </Modal>
        );
    }

    return <RequirementsFormContent {...props} />;
}

function RequirementsFormContent({
    initialData,
    onSubmit,
    onSubmitAndSend,
    onCancel,
    workspaces,
    isLoading = false,
    isEditing = false,
}: Readonly<RequirementsFormProps>) {
    const { data: partnersData, isLoading: isLoadingPartners } = useOutsourcePartners();
    const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
    const { message } = App.useApp();

    // Process partners - filter for active and ensure unique IDs
    const partners = useMemo(() => (partnersData?.result || [])
        .filter((item: any) => (item.status === 'ACCEPTED' || item.is_active === true) && item.is_active !== false)
        .map((item: any) => {
            const id = item.id ?? item.user_id ?? item.partner_user_id ?? item.client_id ?? item.outsource_id ?? item.association_id ?? item.invite_id;
            return {
                id: (typeof id === 'number' ? id : undefined) as number | undefined,
                name: (item.partner_user?.name || item.name || item.partner_user?.company || item.company || 'Unknown Partner') as string,
                company: (item.partner_user?.company || item.company) as string | undefined,
                company_id: item.company_id as number | undefined
            };
        })
        .filter((p: { id?: number }) => p.id !== undefined), [partnersData]);

    // Process employees
    const employees = useMemo(() => (employeesData?.result || [])
        .filter((item: any) => item.user_employee?.is_active !== false)
        .map((item: any) => {
            const id = item.user_id ?? item.id;
            return {
                id: (typeof id === 'number' ? id : undefined) as number | undefined,
                name: (item.name || 'Unknown Employee') as string,
                designation: item.designation as string | undefined
            };
        })
        .filter((e: { id?: number }) => e.id !== undefined), [employeesData]);

    // Initialize state directly (runs once on mount)
    const [formData, setFormData] = useState<RequirementFormData>(() => {
        if (initialData) {
            return {
                ...defaultFormData,
                ...initialData,
                contact_person_id: initialData.contact_person_id ?? undefined,
                workspace: initialData.workspace ?? undefined
            };
        }
        return defaultFormData;
    });


    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isWorkspaceCreateOpen, setIsWorkspaceCreateOpen] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const maxSize = 50 * 1024 * 1024; // 50MB

            const oversizedFiles = files.filter(file => file.size > maxSize);
            if (oversizedFiles.length > 0) {
                message.error(`File size must be less than 50MB. ${oversizedFiles.length} file(s) exceeded the limit.`);
                return;
            }

            setSelectedFiles(files);
        }
    };

    const buildPayload = useCallback((): CreateRequirementRequestDto | null => {
        const title = (formData.title || '').trim();
        const workspaceId = formData.workspace ? Number(formData.workspace) : 0;
        if (!title) {
            message.error('Requirement title is required');
            return null;
        }
        if (!workspaceId) {
            message.error('Please select a workspace');
            return null;
        }
        const selectedPartner = partners.find(p => p.id === formData.contact_person_id);
        return {
            name: title,
            title,
            workspace_id: workspaceId,
            description: formData.description?.trim() ?? '',
            type: (formData.type === 'client' || formData.type === 'Client work' || formData.type === 'Client Work') ? 'client' : formData.type as 'inhouse' | 'outsourced',
            is_high_priority: formData.is_high_priority,
            contact_person_id: formData.contact_person_id,
            contact_person: formData.contactPerson != null ? trimStr(String(formData.contactPerson)) : undefined,
            receiver_company_id: (formData.type === 'client' || formData.type === 'Client work' || formData.type === 'Client Work') ? undefined : selectedPartner?.company_id,
            sender_company_id: (formData.type === 'client' || formData.type === 'Client work' || formData.type === 'Client Work') ? selectedPartner?.company_id : undefined,
            budget: Number(formData.budget) || 0,
            quoted_price: Number(formData.quoted_price) || undefined,
            currency: formData.currency || 'USD',
            end_date: formData.dueDate ? formatDateForApi(formData.dueDate) : undefined,
            start_date: getTodayForApi(),
        };
    }, [formData, partners, message]);

    const onSaveDraft = useCallback(() => {
        const payload = buildPayload();
        if (!payload) return;
        try {
            onSubmit(payload, selectedFiles);
        } catch (err) {
            message.error('Failed to save draft');
        }
    }, [buildPayload, onSubmit, selectedFiles, message]);

    const onSendRequirement = useCallback(() => {
        const payload = buildPayload();
        if (!payload) return;
        if (!onSubmitAndSend) {
            onSubmit(payload, selectedFiles);
            return;
        }
        try {
            onSubmitAndSend(payload, selectedFiles);
        } catch (err) {
            message.error('Failed to send requirement');
        }
    }, [buildPayload, onSubmit, onSubmitAndSend, selectedFiles, message]);

    const sendButtonLabel = isEditing ? 'Update' : (formData.type === 'outsourced' ? 'Send to Partner' : (formData.type === 'client' || formData.type === 'Client work' || formData.type === 'Client Work') ? 'Log Client Work' : formData.type === 'inhouse' ? 'Submit for Work' : 'Send Requirement');

    const footer = (
        <>
            <Button
                type="text"
                onClick={onCancel}
                className="h-11 px-6 text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-xl transition-all"
            >
                Cancel
            </Button>
            {!isEditing && (
                <Button
                    type="default"
                    onClick={onSaveDraft}
                    loading={isLoading}
                    disabled={isLoading}
                    className="h-11 px-6 text-[14px] font-['Manrope:SemiBold',sans-serif] rounded-xl border border-[#EEEEEE] hover:border-[#111111] hover:text-[#111111] transition-all"
                >
                    Save draft
                </Button>
            )}
            <Button
                type="primary"
                onClick={isEditing ? onSaveDraft : onSendRequirement}
                loading={isLoading}
                disabled={isLoading}
                className="h-11 px-8 rounded-xl bg-[#111111] hover:bg-[#000000] text-white text-[14px] font-['Manrope:SemiBold',sans-serif] border-none shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {sendButtonLabel}
            </Button>
        </>
    );

    return (
        <FormLayout
            title={isEditing ? 'Edit Requirement' : 'New Requirement'}
            subtitle={isEditing ? 'Update the details of your requirement.' : 'Define a new requirement and send it for approval/processing.'}
            icon={FileText}
            onCancel={onCancel}
            onSubmit={onSaveDraft}
            isLoading={isLoading}
            submitLabel={sendButtonLabel}
            footer={footer}
        >
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
                        onChange={(v) => {
                            if (v === 'create_new') {
                                setIsWorkspaceCreateOpen(true);
                            } else {
                                setFormData({ ...formData, workspace: v });
                            }
                        }}
                        popupStyle={{ zIndex: 2000 }}
                        suffixIcon={<ChevronDown className="w-4 h-4 text-gray-400" />}
                        disabled={false}
                    >
                        {workspaces && workspaces.length > 0 ? (
                            <>
                                <Option key="create_new" value="create_new" className="text-[#ff3b3b] font-medium border-b border-gray-100 pb-2 mb-2">
                                    + Create New Workspace
                                </Option>
                                {workspaces.map((w) => (
                                    <Option key={String(w.id)} value={String(w.id)} label={w.name}>
                                        <div className="flex flex-col py-1">
                                            <span className="font-medium text-[#111111] leading-tight">{w.name}</span>
                                            <span className="text-[10px] text-[#999999] leading-tight">
                                                {w.company_name || 'In-house'}
                                            </span>
                                        </div>
                                    </Option>
                                ))}
                            </>
                        ) : (
                            <>
                                <Option key="create_new" value="create_new" className="text-[#ff3b3b] font-medium border-b border-gray-100 pb-2 mb-2">
                                    + Create New Workspace
                                </Option>
                                <Option value="none" disabled>
                                    No workspaces available
                                </Option>
                            </>
                        )}
                    </Select>
                </div>
            </div>

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
                            workspace: formData.workspace
                        })}
                        suffixIcon={<ChevronDown className="w-4 h-4 text-gray-400" />}
                    >
                        <Option value="inhouse">In-house (Internal)</Option>
                        <Option value="outsourced">Partner (Outsourced)</Option>
                        <Option value="client">Client Work (Received)</Option>
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
                        placeholder={`Select ${formData.type === 'inhouse' ? 'employee' : (formData.type === 'client' || formData.type === 'Client work' || formData.type === 'Client Work' ? 'client/partner' : 'partner')}`}
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

            <WorkspaceForm
                open={isWorkspaceCreateOpen}
                onCancel={() => setIsWorkspaceCreateOpen(false)}
                onSuccess={(data: any) => {
                    const newWorkspaceId = data?.result?.id || data?.id;
                    if (newWorkspaceId) {
                        setFormData(prev => ({ ...prev, workspace: String(newWorkspaceId) }));
                    }
                    setIsWorkspaceCreateOpen(false);
                }}
            />
        </FormLayout>
    );
}
