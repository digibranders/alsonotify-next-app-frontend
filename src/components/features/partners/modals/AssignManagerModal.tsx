import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Checkbox, Avatar, Button, message, Spin, Empty } from 'antd';
import { Search } from 'lucide-react';
import { searchEmployees } from '@/services/user';
import api from '@/config/axios';

interface AssignManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    partnerName: string;
    companyId: number;
    initialManagerIds: number[];
}

export const AssignManagerModal: React.FC<AssignManagerModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    partnerName,
    companyId,
    initialManagerIds
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [employees, setEmployees] = useState<{ value: number; label: string; avatar?: string }[]>([]);
    const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>(initialManagerIds);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedManagerIds(initialManagerIds);
            fetchEmployees();
        }
    }, [isOpen, initialManagerIds]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            // Using searchEmployees or similar. 
            // We need a way to get all employees to list them.
            // Using existing endpoint /user/user-dropdown or /user (getEmployees)
            // Let's use api.get('/user/user-dropdown')
            const response = await api.get('/user/user-dropdown');
            if (response.data?.success) {
                // The dropdown endpoint returns { label, value }. 
                // We might want avatars. user-dropdown might not have them.
                // For better UX, maybe use getEmployees list if it's not too heavy.
                // Or just use names for now.
                setEmployees(response.data.result);
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await api.post('/user/assign-managers', {
                partnerId: companyId,
                managerIds: selectedManagerIds
            });

            if (response.data?.success) {
                message.success('Account managers assigned successfully');
                onSuccess();
                onClose();
            } else {
                message.error(response.data?.message || 'Failed to assign managers');
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to assign managers');
        } finally {
            setSaving(false);
        }
    };

    const toggleManager = (id: number) => {
        setSelectedManagerIds(prev =>
            prev.includes(id)
                ? prev.filter(mId => mId !== id)
                : [...prev, id]
        );
    };

    const filteredEmployees = employees.filter(emp =>
        emp.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal
            title={`Assign Managers to ${partnerName}`}
            open={isOpen}
            onCancel={onClose}
            onOk={handleSave}
            confirmLoading={saving}
            width={500}
            className="rounded-[16px] overflow-hidden"
            okText="Save Assignments"
        >
            <div className="mb-4 mt-4">
                <Input
                    prefix={<Search size={16} className="text-gray-400" />}
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-10 rounded-lg"
                />
            </div>

            <div className="max-h-[400px] overflow-y-auto border border-gray-100 rounded-lg bg-gray-50/50 p-2">
                {loading ? (
                    <div className="flex justify-center p-8"><Spin /></div>
                ) : filteredEmployees.length > 0 ? (
                    <List
                        dataSource={filteredEmployees}
                        renderItem={item => {
                            const isSelected = selectedManagerIds.includes(item.value);
                            return (
                                <List.Item
                                    className={`
                                        cursor-pointer hover:bg-white transition-colors rounded-md px-3 py-2 border-b-0 mb-1
                                        ${isSelected ? 'bg-white shadow-sm border border-blue-100' : ''}
                                    `}
                                    onClick={() => toggleManager(item.value)}
                                >
                                    <div className="flex items-center w-full gap-3">
                                        <Checkbox checked={isSelected} className="pointer-events-none" />
                                        <div className="flex-1 font-medium text-gray-700">
                                            {item.label}
                                        </div>
                                    </div>
                                </List.Item>
                            );
                        }}
                    />
                ) : (
                    <Empty description="No employees found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
            </div>
        </Modal>
    );
};
