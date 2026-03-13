'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input, App, Button, Select, Spin } from 'antd';
import { Search, Plus, Trash2, X, Building2, User } from 'lucide-react';
import { AddAccountManagerModal } from '../modals/AddAccountManagerModal';
import { 
    getAccountManagers, 
    removeAccountManager, 
    updateManagerPartners, 
    searchPartners,
    AccountManager as AccountManagerType 
} from '@/services/user';

import { debounce } from '@/lib/utils';

export function AccountManagersTab() {
    const { message, modal } = App.useApp();
    
    // UI State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Data State
    const [accountManagers, setAccountManagers] = useState<AccountManagerType[]>([]);
    
    // Selection State
    const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Right Panel State
    const [assignedPartners, setAssignedPartners] = useState<{ label: string; value: number }[]>([]);
    const [originalPartners, setOriginalPartners] = useState<{ label: string; value: number }[]>([]);
    const [partnerSearchOptions, setPartnerSearchOptions] = useState<{ label: string; value: number }[]>([]);
    const [searchingPartners, setSearchingPartners] = useState(false);

    // Fetch account managers
    const fetchAccountManagers = useCallback(async (keepSelection = false) => {
        try {
            setLoading(true);
            const response = await getAccountManagers();
            const managers = response.result || [];
            setAccountManagers(managers);
            
            // If we need to keep selection (e.g. after save), update the selected manager's data
            if (keepSelection && selectedManagerId) {
                const updatedManager = managers.find(m => m.id === selectedManagerId);
                // We need to handle handleManagerSelect but it's defined below. 
                // To avoid circular dependency, we just update local state if manager exists.
                if (updatedManager) {
                     // Update selected manager's partners in right panel
                    const formattedPartners = updatedManager.assignedPartners.map(p => ({
                        label: p.name,
                        value: p.id
                    }));
                    setAssignedPartners(formattedPartners);
                    setOriginalPartners(formattedPartners);
                } else {
                    setSelectedManagerId(null);
                }
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to fetch account managers');
        } finally {
            setLoading(false);
        }
    }, [message, selectedManagerId]);

    // Initial load
    useEffect(() => {
        fetchAccountManagers();
    }, [fetchAccountManagers]);

    const filteredManagers = useMemo(() => {
        return accountManagers.filter(manager =>
            manager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            manager.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [accountManagers, searchQuery]);

    const handleManagerSelect = (manager: AccountManagerType) => {
        setSelectedManagerId(manager.id);
        const formattedPartners = manager.assignedPartners.map(p => ({
            label: p.name,
            value: p.id
        }));
        setAssignedPartners(formattedPartners);
        setOriginalPartners(formattedPartners);
    };

    const handlePartnerSearch = useCallback(async (value: string) => {
        // Allow empty search to show default list
        setSearchingPartners(true);
        try {
            const response = await searchPartners(value);
            // Filter out already assigned partners
            const headerOptions = response.result?.filter(
                opt => !assignedPartners.some(ap => ap.value === opt.value)
            ) || [];
            setPartnerSearchOptions(headerOptions);
        } catch (error) {
           console.error('Failed to search partners', error);
        } finally {
            setSearchingPartners(false);
        }
    }, [assignedPartners]);

    const debouncedPartnerSearch = useMemo(
        () => debounce(handlePartnerSearch, 500),
        [handlePartnerSearch]
    );

    const handleAddPartner = (value: number, option: { label: string } | { label: string }[] | undefined) => {
        if (!option) return;
        const label = Array.isArray(option) ? option[0].label : option.label;
        setAssignedPartners(prev => [...prev, { label, value }]);
        setPartnerSearchOptions([]); // Clear search options
        message.success('Partner added to list. Click Save Changes to confirm.');
    };

    const handleRemovePartner = (partnerId: number) => {
        setAssignedPartners(prev => prev.filter(p => p.value !== partnerId));
    };

    const hasChanges = useMemo(() => {
        if (assignedPartners.length !== originalPartners.length) return true;
        const currentIds = new Set(assignedPartners.map(p => p.value));
        return !originalPartners.every(p => currentIds.has(p.value));
    }, [assignedPartners, originalPartners]);

    const handleSaveChanges = async () => {
        if (!selectedManagerId) return;
        
        try {
            setSaving(true);
            await updateManagerPartners(
                selectedManagerId, 
                assignedPartners.map(p => p.value)
            );
            message.success('Partner assignments updated successfully');
            await fetchAccountManagers(true);
        } catch (error) {
            console.error(error);
            message.error('Failed to update assignments');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveManager = async (e: React.MouseEvent, manager: AccountManagerType) => {
        e.stopPropagation();
        modal.confirm({
            title: 'Remove Account Manager',
            content: `Are you sure you want to remove ${manager.name}? This will unassign all their partners.`,
            okText: 'Remove',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await removeAccountManager(manager.id);
                    message.success('Account manager removed');
                    if (selectedManagerId === manager.id) {
                        setSelectedManagerId(null);
                    }
                    fetchAccountManagers();
                } catch (error) {
                    console.error(error);
                    message.error('Failed to remove account manager');
                }
            }
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const selectedManager = accountManagers.find(m => m.id === selectedManagerId);

    const renderManagersList = () => {
        if (loading && accountManagers.length === 0) {
            return (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                    ))}
                </div>
            );
        }

        if (filteredManagers.length === 0) {
            return (
                <div className="text-center py-10 text-[#999999] text-xs">
                    No account managers found
                </div>
            );
        }

        return filteredManagers.map(manager => (
            <div
                key={manager.id}
                onClick={() => handleManagerSelect(manager)}
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedManagerId === manager.id
                        ? 'bg-[#F5F5F5] border-[#111111]'
                        : 'border-transparent hover:bg-[#F9FAFB] hover:border-[#EEEEEE]'
                }`}
            >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-white border border-[#EEEEEE] flex items-center justify-center flex-shrink-0 overflow-hidden text-xs font-bold text-[#666666]">
                    {manager.profilePic ? (
                        <img src={manager.profilePic} alt={manager.name} className="w-full h-full object-cover" />
                    ) : getInitials(manager.name)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm font-semibold truncate ${
                            selectedManagerId === manager.id ? 'text-[#111111]' : 'text-[#444444]'
                        }`}>
                            {manager.name}
                        </h3>
                        {manager.role && (
                            <span
                                className="text-xs font-semibold px-1.5 py-0.5 rounded-md uppercase shrink-0 ml-2"
                                style={{
                                    backgroundColor: manager.roleColor ? `${manager.roleColor}15` : '#EEEEEE',
                                    color: manager.roleColor || '#666666'
                                }}
                            >
                                {manager.role}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        {manager.designation && (
                            <p className="text-xs text-[#666666] truncate font-medium">
                                {manager.designation}
                            </p>
                        )}
                        <p className="text-xs text-[#999999] truncate flex items-center gap-1">
                            {manager.partnerCount} partners
                        </p>
                    </div>
                </div>
                
                    <button
                    onClick={(e) => handleRemoveManager(e, manager)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white text-[#FF3B3B] transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        ));
    };

    return (
        <div className="bg-white rounded-[24px] p-8 border border-[#EEEEEE] mb-6 h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-[#111111]">
                        Account Managers
                    </h2>
                    <p className="text-xs text-[#666666] mt-1 font-medium">
                        Manage account managers and their partner assignments
                    </p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-[#111111] hover:bg-[#000000]/90 text-white font-semibold px-6 h-11 rounded-full text-xs flex items-center gap-2 border-none transition-all shadow-md active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Add Manager
                </Button>
            </div>

            <div className="flex gap-8 flex-1 min-h-0">
                {/* Left Panel: Managers List */}
                <div className="w-1/3 flex flex-col border-r border-[#EEEEEE] pr-6">
                     <div className="mb-4">
                        <Input
                            prefix={<Search className="w-4 h-4 text-[#999999]" />}
                            placeholder="Search managers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 rounded-xl"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {renderManagersList()}
                    </div>
                </div>

                {/* Right Panel: Partner Assignments */}
                <div className="w-2/3 flex flex-col pl-2">
                    {selectedManager ? (
                        <>
                            <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#EEEEEE]">
                                <div className="flex items-center gap-4">
                                     <div className="w-14 h-14 rounded-full bg-[#F5F5F5] flex items-center justify-center flex-shrink-0 overflow-hidden text-lg font-bold text-[#666666]">
                                        {selectedManager.profilePic ? (
                                            <img src={selectedManager.profilePic} alt={selectedManager.name} className="w-full h-full object-cover" />
                                        ) : getInitials(selectedManager.name)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#111111]">
                                            {selectedManager.name}
                                        </h3>
                                    </div>
                                </div>

                                <Button
                                    type="primary"
                                    disabled={!hasChanges}
                                    loading={saving}
                                    onClick={handleSaveChanges}
                                    className={`h-10 px-6 rounded-full font-semibold border-none shadow-none ${
                                        hasChanges 
                                            ? 'bg-[#111111] hover:bg-[#000000]' 
                                            : 'bg-[#F5F5F5] text-[#999999] hover:bg-[#F5F5F5]'
                                    }`}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>

                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-[#111111] uppercase tracking-wide mb-2 block">
                                        Assign Partners
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder="Search and add partners..."
                                        defaultActiveFirstOption={false}
                                        filterOption={false}
                                        onSearch={debouncedPartnerSearch}
                                        onFocus={() => handlePartnerSearch('')}
                                        onChange={handleAddPartner}
                                        notFoundContent={searchingPartners ? <Spin size="small" /> : null}
                                        options={partnerSearchOptions}
                                        className="w-full h-11"
                                        suffixIcon={<Search className="w-4 h-4 text-[#999999]" />}
                                        value={null} // Always clear after selection
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <label className="text-xs font-bold text-[#999999] uppercase tracking-wide mb-3 block">
                                        Assigned Partners ({assignedPartners.length})
                                    </label>
                                    
                                    {assignedPartners.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 bg-[#F9FAFB] rounded-xl border border-dashed border-[#EEEEEE]">
                                            <Building2 className="w-8 h-8 text-[#DDDDDD] mb-3" />
                                            <p className="text-xs text-[#999999]">No partners assigned yet</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2">
                                            {assignedPartners.map(partner => (
                                                <div 
                                                    key={partner.value}
                                                    className="flex items-center justify-between p-3 bg-white border border-[#EEEEEE] rounded-xl group hover:border-[#111111] transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#666666]">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm font-medium text-[#111111]">
                                                            {partner.label}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemovePartner(partner.value)}
                                                        className="p-1.5 rounded-lg text-[#999999] hover:bg-[#FFF5F5] hover:text-[#FF3B3B] transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#F9FAFB] rounded-2xl border border-dashed border-[#EEEEEE]">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <User className="w-8 h-8 text-[#DDDDDD]" />
                            </div>
                            <h3 className="text-base font-semibold text-[#111111]">
                                Select an Account Manager
                            </h3>
                            <p className="text-xs text-[#666666] mt-2 max-w-[280px]">
                                Select a manager from the list to view and manage their partner assignments.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddAccountManagerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    setIsAddModalOpen(false);
                    fetchAccountManagers();
                    message.success('Account manager added');
                }}
            />
        </div>
    );
}
