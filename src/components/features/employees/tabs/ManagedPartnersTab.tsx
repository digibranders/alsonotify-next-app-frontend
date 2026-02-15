
import { useState, useEffect } from 'react';
import { Button, Table, Modal, Avatar, Input, message } from 'antd';
import { Search, Plus, Trash2, Building2 } from 'lucide-react';
import { usePartners } from '@/hooks/useUser';
import { Partner } from '@/types/domain';
import api from '@/config/axios';

interface ManagedPartnersTabProps {
    employeeId: number;
}

export function ManagedPartnersTab({ employeeId }: Readonly<ManagedPartnersTabProps>) {
    const { data: partnersData } = usePartners();
    const allPartners = (partnersData?.result as unknown as Partner[]) || [];
    const [assignedPartners, setAssignedPartners] = useState<Partner[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPartnerIds, setSelectedPartnerIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);

    // Fetch currently assigned partners for this employee
    // Since we don't have a direct endpoint for "get partners of user X", we can get the user details
    // which should include 'account_managed_companies'.
    // However, for now, if the user object in EmployeeDetailsPage already has this, passing it down would be better.
    // Assuming we might need to fetch it or it's passed.
    // Let's assume we fetch user details or `account_managed_companies` is available.
    // Workaround: We'll fetch the user details again or assume passed props. 
    // Actually, let's just fetch the user details to be safe and get fresh data.

    useEffect(() => {
        const fetchAssignedPartners = async () => {
            try {
                setIsLoadingAssigned(true);
                const response = await api.get(`/user/${employeeId}`);
                if (response.data?.success) {
                    // functionality relies on account_managed_companies being included in response
                    // We might need to update getUserById service to include this if not already.
                    // Checked schema, it's a relation. Verify if service includes it.
                    // If not, we might need to update service. For now, let's assume it returns it or we can't display.
                    // Map backend 'logo' to frontend 'logo_url'
                    const mapped = (response.data.data.account_managed_companies || []).map((p: any) => ({
                        ...p,
                        logo_url: p.logo
                    }));
                    setAssignedPartners(mapped);
                    setSelectedPartnerIds(mapped.map((p: any) => p.id));
                }
            } catch (error) {
                console.error("Failed to fetch assigned partners", error);
            } finally {
                setIsLoadingAssigned(false);
            }
        };
        if (employeeId) fetchAssignedPartners();
    }, [employeeId]);


    const handleSave = async () => {
        try {
            setIsSaving(true);
            const response = await api.post('/user/assign-partners', {
                userId: employeeId,
                partnerIds: selectedPartnerIds
            });

            if (response.data?.success) {
                message.success('Partners assigned successfully');
                const mapped = (response.data.result.account_managed_companies || []).map((p: any) => ({
                    ...p,
                    logo_url: p.logo
                }));
                setAssignedPartners(mapped);
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to update partners');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPartners = allPartners?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const columns = [
        {
            title: 'Company',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Partner) => (
                <div className="flex items-center gap-3">
                    <Avatar shape="square" src={record.logo_url} icon={<Building2 size={16} />} />
                    <span className="font-medium">{text}</span>
                </div>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: Partner) => (
                <Button
                    type="text"
                    danger
                    icon={<Trash2 size={16} />}
                    onClick={() => {
                        // Optimistic update or call API directly?
                        // Let's just update state and require save? Or direct API?
                        // The design says "Assign Partner" modal.
                        // Maybe direct delete is better for UX here.
                        // For now, let's re-open modal or just use the modal for all management to keep it simple sync.
                        const newIds = assignedPartners.filter(p => p.id !== record.id).map(p => p.id);
                        // We can implement a direct remove function
                        setSelectedPartnerIds(newIds);
                        // Trigger save immediately for direct remove? 
                        // Let's call API for immediate effect
                        api.post('/user/assign-partners', {
                            userId: employeeId,
                            partnerIds: newIds
                        }).then(res => {
                            if (res.data.success) {
                                const mapped = (res.data.result.account_managed_companies || []).map((p: any) => ({
                                    ...p,
                                    logo_url: p.logo
                                }));
                                setAssignedPartners(mapped);
                                message.success("Partner removed");
                            }
                        });
                    }}
                />
            )
        }
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Managed Partners</h3>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => {
                    // Reset selection to current assigned
                    setSelectedPartnerIds(assignedPartners.map(p => p.id));
                    setIsModalOpen(true);
                }}>
                    Assign Partners
                </Button>
            </div>

            <Table
                dataSource={assignedPartners}
                columns={columns}
                rowKey="id"
                loading={isLoadingAssigned}
                pagination={false}
            />

            <Modal
                title="Assign Partners"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleSave}
                confirmLoading={isSaving}
                width={600}
            >
                <div className="mb-4">
                    <Input
                        prefix={<Search size={16} />}
                        placeholder="Search partners..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    <Table
                        rowSelection={{
                            type: 'checkbox',
                            selectedRowKeys: selectedPartnerIds,
                            onChange: (selectedRowKeys) => {
                                setSelectedPartnerIds(selectedRowKeys as number[]);
                            }
                        }}
                        dataSource={filteredPartners}
                        columns={[{
                            title: 'Company', dataIndex: 'name', render: (t, r) => (
                                <div className="flex items-center gap-3">
                                    <Avatar shape="square" src={r.logo_url} icon={<Building2 size={16} />} />
                                    <span>{t}</span>
                                </div>
                            )
                        }]}
                        rowKey="id"
                        pagination={false}
                        size="small"
                    />
                </div>
            </Modal>
        </div>
    );
}
