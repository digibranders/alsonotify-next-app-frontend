'use client';

import { useState, useEffect } from 'react';
import { Modal, Select, App } from 'antd';
import { X, Users, Building } from 'lucide-react';
import { Partner } from '@/types/domain';
import { AccountManager } from '@/services/user';

const { Option } = Select;

interface EditManagerPartnersModalProps {
    isOpen: boolean;
    onClose: () => void;
    manager: AccountManager;
    onSuccess: () => void;
}

export function EditManagerPartnersModal({
    isOpen,
    onClose,
    manager,
    onSuccess
}: EditManagerPartnersModalProps) {
    const { message } = App.useApp();
    const [selectedPartnerIds, setSelectedPartnerIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    // Mock partners data - TODO: Replace with actual API call
    const mockPartners: Partner[] = [];

    useEffect(() => {
        if (isOpen) {
            // Initialize with current assignments
            setSelectedPartnerIds(manager.assignedPartners.map(p => p.id));
        }
    }, [isOpen, manager]);

    const handleSave = async () => {
        try {
            setSaving(true);
            // TODO: API call to update partner assignments
            // await updateManagerPartners(manager.id, selectedPartnerIds);
            onSuccess();
        } catch (error) {
            message.error('Failed to update partner assignments');
        } finally {
            setSaving(false);
        }
    };

    const handleRemovePartner = (partnerId: number) => {
        setSelectedPartnerIds(prev => prev.filter(id => id !== partnerId));
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const assignedPartners = manager.assignedPartners.filter(p =>
        selectedPartnerIds.includes(p.id)
    );

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            title="Edit Partner Assignments"
            width="min(700px, 95vw)"
            footer={[
                <button
                    key="cancel"
                    onClick={onClose}
                    className="px-4 py-2 text-[#666666] hover:text-[#111111] transition-colors"
                >
                    Cancel
                </button>,
                <button
                    key="save"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff2b2b] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            ]}
        >
            <div className="space-y-6">
                {/* Manager Info */}
                <div className="flex items-center gap-3 p-4 bg-[#F5F5F5] rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {manager.profilePic ? (
                            <img src={manager.profilePic} alt={manager.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-[#999999]">
                                {getInitials(manager.name)}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium text-[#111111]">
                                {manager.name}
                            </h3>
                            {manager.role && (
                                <span
                                    className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase"
                                    style={{
                                        backgroundColor: manager.roleColor ? `${manager.roleColor}20` : '#F5F5F5',
                                        color: manager.roleColor || '#666666'
                                    }}
                                >
                                    {manager.role}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#666666]">
                            {manager.designation && <span>{manager.designation}</span>}
                            {manager.department && (
                                <>
                                    <span className="text-[#CCCCCC]">•</span>
                                    <span>{manager.department}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Partner Selection */}
                <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-2">
                        Assign Partners
                    </label>
                    <Select
                        mode="multiple"
                        value={selectedPartnerIds}
                        onChange={setSelectedPartnerIds}
                        placeholder="Select partners to assign..."
                        className="w-full"
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {mockPartners.map((partner) => (
                            <Option key={partner.id} value={partner.id}>
                                {partner.company || partner.name}
                            </Option>
                        ))}
                    </Select>
                    <p className="text-xs text-[#666666] mt-1">
                        {selectedPartnerIds.length} partner{selectedPartnerIds.length !== 1 ? 's' : ''} assigned
                    </p>
                </div>

                {/* Assigned Partners List */}
                {assignedPartners.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-[#111111] mb-3">
                            Assigned Partners ({assignedPartners.length})
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {assignedPartners.map(partner => (
                                <div
                                    key={partner.id}
                                    className="flex items-center gap-3 p-3 bg-white border border-[#EEEEEE] rounded-xl group hover:border-[#ff3b3b]/20 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                                        <Building className="w-5 h-5 text-[#999999]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-xs font-semibold text-[#111111] truncate">
                                            {partner.name}
                                        </h5>
                                        <div className="flex items-center gap-2 text-xs text-[#666666]">
                                            <Users className="w-3 h-3" />
                                            <span className="truncate">{partner.contactPerson}</span>
                                            <span className="text-[#CCCCCC]">•</span>
                                            <span
                                                className={`px-1.5 py-0.5 rounded text-2xs font-bold ${partner.status === 'active'
                                                    ? 'bg-[#DCFCE7] text-[#16A34A]'
                                                    : 'bg-[#F5F5F5] text-[#999999]'
                                                    }`}
                                            >
                                                {partner.status}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemovePartner(partner.id)}
                                        className="p-1.5 hover:bg-[#FFF1F0] rounded-lg text-[#ff4d4f] opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {assignedPartners.length === 0 && (
                    <div className="text-center py-8 text-[#999999]">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No partners assigned yet</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
