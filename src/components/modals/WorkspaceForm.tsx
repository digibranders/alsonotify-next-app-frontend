import { useState } from 'react';
import { Modal, Input, Select, App } from "antd";
import { FolderOpen } from 'lucide-react';
import { useCreateWorkspace, useUpdateWorkspace } from '@/hooks/useWorkspace';
import { usePartners, useCurrentUserCompany } from '@/hooks/useUser';
import { FormLayout } from '@/components/common/FormLayout';
import { trimStr } from '@/utils/trim';

import { getErrorMessage } from '@/types/api-utils';
import { CreateWorkspaceRequestDto, UpdateWorkspaceRequestDto } from '@/types/dto/workspace.dto';
import { UserDto } from '@/types/dto/user.dto';

const { TextArea } = Input;
const { Option } = Select;

export interface WorkspaceFormData {
    id?: number;
    name: string;
    description?: string;
    partner_id?: number | null;
    in_house?: boolean;
    inHouse?: boolean; // Form state legacy
}

interface WorkspaceFormProps {
    open: boolean;
    onCancel: () => void;
    onSuccess?: (data?: unknown) => void;
    initialData?: WorkspaceFormData;
}

const defaultWorkspaceData = {
    id: null as number | null,
    name: '',
    description: '',
    partner_id: null as number | null,
    inHouse: true,
};

export function WorkspaceForm(props: WorkspaceFormProps) {
    const { open, onCancel } = props;

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            footer={null}
            title={null}
            width={600}
            centered
            className="workspace-form-modal rounded-[16px] overflow-hidden"
            closable={true}
            destroyOnHidden={true} // Ensures content is unmounted on close, resetting state
            styles={{
                body: {
                    padding: 0,
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            {/* Only render content when open to ensure fresh state initialization */}
            {open && <WorkspaceFormContent {...props} />}
        </Modal>
    );
}

function WorkspaceFormContent({ onCancel, onSuccess, initialData }: WorkspaceFormProps) {
    const { message } = App.useApp();
    const { data: partnersData } = usePartners();
    const { data: companyData } = useCurrentUserCompany();
    const createWorkspaceMutation = useCreateWorkspace();
    const updateWorkspaceMutation = useUpdateWorkspace();

    // Initialize state directly from initialData (runs once on mount)
    const [newWorkspace, setNewWorkspace] = useState(() => {
        if (initialData) {
            return {
                id: initialData.id ?? null,
                name: initialData.name || '',
                description: initialData.description || '',
                partner_id: initialData.partner_id || null,
                inHouse: initialData.in_house ?? (initialData.inHouse ?? !initialData.partner_id),
            };
        }
        return defaultWorkspaceData;
    });

    const handleAction = async () => {
        const name = trimStr(newWorkspace.name);
        const description = trimStr(newWorkspace.description) || '';
        if (!name) {
            message.error("Workspace name is required");
            return;
        }

        if (initialData?.id) {
            const updatePayload: UpdateWorkspaceRequestDto = {
                id: initialData.id,
                name,
                description,
                partner_id: newWorkspace.inHouse ? undefined : (newWorkspace.partner_id || undefined),
                in_house: newWorkspace.inHouse,
            };
            updateWorkspaceMutation.mutate(updatePayload, {
                onSuccess: (data: unknown) => {
                    message.success(`Workspace updated successfully!`);
                    if (onSuccess) onSuccess(data);
                    onCancel();
                },
                onError: (error: Error) => {
                    message.error(getErrorMessage(error, "Failed to update workspace"));
                },
            });
        } else {
            const createPayload: CreateWorkspaceRequestDto = {
                name,
                description,
                partner_id: newWorkspace.inHouse ? undefined : (newWorkspace.partner_id || undefined),
                in_house: newWorkspace.inHouse,
            };
            createWorkspaceMutation.mutate(createPayload, {
                onSuccess: (data: unknown) => {
                    message.success(`Workspace created successfully!`);
                    if (onSuccess) onSuccess(data);
                    onCancel();
                },
                onError: (error: Error) => {
                    message.error(getErrorMessage(error, "Failed to create workspace"));
                },
            });
        }
    };

    return (
        <FormLayout
            title={initialData ? 'EDIT WORKSPACE' : 'CREATE WORKSPACE'}
            subtitle={initialData ? 'Update your workspace details.' : 'Create a new workspace to organize your Requirements.'}
            icon={FolderOpen}
            isEditing={!!initialData}
            onSubmit={handleAction}
            onCancel={onCancel}
            isLoading={createWorkspaceMutation.isPending || updateWorkspaceMutation.isPending}
            submitLabel={initialData ? 'Update Workspace' : 'Create Workspace'}
            className="h-full"
        >
            <div className="grid grid-cols-2 gap-6">
                {/* Workspace Name */}
                <div className="space-y-2">
                    <label className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Workspace Name</label>
                    <Input
                        placeholder="e.g. Website Redesign"
                        className="h-11 rounded-xl border-[#EEEEEE] font-['Manrope:Medium',sans-serif]"
                        value={newWorkspace.name}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                    />
                </div>

                {/* Organization (Partner Company) */}
                <div className="space-y-2">
                    <label className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Organization</label>
                    <Select
                        showSearch={{
                            filterOption: (input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }}
                        className="w-full h-11"
                        placeholder="Select organization"
                        value={newWorkspace.inHouse ? 'self' : newWorkspace.partner_id}
                        onChange={(val) => {
                            if (val === 'self') {
                                setNewWorkspace({ ...newWorkspace, inHouse: true, partner_id: null });
                            } else {
                                setNewWorkspace({ ...newWorkspace, inHouse: false, partner_id: val as number });
                            }
                        }}
                        styles={{ popup: { root: { borderRadius: '12px', padding: '8px' } } }}
                    >
                        <Option value="self" className="rounded-lg mb-1">
                            {companyData?.result?.name || 'My Company'} (Self)
                        </Option>
                        {partnersData?.result
                            ?.filter((partner: UserDto) => partner.company_id != null)
                            .map((partner: UserDto, index: number) => {
                                // Use company_id (Company ID) for partner_id FK, not partner_user_id (User ID)
                                const partnerId = partner.company_id;
                                const companyName = typeof partner.company === 'string' ? partner.company : partner.company?.name;
                                return (
                                    <Option key={partnerId ?? `partner-${index}`} value={partnerId} className="rounded-lg mb-1">
                                        {companyName || partner.partner_company?.name || partner.email || partner.name}
                                    </Option>
                                );
                            })}
                    </Select>
                </div>

                {/* Description - Full Width */}
                <div className="col-span-2 space-y-2">
                    <label className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Description</label>
                    <TextArea
                        placeholder="Describe your workspace..."
                        className="rounded-xl border-[#EEEEEE] font-['Manrope:Medium',sans-serif] py-3"
                        rows={4}
                        value={newWorkspace.description}
                        onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                    />
                </div>
            </div>
        </FormLayout>
    );
}
