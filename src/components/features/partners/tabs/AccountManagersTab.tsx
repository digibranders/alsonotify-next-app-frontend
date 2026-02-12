'use client';

import { useState, useEffect } from 'react';
import { Input, Dropdown, MenuProps, App } from 'antd';
import { Search, Plus, MoreVertical, Users, Trash2 } from 'lucide-react';
import { AddAccountManagerModal } from '../modals/AddAccountManagerModal';
import { EditManagerPartnersModal } from '../modals/EditManagerPartnersModal';
import { getAccountManagers, removeAccountManager, AccountManager as AccountManagerType } from '@/services/user';


export function AccountManagersTab() {
    const { message, modal } = App.useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [accountManagers, setAccountManagers] = useState<AccountManagerType[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingManager, setEditingManager] = useState<AccountManagerType | null>(null);

    // Fetch account managers
    const fetchAccountManagers = async () => {
        try {
            setLoading(true);
            const response = await getAccountManagers();
            setAccountManagers(response.result || []);
        } catch (error) {
            message.error('Failed to fetch account managers');
        } finally {
            setLoading(false);
        }
    };

    // Load account managers on mount
    useEffect(() => {
        fetchAccountManagers();
    }, []);

    const filteredManagers = accountManagers.filter(manager =>
        manager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        manager.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRemoveManager = async (manager: AccountManagerType) => {
        modal.confirm({
            title: 'Remove Account Manager',
            content: `Are you sure you want to remove ${manager.name} as an account manager? This will unassign all their partners.`,
            okText: 'Remove',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await removeAccountManager(manager.id);
                    message.success(`${manager.name} removed as account manager`);
                    fetchAccountManagers();
                } catch (error) {
                    message.error('Failed to remove account manager');
                }
            }
        });
    };

    const getMenuItems = (manager: AccountManagerType): MenuProps['items'] => [
        {
            key: 'edit',
            label: 'Edit Partners',
            icon: <Users className="w-4 h-4" />,
            onClick: () => setEditingManager(manager)
        },
        {
            type: 'divider'
        },
        {
            key: 'remove',
            label: 'Remove',
            icon: <Trash2 className="w-4 h-4" />,
            danger: true,
            onClick: () => handleRemoveManager(manager)
        }
    ];

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
                        Account Managers
                    </h2>
                    <p className="text-[13px] text-[#666666] mt-1">
                        Manage employees who handle partner relationships
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#000000] text-white rounded-full transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Account Manager
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <Input
                    prefix={<Search className="w-4 h-4 text-[#999999]" />}
                    placeholder="Search account managers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 rounded-xl"
                />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredManagers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-[#CCCCCC]" />
                        </div>
                        <h3 className="text-[15px] font-['Manrope:SemiBold',sans-serif] text-[#111111] mb-2">
                            No account managers yet
                        </h3>
                        <p className="text-[13px] text-[#666666] mb-4">
                            Click "Add Account Manager" to get started
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredManagers.map(manager => (
                            <div
                                key={manager.id}
                                className="bg-white border border-[#EEEEEE] rounded-xl p-4 hover:border-[#ff3b3b]/20 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {manager.profilePic ? (
                                            <img src={manager.profilePic} alt={manager.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[14px] font-bold text-[#999999]">
                                                {getInitials(manager.name)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#111111] truncate">
                                                {manager.name}
                                            </h3>
                                            {manager.role && (
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                                    style={{
                                                        backgroundColor: manager.roleColor ? `${manager.roleColor}20` : '#F5F5F5',
                                                        color: manager.roleColor || '#666666'
                                                    }}
                                                >
                                                    {manager.role}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[12px] text-[#666666]">
                                            {manager.designation && (
                                                <span className="truncate">{manager.designation}</span>
                                            )}
                                            {manager.department && (
                                                <>
                                                    <span className="text-[#CCCCCC]">•</span>
                                                    <span className="truncate">{manager.department}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Partner Count */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F5] rounded-lg">
                                        <Users className="w-4 h-4 text-[#666666]" />
                                        <span className="text-[13px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
                                            {manager.partnerCount} {manager.partnerCount === 1 ? 'partner' : 'partners'}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <Dropdown menu={{ items: getMenuItems(manager) }} trigger={['click']} placement="bottomRight">
                                        <button className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors">
                                            <MoreVertical className="w-4 h-4 text-[#666666]" />
                                        </button>
                                    </Dropdown>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddAccountManagerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    setIsAddModalOpen(false);
                    fetchAccountManagers();
                    message.success('Account manager added successfully');
                }}
            />

            {editingManager && (
                <EditManagerPartnersModal
                    isOpen={!!editingManager}
                    onClose={() => setEditingManager(null)}
                    manager={editingManager}
                    onSuccess={() => {
                        setEditingManager(null);
                        fetchAccountManagers();
                        message.success('Partner assignments updated successfully');
                    }}
                />
            )}
        </div>
    );
}
