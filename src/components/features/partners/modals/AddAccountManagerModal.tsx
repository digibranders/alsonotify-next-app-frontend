'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Checkbox, App, Empty } from 'antd';
import { Search } from 'lucide-react';
import { useEmployees } from '@/hooks/useUser';
import { Employee } from '@/types/domain';
import { addAccountManager } from '@/services/user';

interface AddAccountManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddAccountManagerModal({
    isOpen,
    onClose,
    onSuccess
}: AddAccountManagerModalProps) {
    const { message } = App.useApp();
    const { data: employeesData, isLoading } = useEmployees();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSelectedEmployeeIds([]);
        }
    }, [isOpen]);

    const employees = employeesData?.result || [];

    // Filter out employees who are already account managers
    // TODO: This should filter based on actual account manager data
    const availableEmployees = employees.filter((emp: Employee) => {
        const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const toggleEmployee = (employeeId: number) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleSave = async () => {
        if (selectedEmployeeIds.length === 0) {
            message.warning('Please select at least one employee');
            return;
        }

        try {
            setSaving(true);
            // Add each selected employee as an account manager
            const promises = selectedEmployeeIds.map(employeeId =>
                addAccountManager(employeeId)
            );
            await Promise.all(promises);
            message.success(`Successfully added ${selectedEmployeeIds.length} account manager${selectedEmployeeIds.length > 1 ? 's' : ''}`);
            onSuccess();
        } catch (error) {
            message.error('Failed to add account managers');
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            title="Add Account Manager"
            width="min(600px, 95vw)"
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
                    disabled={selectedEmployeeIds.length === 0 || saving}
                    className="px-6 py-2 bg-[#ff3b3b] hover:bg-[#ff2b2b] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'Adding...' : `Add Selected (${selectedEmployeeIds.length})`}
                </button>
            ]}
        >
            <div className="space-y-4">
                {/* Search */}
                <Input
                    prefix={<Search className="w-4 h-4 text-[#999999]" />}
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 rounded-xl"
                />

                {/* Employee List */}
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : availableEmployees.length === 0 ? (
                        <Empty description="No employees found" />
                    ) : (
                        availableEmployees.map((employee: Employee) => {
                            const employeeId = employee.user_id || employee.id || 0;
                            const isSelected = selectedEmployeeIds.includes(employeeId);

                            return (
                                <div
                                    key={employeeId}
                                    onClick={() => toggleEmployee(employeeId)}
                                    className={`
                    flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${isSelected
                                            ? 'border-[#ff3b3b] bg-[#FFF5F5]'
                                            : 'border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-md'
                                        }
                  `}
                                >
                                    <Checkbox checked={isSelected} />

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {employee.user_profile?.profile_pic ? (
                                            <img
                                                src={employee.user_profile?.profile_pic}
                                                alt={employee.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs font-bold text-[#999999]">
                                                {getInitials(employee.name || '')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-xs font-semibold text-[#111111] truncate">
                                                {employee.name}
                                            </h4>
                                            {employee.roleName && (
                                                <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-[#F5F5F5] text-[#666666]">
                                                    {employee.roleName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs-tight text-[#666666]">
                                            {employee.designation && (
                                                <span className="truncate">{employee.designation}</span>
                                            )}
                                            {employee.department && typeof employee.department === 'object' && 'name' in employee.department && (
                                                <>
                                                    <span className="text-[#CCCCCC]">•</span>
                                                    <span className="truncate">{(employee.department as { name: string }).name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {selectedEmployeeIds.length > 0 && (
                    <div className="pt-3 border-t border-[#EEEEEE]">
                        <p className="text-xs text-[#666666]">
                            {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
