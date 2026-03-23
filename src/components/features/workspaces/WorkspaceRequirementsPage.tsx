'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Breadcrumb, Select, App } from 'antd';
import { TabBar } from '../../layout/TabBar';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { PaginationBar } from '../../ui/PaginationBar';
import {
    useWorkspace,
    useRequirements,
    useWorkspaces,
    useCreateRequirement,
    useUpdateRequirement,
    useDeleteRequirement,
} from '@/hooks/useWorkspace';
import { useUserDetails, usePartners, useCompanyDepartments } from '@/hooks/useUser';
import { fileService } from '@/services/file.service';
import { format } from 'date-fns';
import { useAutoDelayOverdue } from '@/hooks/useAutoDelayOverdue';
import { RequirementsList } from '../requirements/components/RequirementsList';
import { RequirementsForm } from '../../modals/RequirementsForm';
import { QuotationDialog, RejectDialog, InternalMappingModal } from '../requirements/components/dialogs';
import { Requirement, Workspace, RequirementType } from '@/types/domain';
import { RequirementDto, CreateRequirementRequestDto, UpdateRequirementRequestDto } from '@/types/dto/requirement.dto';
import { getErrorMessage } from '@/types/api-utils';
import { getRequirementTab, type TabContext } from '@/lib/workflow';
import {
    mapRequirementToStatus,
    mapRequirementToRole,
    mapRequirementToContext,
    mapRequirementToType,
} from '../requirements/utils/requirementState.utils';
import { getRoleFromUser } from '@/utils/roleUtils';
import { getPartnerCompanyId, getPartnerName, isValidPartner } from '@/utils/partnerUtils';

const { Option } = Select;

type RequirementTab = 'active' | 'pending' | 'draft' | 'delayed' | 'completed' | 'archived';

const TAB_STATUS_SETS: Record<string, string[]> = {
    active: ['Assigned', 'In_Progress', 'Review', 'Revision', 'Delayed', 'On_Hold'],
    pending: ['Waiting', 'Submitted', 'Rejected', 'rejected'],
    draft: ['Draft'],
    delayed: ['Delayed', 'On_Hold'],
    completed: ['Completed'],
};

export function WorkspaceRequirementsPage() {
    const params = useParams();
    const workspaceId = Number(params.workspaceId);
    const router = useRouter();

    const { message: messageApi, modal: modalApi } = App.useApp();
    const messageRef = useRef(messageApi);
    const modalRef = useRef(modalApi);
    useEffect(() => {
        messageRef.current = messageApi;
        modalRef.current = modalApi;
    }, [messageApi, modalApi]);

    const { data: workspaceData, isLoading: isLoadingWorkspace } = useWorkspace(workspaceId);
    const { data: requirementsData, isLoading: isLoadingRequirements } = useRequirements(workspaceId);
    const { data: userData } = useUserDetails();
    const { data: workspacesData, isLoading: _isLoadingWorkspaces } = useWorkspaces('limit=100');
    const { data: partnersData } = usePartners();
    const { data: departmentsData } = useCompanyDepartments();


    const currentUser = userData?.result;
    const userRole = getRoleFromUser(currentUser);

    const createRequirementMutation = useCreateRequirement();
    const updateRequirementMutation = useUpdateRequirement();
    const { mutate: deleteRequirement } = useDeleteRequirement();

    const [activeTab, setActiveTab] = useState<RequirementTab>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({
        type: 'All',
        billing: 'All',
        department_id: 'All',
        priority: 'All',
        partner: 'All',
    });
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingReq, setEditingReq] = useState<Requirement | undefined>(undefined);
    const [isQuotationOpen, setIsQuotationOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isMappingOpen, setIsMappingOpen] = useState(false);
    const [pendingReqId, setPendingReqId] = useState<number | null>(null);

    const workspace = useMemo(() => {
        if (!workspaceData?.result) return null;
        return {
            id: workspaceData.result.id,
            name: workspaceData.result.name || '',
        };
    }, [workspaceData]);

    const workspaceMap = useMemo(() => {
        const map = new Map<number, Workspace>();
        workspacesData?.result?.workspaces?.forEach((w) => {
            map.set(w.id, w);
        });
        return map;
    }, [workspacesData]);

    const stripHtmlTags = useMemo(() => {
        if (typeof document === 'undefined') return (html: string) => html.replace(/<[^>]*>/g, '').trim();
        return (html: string): string => {
            if (!html) return '';
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            return (doc.body.textContent || '').trim();
        };
    }, []);

    const mapRequirementStatus = (status: string): 'in-progress' | 'completed' | 'delayed' | 'draft' => {
        switch (status) {
            case 'Completed': return 'completed';
            case 'On_Hold':
            case 'Delayed': return 'delayed';
            case 'Draft':
            case 'draft': return 'draft';
            case 'Assigned':
            case 'In_Progress':
            case 'Waiting':
            case 'Review':
            case 'Submitted':
            case 'Revision':
            case 'rejected':
                return 'in-progress';
            default: return 'in-progress';
        }
    };

    const allRawRequirements = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (requirementsData?.result || []) as any[];
    }, [requirementsData]);

    const requirements = useMemo(() => {
        return allRawRequirements.map((req: RequirementDto) => {
            const myCompanyId = currentUser?.company_id ? Number(currentUser.company_id) : null;
            const reqReceiverCompanyId = req.receiver_company_id ? Number(req.receiver_company_id) : null;
            const reqSenderCompanyId = req.sender_company_id ? Number(req.sender_company_id) : null;
            const isReceiver = myCompanyId !== null && reqReceiverCompanyId === myCompanyId;
            const isSender = myCompanyId !== null && reqSenderCompanyId === myCompanyId;

            const effectiveWorkspaceId = (isReceiver && req.receiver_workspace_id)
                ? req.receiver_workspace_id
                : req.workspace_id;

            const wsData = workspaceMap.get(effectiveWorkspaceId || 0);

            const mockInvoiceStatus = req.invoice_id
                ? (req.invoice?.status === 'paid' ? 'paid' : req.invoice?.status ? req.invoice.status : undefined)
                : undefined;

            const contactPersonName = req.contact_person?.name || null;
            const mockContactPerson = req.type === 'outsourced' && !contactPersonName
                ? 'External Vendor'
                : contactPersonName;

            const mockPricingModel = req.pricing_model || (req.hourly_rate ? 'hourly' : 'project');

            const mockRejectionReason = req.status?.toLowerCase().includes('rejected') && !req.rejection_reason
                ? 'Requirement was rejected during review process'
                : req.rejection_reason;

            const clientName = wsData?.client?.name || wsData?.client_company_name || null;
            const companyName = wsData?.company_name || 'Internal';

            let headerContact: string | undefined;
            let headerCompany: string | undefined;

            if (req.type === 'outsourced') {
                if (isSender) {
                    const contactName = req.contact_person?.name;
                    const creatorName =
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (typeof req.created_user === 'object' ? (req.created_user as any)?.name : undefined) ||
                        req.created_user_data?.name;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const receiverCompanyName = (req as any).receiver_company?.name;
                    const isContactExternal = !!contactName && !!creatorName && contactName !== creatorName;
                    if (isContactExternal) {
                        headerContact = contactName;
                        headerCompany = receiverCompanyName || 'Partner';
                    } else {
                        headerContact = receiverCompanyName || 'Partner';
                        headerCompany = undefined;
                    }
                } else if (isReceiver) {
                    headerContact =
                        req.created_user_data?.name ||
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (typeof req.created_user === 'object' ? (req.created_user as any)?.name : undefined) ||
                        req.contact_person?.name ||
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (req as any).sender_company?.name ||
                        'Sender';
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    headerCompany = (req as any).sender_company?.name;
                    if (headerContact === headerCompany) headerCompany = undefined;
                }
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (isReceiver && (req as any).sender_company) {
                    headerContact =
                        req.created_user_data?.name ||
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (typeof req.created_user === 'object' ? (req.created_user as any)?.name : undefined) ||
                        req.contact_person?.name ||
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (req as any).sender_company?.name ||
                        'Sender';
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    headerCompany = (req as any).sender_company?.name;
                } else {
                    headerContact =
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (typeof req.contact_person === 'object' ? (req.contact_person as any)?.name : req.contact_person) ||
                        'Unknown';
                    headerCompany = wsData?.client_company_name || wsData?.company_name || undefined;
                }
                if (headerContact && headerCompany && headerContact === headerCompany) {
                    headerCompany = undefined;
                }
            }

            const mappedReq: Requirement = {
                id: req.id,
                title: req.name || 'Untitled Requirement',
                name: req.name || 'Untitled Requirement',
                description: stripHtmlTags(req.description || 'No description provided'),
                company: req.type === 'outsourced' ? (headerCompany || companyName) : companyName,
                client: clientName || 'N/A',
                assignedTo: req.manager_user ? [req.manager_user.name || ''] : req.leader_user ? [req.leader_user.name || ''] : [],
                dueDate: req.end_date ? format(new Date(req.end_date), 'dd-MMM-yyyy') : 'TBD',
                startDate: req.start_date ? format(new Date(req.start_date), 'dd-MMM-yyyy') : undefined,
                end_date: req.end_date || undefined,
                start_date: req.start_date || undefined,
                createdDate: req.start_date ? format(new Date(req.start_date), 'dd-MMM-yyyy') : 'TBD',
                is_high_priority: req.is_high_priority ?? false,
                type: (req.type || 'inhouse') as RequirementType,
                status: mapRequirementStatus(req.status || 'Assigned'),
                category: 'General',
                progress: req.progress || 0,
                tasksCompleted: req.completed_tasks || req.tasks_completed || 0,
                tasksTotal: req.total_tasks || req.total_task || 0,
                workspace_id: effectiveWorkspaceId || workspaceId,
                workspace: wsData?.name || workspace?.name || 'Unknown Workspace',
                approvalStatus: (req.approved_by ? 'approved' :
                    (req.status === 'Waiting' || req.status === 'Review' ||
                        req.status?.toLowerCase() === 'rejected' ||
                        req.status?.toLowerCase().includes('pending')) ? 'pending' :
                        undefined
                ) as 'pending' | 'approved' | 'rejected' | undefined,
                invoice_status: mockInvoiceStatus as 'draft' | 'pending_approval' | 'sent' | 'overdue' | 'partial' | 'paid' | 'void' | undefined,
                estimated_cost: req.estimated_cost || (req.budget || undefined),
                budget: req.budget || undefined,
                quoted_price: req.quoted_price || undefined,
                currency: (req.currency && req.currency.trim() !== '') ? req.currency : 'USD',
                hourly_rate: req.hourly_rate || undefined,
                estimated_hours: req.estimated_hours || undefined,
                pricing_model: mockPricingModel as 'hourly' | 'project' | undefined,
                departments: req.department_id ? [String(req.department_id)] : [],
                contact_person: mockContactPerson || undefined,
                contact_person_id: req.contact_person_id,
                rejection_reason: mockRejectionReason,
                headerContact,
                headerCompany,
                isReceiver,
                isSender,
                rawStatus: req.status,
                sender_company_id: req.sender_company_id,
                receiver_company_id: req.receiver_company_id,
                receiver_workspace_id: req.receiver_workspace_id,
                receiver_project_id: req.receiver_workspace_id,
                negotiation_reason: req.negotiation_reason,
                is_archived: req.is_archived,
                requires_advance_payment: req.requires_advance_payment ?? false,
                advance_amount: req.advance_amount ?? null,
                advance_payment_due_date: req.advance_payment_due_date ?? null,
                advance_invoice_id: req.advance_invoice_id ?? null,
                advance_invoice: req.advance_invoice ?? null,
                completed_at: req.completed_at,
            };

            return mappedReq;
        });
    }, [allRawRequirements, workspaceMap, currentUser, stripHtmlTags, workspace, workspaceId]);

    const requirementsRef = useRef(requirements);
    useEffect(() => {
        requirementsRef.current = requirements;
    }, [requirements]);

    // Auto-delay overdue requirements (active status + past due date → Delayed)
    const overdueCheckData = useMemo(
        () => requirements.map((r) => ({ id: r.id, status: r.rawStatus || '', end_date: r.end_date })),
        [requirements]
    );
    useAutoDelayOverdue(overdueCheckData);

    // Filter options
    const allPartners = useMemo(() => {
        const partners = partnersData?.result || [];
        const options = partners
            .filter(isValidPartner)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((p: any) => ({
                label: getPartnerName(p),
                value: String(getPartnerCompanyId(p)),
            }));
        return [{ label: 'All', value: 'All' }, ...options];
    }, [partnersData]);

    const allCategories = useMemo(() => {
        const depts = departmentsData?.result || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options = depts.map((d: any) => ({ label: d.name, value: String(d.id) }));
        return [{ label: 'All', value: 'All' }, ...options];
    }, [departmentsData]);

    const filterOptions: FilterOption[] = [
        {
            id: 'type',
            label: 'Type',
            options: [
                { label: 'All', value: 'All' },
                { label: 'In-house', value: 'In-house' },
                { label: 'Outsourced', value: 'Outsourced' },
                { label: 'Client Work', value: 'Client Work' },
            ],
            placeholder: 'Type',
            multiSelect: true,
        },
        {
            id: 'priority',
            label: 'Priority',
            options: [
                { label: 'All', value: 'All' },
                { label: 'High', value: 'High' },
                { label: 'Normal', value: 'Normal' },
            ],
            placeholder: 'Priority',
            defaultValue: 'All',
        },
        {
            id: 'partner',
            label: 'Partner',
            options: allPartners,
            placeholder: 'Partner',
            multiSelect: true,
            defaultValue: 'All',
        },
        ...(!['draft', 'pending'].includes(activeTab)
            ? [{
                id: 'department_id',
                label: 'Department',
                options: allCategories,
                placeholder: 'Department',
                multiSelect: true,
            }]
            : []),
        ...(activeTab === 'completed'
            ? [{
                id: 'billing',
                label: 'Billing',
                options: ['All', 'Ready to Bill', 'Invoiced', 'Paid'],
                placeholder: 'Billing Status',
            }]
            : []),
    ];

    const filteredRequirements = useMemo(() => {
        return requirements.filter((req) => {
            // Tab filtering
            if (activeTab === 'archived') {
                if (!req.is_archived) return false;
            } else {
                if (req.is_archived) return false;
                const allowedStatuses = TAB_STATUS_SETS[activeTab] || [];
                if (!allowedStatuses.includes(req.rawStatus || '')) return false;
            }

            // Search
            if (searchQuery && !req.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !(req.description || '').toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // Type filter
            if (filters.type !== 'All') {
                const typeMap: Record<string, string> = {
                    'In-house': 'inhouse',
                    'Outsourced': 'outsourced',
                    'Client Work': 'client',
                };
                const selectedTypes = filters.type.split(',').map(t => t.trim());
                const mappedTypes = selectedTypes.map(t => typeMap[t] || t.toLowerCase());
                if (!mappedTypes.includes(req.type || '')) return false;
            }

            // Priority filter
            if (filters.priority !== 'All') {
                const isHigh = req.is_high_priority;
                if (filters.priority === 'High' && !isHigh) return false;
                if (filters.priority === 'Normal' && isHigh) return false;
            }

            // Partner filter
            if (filters.partner !== 'All') {
                const selectedPartners = filters.partner.split(',').map(p => p.trim());
                const senderCompanyId = String(req.sender_company_id || '');
                const receiverCompanyId = String(req.receiver_company_id || '');
                if (!selectedPartners.some(p => p === senderCompanyId || p === receiverCompanyId)) return false;
            }

            // Department filter
            if (filters.department_id !== 'All' && !['draft', 'pending'].includes(activeTab)) {
                const selectedDepts = filters.department_id.split(',').map(d => d.trim());
                const reqDepts = req.departments || [];
                if (!selectedDepts.some(d => reqDepts.includes(d))) return false;
            }

            // Billing filter (completed tab only)
            if (activeTab === 'completed' && filters.billing !== 'All') {
                const billingMap: Record<string, string[]> = {
                    'Paid': ['paid'],
                    'Invoiced': ['sent', 'partial', 'overdue', 'pending_approval'],
                    'Ready to Bill': [],
                };
                const allowedInvoiceStatuses = billingMap[filters.billing] || [];
                if (filters.billing === 'Ready to Bill') {
                    if (req.invoice_status) return false;
                } else {
                    if (!allowedInvoiceStatuses.includes(req.invoice_status || '')) return false;
                }
            }

            return true;
        });
    }, [requirements, activeTab, searchQuery, filters]);

    const sortedRequirements = useMemo(() => {
        const list = [...filteredRequirements];
        if (sortColumn) {
            list.sort((a, b) => {
                let aVal: string | number;
                let bVal: string | number;
                switch (sortColumn) {
                    case 'title':
                        aVal = (a.title || '').toLowerCase();
                        bVal = (b.title || '').toLowerCase();
                        break;
                    case 'timeline':
                        aVal = a.dueDate && a.dueDate !== 'TBD' ? new Date(a.dueDate).getTime() : 0;
                        bVal = b.dueDate && b.dueDate !== 'TBD' ? new Date(b.dueDate).getTime() : 0;
                        break;
                    case 'budget':
                        aVal = a.quoted_price || a.estimated_cost || a.budget || 0;
                        bVal = b.quoted_price || b.estimated_cost || b.budget || 0;
                        break;
                    case 'progress':
                        aVal = a.progress || 0;
                        bVal = b.progress || 0;
                        break;
                    case 'status':
                        aVal = a.status || '';
                        bVal = b.status || '';
                        break;
                    default:
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        aVal = (a as any)[sortColumn];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        bVal = (b as any)[sortColumn];
                }
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [filteredRequirements, sortColumn, sortDirection]);

    const paginatedRequirements = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedRequirements.slice(start, start + pageSize);
    }, [sortedRequirements, currentPage, pageSize]);

    // Handlers
    const handleOpenCreate = () => {
        setEditingReq(undefined);
        setIsDialogOpen(true);
    };

    const handleEditDraft = (req: Requirement) => {
        setEditingReq(req);
        setIsDialogOpen(true);
    };

    const handleDuplicateRequirement = (req: Requirement) => {
        setEditingReq({
            ...req,
            id: undefined as unknown as number,
            title: `${req.title} (Copy)`,
        });
        setIsDialogOpen(true);
    };

    const handleQuotationConfirm = (data: { cost?: number; rate?: number; hours?: number; currency?: string; requires_advance_payment?: boolean; advance_amount?: number; advance_payment_due_date?: string }) => {
        const amount = data.cost || 0;
        const hours = data.hours || 0;
        const currency = data.currency || 'USD';
        const reqId = pendingReqId;
        if (!reqId) return;

        const payload: UpdateRequirementRequestDto = {
            id: reqId,
            project_id: requirementsRef.current.find(r => r.id === reqId)?.workspace_id || 0,
            workspace_id: requirementsRef.current.find(r => r.id === reqId)?.workspace_id || 0,
            quoted_price: amount,
            currency,
            estimated_hours: hours,
            status: 'Submitted',
            requires_advance_payment: data.requires_advance_payment ?? false,
            advance_amount: data.advance_amount,
            advance_payment_due_date: data.advance_payment_due_date,
        };

        updateRequirementMutation.mutate(payload, {
            onSuccess: () => {
                messageRef.current.success('Quotation submitted successfully');
                setIsQuotationOpen(false);
                setPendingReqId(null);
            },
            onError: (err: Error) => {
                messageRef.current.error(getErrorMessage(err, 'Failed to submit quotation'));
            },
        });
    };

    const handleRejectConfirm = (reason: string) => {
        const reqId = pendingReqId;
        if (!reqId) return;

        const payload: UpdateRequirementRequestDto = {
            id: reqId,
            workspace_id: requirementsRef.current.find(r => r.id === reqId)?.workspace_id || 0,
            status: 'rejected',
        };

        updateRequirementMutation.mutate({ ...payload, rejection_reason: reason } as UpdateRequirementRequestDto, {
            onSuccess: () => {
                messageRef.current.success('Requirement rejected');
                setIsRejectOpen(false);
                setPendingReqId(null);
            },
        });
    };

    const handleSaveDraft = (data: CreateRequirementRequestDto, files?: File[]) => {
        if (editingReq) {
            const updatePayload: UpdateRequirementRequestDto = { ...data, id: editingReq.id };
            delete updatePayload.status;
            updateRequirementMutation.mutate(updatePayload, {
                onSuccess: () => {
                    messageRef.current.success('Requirement updated');
                    setIsDialogOpen(false);
                    setEditingReq(undefined);
                },
                onError: (error: unknown) => {
                    messageRef.current.error(getErrorMessage(error, 'Failed to update requirement'));
                },
            });
            return;
        }
        createRequirementMutation.mutate(data, {
            onSuccess: async (response: { result?: { id?: number } }) => {
                messageApi.success('Draft saved');
                setIsDialogOpen(false);
                const reqId = response?.result?.id;
                if (files && files.length > 0 && reqId) {
                    messageApi.loading({ content: 'Uploading documents...', key: 'req-upload' });
                    try {
                        await Promise.all(files.map(file => fileService.uploadFile(file, 'REQUIREMENT', reqId)));
                        messageApi.success({ content: 'Documents uploaded successfully', key: 'req-upload' });
                    } catch (err) {
                        console.error(err);
                        messageApi.error({ content: 'Failed to upload documents', key: 'req-upload' });
                    }
                }
            },
            onError: (error: unknown) => {
                messageApi.error(getErrorMessage(error, 'Failed to save draft'));
            },
        });
    };

    const handleSendRequirement = (data: CreateRequirementRequestDto, files?: File[]) => {
        const targetStatus = data.type === 'outsourced' ? 'Waiting' : 'Assigned';
        if (editingReq) {
            const updatePayload: UpdateRequirementRequestDto = { ...data, id: editingReq.id, status: targetStatus };
            updateRequirementMutation.mutate(updatePayload, {
                onSuccess: () => {
                    messageApi.success(data.type === 'outsourced' ? 'Sent to partner' : 'Submitted for work');
                    setIsDialogOpen(false);
                    setEditingReq(undefined);
                },
                onError: (error: unknown) => {
                    messageApi.error(getErrorMessage(error, 'Failed to send requirement'));
                },
            });
            return;
        }
        createRequirementMutation.mutate(data, {
            onSuccess: async (response: { result?: { id?: number } }) => {
                if (!response?.result?.id) {
                    messageApi.success('Requirement created');
                    setIsDialogOpen(false);
                    return;
                }
                const reqId = response.result.id;
                updateRequirementMutation.mutate(
                    { id: reqId, workspace_id: data.workspace_id, status: targetStatus } as UpdateRequirementRequestDto,
                    {
                        onSuccess: () => {
                            messageApi.success(data.type === 'outsourced' ? 'Sent to partner' : 'Submitted for work');
                            setIsDialogOpen(false);
                        },
                        onError: (error: unknown) => {
                            messageApi.error(getErrorMessage(error, 'Failed to send requirement'));
                        },
                    }
                );
                if (files && files.length > 0) {
                    messageApi.loading({ content: 'Uploading documents...', key: 'req-upload' });
                    try {
                        await Promise.all(files.map(file => fileService.uploadFile(file, 'REQUIREMENT', reqId)));
                        messageApi.success({ content: 'Documents uploaded successfully', key: 'req-upload' });
                    } catch (err) {
                        console.error(err);
                        messageApi.error({ content: 'Failed to upload documents', key: 'req-upload' });
                    }
                }
            },
            onError: (error: unknown) => {
                messageApi.error(getErrorMessage(error, 'Failed to create requirement'));
            },
        });
    };

    const handleReqAccept = (id: number) => {
        const req = requirementsRef.current.find(r => r.id === id);
        if (!req) {
            messageApi.error('Requirement not found');
            return;
        }
        setPendingReqId(id);

        if (req.rawStatus === 'Draft') {
            if (req.type === 'outsourced' && req.isSender) {
                updateRequirementMutation.mutate(
                    { id: req.id, workspace_id: req.workspace_id, status: 'Waiting' } as UpdateRequirementRequestDto,
                    {
                        onSuccess: () => {
                            messageApi.success('Requirement sent to partner.');
                            setPendingReqId(null);
                        },
                        onError: (err: Error) => {
                            messageApi.error(getErrorMessage(err, 'Failed to send requirement'));
                        },
                    }
                );
                return;
            }
            if (req.type === 'inhouse') {
                updateRequirementMutation.mutate(
                    { id: req.id, workspace_id: req.workspace_id, status: 'Assigned' } as UpdateRequirementRequestDto,
                    {
                        onSuccess: () => {
                            messageApi.success('Requirement submitted for work.');
                            setPendingReqId(null);
                        },
                        onError: (err: Error) => {
                            messageApi.error(getErrorMessage(err, 'Failed to submit requirement'));
                        },
                    }
                );
                return;
            }
            messageApi.info('No action required at this stage');
            return;
        }

        if (req.type === 'outsourced') {
            if (req.isReceiver) {
                if (req.rawStatus === 'Waiting' || req.rawStatus === 'rejected') {
                    setIsQuotationOpen(true);
                    return;
                }
                if (req.rawStatus === 'Assigned' && !req.receiver_workspace_id) {
                    setIsMappingOpen(true);
                    return;
                }
                messageApi.info('No action required at this stage');
                return;
            }
            if (req.isSender) {
                if (req.rawStatus === 'Submitted') {
                    updateRequirementMutation.mutate(
                        { id: req.id, workspace_id: req.workspace_id, status: 'Assigned' },
                        {
                            onSuccess: () => {
                                messageApi.success('Quote accepted! Vendor can now map workspace and start work.');
                                setPendingReqId(null);
                            },
                            onError: (err: Error) => {
                                messageApi.error(getErrorMessage(err, 'Failed to accept quote'));
                            },
                        }
                    );
                    return;
                }
                if (req.rawStatus === 'Review') {
                    updateRequirementMutation.mutate(
                        { id: req.id, workspace_id: req.workspace_id, status: 'Completed' },
                        {
                            onSuccess: () => {
                                messageApi.success('Work approved! Requirement marked as Completed.');
                                setPendingReqId(null);
                            },
                            onError: (err: Error) => {
                                messageApi.error(getErrorMessage(err, 'Failed to approve work'));
                            },
                        }
                    );
                    return;
                }
                messageApi.info('No action required at this stage');
                return;
            }
        }

        setIsQuotationOpen(true);
    };

    const handleReqReject = (id: number) => {
        setPendingReqId(id);
        setIsRejectOpen(true);
    };

    const handleDelete = useCallback((requirement: Requirement) => {
        const status = mapRequirementToStatus(requirement);
        const type = mapRequirementToType(requirement);
        const role = mapRequirementToRole(requirement);
        const baseContext = mapRequirementToContext(requirement, undefined, role);
        const tabContext: TabContext = {
            ...baseContext,
            isArchived: !!requirement.is_archived,
            approvalStatus: requirement.approvalStatus as 'pending' | 'rejected' | 'approved' | undefined,
        };
        const tab = getRequirementTab(status, type, role, tabContext);
        const isArchived = tab === 'archived';
        const canDelete = tab === 'draft' || tab === 'pending' || isArchived;

        if (!canDelete) {
            modalRef.current.confirm({
                title: 'Archive Requirement',
                content: 'This requirement is active and cannot be permanently deleted. Do you want to archive it instead?',
                okText: 'Archive',
                cancelText: 'Cancel',
                okButtonProps: { className: 'bg-[#F59E0B] hover:bg-[#D97706]' },
                onOk: () => {
                    updateRequirementMutation.mutate(
                        { id: requirement.id, workspace_id: requirement.workspace_id || 0, is_archived: true },
                        {
                            onSuccess: () => {
                                messageRef.current.success('Requirement archived');
                            },
                        }
                    );
                },
            });
        } else {
            modalRef.current.confirm({
                title: 'Delete Requirement',
                content: 'Are you sure you want to permanently delete this requirement? This action cannot be undone.',
                okText: 'Delete',
                cancelText: 'Cancel',
                okButtonProps: { danger: true },
                onOk: () => {
                    deleteRequirement({ id: requirement.id, workspace_id: requirement.workspace_id || 0 });
                },
            });
        }
    }, [updateRequirementMutation, deleteRequirement]);

    const handleRestoreRequirement = useCallback((requirement: Requirement) => {
        modalRef.current.confirm({
            title: 'Restore Requirement',
            content: 'Do you want to restore this requirement? It will be moved to the Active tab.',
            okText: 'Restore',
            cancelText: 'Cancel',
            okButtonProps: { className: 'bg-[#7ccf00] hover:bg-[#6bb800] border-none' },
            onOk: () => {
                updateRequirementMutation.mutate(
                    { id: requirement.id, workspace_id: requirement.workspace_id || 0, is_archived: false },
                    {
                        onSuccess: () => {
                            messageRef.current.success('Requirement restored successfully');
                        },
                    }
                );
            },
        });
    }, [updateRequirementMutation]);

    const handleFilterChange = useCallback((filterId: string, value: string) => {
        setFilters(prev => ({ ...prev, [filterId]: value }));
        setCurrentPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ type: 'All', billing: 'All', department_id: 'All', priority: 'All', partner: 'All' });
        setSearchQuery('');
        setCurrentPage(1);
    }, []);

    if (isLoadingWorkspace || isLoadingRequirements) {
        return <div className="p-8">Loading requirements...</div>;
    }

    if (!workspace) {
        return <div className="p-8">Workspace not found</div>;
    }

    const tabs = [
        { id: 'active', label: 'Active' },
        { id: 'pending', label: 'Pending' },
        { id: 'draft', label: 'Drafts' },
        { id: 'delayed', label: 'Delayed' },
        { id: 'completed', label: 'Completed' },
        { id: 'archived', label: 'Archive' },
    ];

    return (
        <div className="w-full h-full bg-white rounded-[24px] border border-[#EEEEEE] p-8 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                    <Breadcrumb
                        separator={
                            <span className="text-xl font-semibold text-[#999999]">/</span>
                        }
                        items={[
                            {
                                title: (
                                    <span
                                        className="cursor-pointer font-semibold text-xl text-[#999999] hover:text-[#666666] transition-colors"
                                        onClick={() => router.push('/dashboard/workspace')}
                                    >
                                        Workspaces
                                    </span>
                                ),
                            },
                            {
                                title: (
                                    <span className="font-semibold text-xl text-[#111111]">
                                        {workspace.name}
                                    </span>
                                ),
                            },
                        ]}
                    />
                    {userRole !== 'Employee' && (
                        <button
                            onClick={handleOpenCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-[#7CCF00] text-white text-sm font-medium rounded-xl hover:bg-[#6bb800] transition-colors"
                        >
                            Add Requirement
                        </button>
                    )}
                </div>

                <div className="mb-2 -mt-2">
                    <TabBar
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={(tabId: string) => {
                            setActiveTab(tabId as RequirementTab);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Filters bar */}
            <div className="mb-4">
                <FilterBar
                    filters={filterOptions}
                    selectedFilters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    searchPlaceholder="Search requirements..."
                    searchValue={searchQuery}
                    onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
                    showClearButton
                />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-4 mb-4">
                <span className="text-xs text-[#999999] font-medium">Sort by:</span>
                <Select
                    value={sortColumn || undefined}
                    placeholder="Sort by"
                    onChange={(val) => setSortColumn(val)}
                    className="w-40 h-8"
                    variant="borderless"
                    allowClear
                    onClear={() => setSortColumn(null)}
                >
                    <Option value="title">Requirement</Option>
                    <Option value="timeline">Timeline</Option>
                    <Option value="budget">Budget</Option>
                    <Option value="progress">Progress</Option>
                    <Option value="status">Status</Option>
                </Select>
            </div>

            {/* Card list */}
            <div className="flex-1 min-h-0 relative flex flex-col">
                <div className="flex-1 overflow-y-auto pb-6">
                    <RequirementsList
                        isLoading={false}
                        requirements={paginatedRequirements}
                        currentUser={currentUser}
                        userRole={userRole}
                        activeStatusTab={activeTab}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        handleReqAccept={handleReqAccept}
                        handleReqReject={handleReqReject}
                        handleEditDraft={handleEditDraft}
                        handleDelete={handleDelete}
                        handleRestore={handleRestoreRequirement}
                        handleDuplicateRequirement={handleDuplicateRequirement}
                        onNavigate={(wsId, reqId) =>
                            router.push(`/dashboard/workspace/${wsId}/requirements/${reqId}`)
                        }
                    />
                </div>

                {sortedRequirements.length > pageSize && (
                    <div className="bg-white">
                        <PaginationBar
                            currentPage={currentPage}
                            totalItems={sortedRequirements.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={(size) => {
                                setPageSize(size);
                                setCurrentPage(1);
                            }}
                            itemLabel="requirements"
                        />
                    </div>
                )}
            </div>

            {/* Modals */}
            <RequirementsForm
                open={isDialogOpen}
                onCancel={() => {
                    setIsDialogOpen(false);
                    setEditingReq(undefined);
                }}
                isEditing={!!editingReq}
                disableWorkspaceSelect={true}
                initialData={editingReq ? {
                    title: editingReq.title || '',
                    workspace: String(editingReq.workspace_id || workspaceId),
                    type: (() => {
                        const req = editingReq;
                        if (['client', 'Client work', 'Client Work'].includes(req.type || '')) return 'client';
                        if (req.type === 'outsourced' && req.isReceiver) return 'client';
                        return (req.type as 'inhouse' | 'outsourced') || 'inhouse';
                    })(),
                    description: editingReq.description || '',
                    dueDate: editingReq.dueDate || '',
                    is_high_priority: editingReq.is_high_priority,
                    contactPerson: (typeof editingReq.contact_person === 'string'
                        ? editingReq.contact_person
                        : editingReq.contact_person?.name) || undefined,
                    contact_person_id: editingReq.contact_person_id || undefined,
                    budget: String(editingReq.budget || ''),
                    quoted_price: String(editingReq.quoted_price || ''),
                    currency: editingReq.currency || 'USD',
                } : {
                    title: '',
                    workspace: String(workspaceId),
                    type: 'inhouse',
                    description: '',
                    dueDate: '',
                }}
                onSubmit={handleSaveDraft}
                onSubmitAndSend={handleSendRequirement}
                workspaces={workspacesData?.result?.workspaces?.map((w) => ({
                    id: w.id,
                    name: w.name,
                    company_name: w.company_name || w.client?.name || undefined,
                    partner_name: w.partner_name,
                    in_house: w.in_house,
                })) || []}
                isLoading={createRequirementMutation.isPending || updateRequirementMutation.isPending}
            />

            <QuotationDialog
                open={isQuotationOpen}
                onOpenChange={setIsQuotationOpen}
                onConfirm={handleQuotationConfirm}
                pricingModel={requirements.find(r => r.id === pendingReqId)?.pricing_model as 'hourly' | 'project' | undefined}
            />
            <RejectDialog
                open={isRejectOpen}
                onOpenChange={setIsRejectOpen}
                onConfirm={handleRejectConfirm}
            />
            <InternalMappingModal
                open={isMappingOpen}
                onOpenChange={setIsMappingOpen}
                onConfirm={(wsId) => {
                    if (!pendingReqId) return;
                    updateRequirementMutation.mutate({
                        id: pendingReqId,
                        workspace_id: allRawRequirements.find(r => r.id === pendingReqId)?.workspace_id || 0,
                        receiver_workspace_id: wsId,
                        status: 'In_Progress',
                    }, {
                        onSuccess: () => {
                            messageApi.success('Requirement mapped and activated!');
                            setIsMappingOpen(false);
                            setPendingReqId(null);
                        },
                    });
                }}
                workspaces={workspacesData?.result?.workspaces?.map((w: { id: number; name: string }) => ({
                    id: w.id,
                    name: w.name,
                })) || []}
            />
        </div>
    );
}
