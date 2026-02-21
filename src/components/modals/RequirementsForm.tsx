import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import dayjs from '@/utils/dayjs';
import { formatDateForApi, getTodayForApi } from '@/utils/date';
import { Input, DatePicker, Checkbox, App, Button, Modal, Select } from 'antd';
import { Upload as UploadIcon, FileText, ChevronDown } from 'lucide-react';
import { useEmployeesDropdown } from '@/hooks/useUser';
import { getOutsourcedContacts } from '@/services/user';
import { FormLayout } from '@/components/common/FormLayout';
import { trimStr } from '@/utils/trim';
import { WorkspaceForm } from './WorkspaceForm';

const { TextArea } = Input;
const { Option } = Select;

import { CreateRequirementRequestDto } from '@/types/dto/requirement.dto';

export interface RequirementFormData {
    title: string;
    workspace: string | number | undefined;
    type: 'inhouse' | 'outsourced' | 'client';
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
    workspaces: { id: number | string; name: string; company_name?: string; partner_name?: string; in_house?: boolean }[];
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
                width="min(700px, 95vw)"
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
    useAuth();
    // useEmployeesDropdown fetches /user/user-dropdown with limit=1000 — same hook as TasksPage
    // useEmployees fetches /user? (paginated) with complex DTO mapping that can yield empty results
    const { data: employeesDropdownData, isLoading: isLoadingEmployees } = useEmployeesDropdown();
    const { message } = App.useApp();

    // employeesDropdownData is already { id: number; name: string }[] via the hook's select transform
    const employees = useMemo(
        () => employeesDropdownData ?? [],
        [employeesDropdownData]
    );

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

    // New state for outsourced contacts
    interface OutsourcedContact {
        id: number;
        name: string;
        role: string;
        company_id: number;
        company_name: string;
    }
    const [outsourcedContacts, setOutsourcedContacts] = useState<OutsourcedContact[]>([]);
    const [isLoadingOutsourcedContacts, setIsLoadingOutsourcedContacts] = useState(false);

    // Fetch outsourced contacts when type is 'outsourced' or 'client'
    useEffect(() => {
        const fetchOutsourcedContacts = async () => {
            setIsLoadingOutsourcedContacts(true);
            try {
                const response = await getOutsourcedContacts();
                if (response.success && response.result) {
                    setOutsourcedContacts(response.result);
                }
            } catch (error) {
                console.error('Failed to fetch outsourced contacts:', error);
                message.error('Failed to load eligible contact persons.');
            } finally {
                setIsLoadingOutsourcedContacts(false);
            }
        };

        if (formData.type === 'client' || formData.type === 'outsourced') {
            fetchOutsourcedContacts();
        } else {
            setOutsourcedContacts([]);
        }
    }, [formData.type, message]);

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
        const isClientWork = formData.type === 'client';

        if (!title) {
            message.error('Requirement title is required');
            return null;
        }
        if (!workspaceId) {
            message.error('Please select a workspace');
            return null;
        }

        // Determine receiver/sender company
        let receiverCompanyId = formData.receiver_company_id;
        let senderCompanyId = undefined;
        if ((formData.type === 'outsourced' || isClientWork) && formData.contact_person_id) {
            const contact = outsourcedContacts.find(c => c.id === formData.contact_person_id);
            if (contact) {
                if (formData.type === 'outsourced') {
                    receiverCompanyId = contact.company_id;
                } else {
                    senderCompanyId = contact.company_id;
                }
            }
        }

        return {
            name: title,
            title,
            workspace_id: workspaceId,
            description: formData.description?.trim() ?? '',
            type: isClientWork ? 'client' : formData.type as 'inhouse' | 'outsourced',
            is_high_priority: formData.is_high_priority,
            contact_person_id: formData.contact_person_id,
            contact_person: formData.contactPerson != null ? trimStr(String(formData.contactPerson)) : undefined,
            receiver_company_id: isClientWork ? undefined : receiverCompanyId,
            sender_company_id: isClientWork ? senderCompanyId : undefined,
            budget: Number(formData.budget) || 0,
            quoted_price: isClientWork ? (Number(formData.quoted_price) || undefined) : undefined,
            currency: formData.currency || 'USD',
            end_date: formData.dueDate ? formatDateForApi(formData.dueDate) : undefined,
            start_date: getTodayForApi(),
            status: isClientWork ? 'Submitted' : undefined,
        };
    }, [formData, outsourcedContacts, message]);

    const onSaveDraft = useCallback(() => {
        if (isLoading) return;
        const payload = buildPayload();
        if (!payload) return;
        try {
            onSubmit(payload, selectedFiles);
        } catch (err) {
            message.error('Failed to save draft');
        }
    }, [buildPayload, onSubmit, selectedFiles, message, isLoading]);

    const onSendRequirement = useCallback(() => {
        if (isLoading) return;
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
    }, [buildPayload, onSubmit, onSubmitAndSend, selectedFiles, message, isLoading]);

    const sendButtonLabel = isEditing ? 'Update' : (formData.type === 'outsourced' ? 'Send to Partner' : (formData.type === 'client') ? 'Log Client Work' : formData.type === 'inhouse' ? 'Submit for Work' : 'Send Requirement');

    const footer = (
        <>
            <Button
                type="text"
                onClick={onCancel}
                className="h-11 px-6 text-sm font-semibold text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-xl transition-all"
            >
                Cancel
            </Button>
            {!isEditing && (
                <Button
                    type="default"
                    onClick={onSaveDraft}
                    loading={isLoading}
                    disabled={isLoading}
                    className="h-11 px-6 text-sm font-semibold rounded-xl border border-[#EEEEEE] hover:border-[#111111] hover:text-[#111111] transition-all"
                >
                    Save draft
                </Button>
            )}
            <Button
                type="primary"
                onClick={isEditing ? onSaveDraft : onSendRequirement}
                loading={isLoading}
                disabled={isLoading}
                className="h-11 px-8 rounded-xl bg-[#111111] hover:bg-[#000000] text-white text-sm font-semibold border-none shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <span className="text-[0.8125rem] font-bold text-[#111111]">Requirement Title</span>
                    <Input
                        placeholder="Enter requirement title"
                        className="h-11 rounded-lg border border-[#EEEEEE]"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>
                <div className="space-y-1.5">
                    <span className="text-[0.8125rem] font-bold text-[#111111]">Workspace</span>
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
                                            <span className="text-[0.625rem] text-[#999999] leading-tight">
                                                {w.in_house ? w.company_name : w.partner_name || 'Organization'}
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
                    <span className="text-[0.8125rem] font-bold text-[#111111]">Requirement Type</span>
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
                        <Option value="inhouse">In-house</Option>
                        <Option value="outsourced">Outsourced</Option>
                        <Option value="client">Client-Work</Option>
                    </Select>
                </div>

                {/* Removed Partner Company selection */}

                <div className="space-y-1.5" id="contact-person-selection">
                    <span className="text-[0.8125rem] font-bold text-[#111111]">Contact Person</span>
                    <Select
                        showSearch
                        filterOption={(input, option) =>
                            (String(option?.label ?? '')).toLowerCase().includes(input.toLowerCase())
                        }
                        className="w-full h-11"
                        placeholder={`Select ${formData.type === 'inhouse' ? 'employee' : 'contact person'}`}
                        value={typeof formData.contact_person_id === 'number' ? formData.contact_person_id : undefined}
                        onChange={(v, option) => setFormData({
                            ...formData,
                            contact_person_id: typeof v === 'number' ? v : undefined,
                            contactPerson: (option as { label?: string } | null)?.label
                        })}
                        loading={formData.type === 'inhouse' ? isLoadingEmployees : isLoadingOutsourcedContacts}
                        suffixIcon={<ChevronDown className="w-4 h-4 text-gray-400" />}
                        optionLabelProp="label"
                        popupStyle={{ zIndex: 2000 }}
                    >
                        {formData.type === 'inhouse' ? (
                            employees.map((e) => (
                                <Option key={e.id} value={e.id} label={e.name}>
                                    <div className="flex flex-col py-1">
                                        <span className="font-semibold">{e.name}</span>
                                    </div>
                                </Option>
                            ))
                        ) : (
                            outsourcedContacts.map((c) => (
                                <Option key={c.id} value={c.id} label={c.name}>
                                    <div className="flex flex-col py-1">
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold">{c.name}</span>
                                            {c.role && <span className="text-gray-500 text-[0.6875rem]">({c.role})</span>}
                                        </div>
                                        <span className="text-[0.625rem] text-gray-400 font-normal mt-0.5">{c.company_name}</span>
                                    </div>
                                </Option>
                            ))
                        )}
                    </Select>
                </div>
            </div>


            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
                <div className="space-y-1.5">
                    <span className="text-[0.8125rem] font-bold text-[#111111]">Due Date</span>
                    <DatePicker
                        placeholder="Select due date"
                        className="w-full h-11 rounded-lg border-[#EEEEEE]"
                        value={formData.dueDate ? dayjs(formData.dueDate) : null}
                        onChange={(date, dateString) => setFormData({ ...formData, dueDate: Array.isArray(dateString) ? dateString[0] : dateString })}
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                </div>
                {(formData.type === 'client') && (
                    <div className="space-y-1.5">
                        <span className="text-[0.8125rem] font-bold text-[#111111]">Quotation price</span>
                        <Input
                            type="number"
                            placeholder="Enter quotation price"
                            className="h-11 rounded-lg border border-[#EEEEEE]"
                            value={formData.quoted_price}
                            onChange={(e) => setFormData({ ...formData, quoted_price: e.target.value })}
                        />
                    </div>
                )}
            </div>

            <div className="space-y-1.5 mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-[0.8125rem] font-bold text-[#111111]">Description</span>
                    <Checkbox
                        checked={formData.is_high_priority}
                        onChange={(e) => setFormData({ ...formData, is_high_priority: e.target.checked })}
                        className="font-semibold text-[0.8125rem] text-[#111111]"
                    >
                        High Priority
                    </Checkbox>
                </div>
                <TextArea
                    placeholder="Describe the requirement..."
                    className="min-h-[100px] rounded-lg border border-[#EEEEEE] resize-none p-3.5"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            <div className="space-y-1.5">
                <span className="text-[0.8125rem] font-bold text-[#111111]">Upload Documents</span>
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
                            <p className="text-xs font-bold text-[#111111] mb-0.5">
                                {selectedFiles.length} file(s) selected
                            </p>
                            <div className="text-[0.625rem] text-[#666666] font-normal">
                                {selectedFiles.map(f => f.name).join(', ')}
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs font-bold text-[#111111] mb-0.5">
                                Choose files or drop them here
                            </p>
                            <p className="text-[0.625rem] text-[#999999] font-normal">
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
