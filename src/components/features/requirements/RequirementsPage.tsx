'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PageLayout } from '../../layout/PageLayout';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { DateRangeSelector } from '../../common/DateRangeSelector';


import { PaginationBar } from '../../ui/PaginationBar';
import { App } from 'antd';
import { useWorkspaces, useCreateRequirement, useUpdateRequirement, useDeleteRequirement, useAllRequirements, useCollaborativeRequirements, useApproveRequirement, useSubmitForReview } from '@/hooks/useWorkspace';
import { useUserDetails, usePartners, useCompanyDepartments } from '@/hooks/useUser';
import { fileService } from '@/services/file.service';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import { useAutoDelayOverdue } from '@/hooks/useAutoDelayOverdue';
import { Dayjs } from 'dayjs';



import { RequirementsForm } from '../../modals/RequirementsForm';
import { ClientAcceptModal } from '../../modals/ClientAcceptModal';
import { SubmitForApprovalModal } from '../../modals/SubmitForApprovalModal';
import { QuotationDialog, RejectDialog, InternalMappingModal } from './components/dialogs';
import type { RejectVariant } from './components/dialogs/RejectDialog';
import { RequirementsList } from './components/RequirementsList';
import { RaiseAdvanceProformaModal } from '../finance/RaiseAdvanceProformaModal';

import { Requirement, Workspace, RequirementType } from '@/types/domain';
import { RequirementDto, CreateRequirementRequestDto, UpdateRequirementRequestDto } from '@/types/dto/requirement.dto';
import { getErrorMessage } from '@/types/api-utils';
import { getRequirementTab, type TabContext } from '@/lib/workflow';

import {
  mapRequirementToStatus,
  mapRequirementToRole,
  mapRequirementToContext,
  mapRequirementToType,
} from './utils/requirementState.utils';
import { getRoleFromUser } from '@/utils/roleUtils';
import { getPartnerCompanyId, getPartnerName, isValidPartner } from '@/utils/partnerUtils';

export function RequirementsPage() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const messageRef = useRef(messageApi);
  const modalRef = useRef(modalApi);

  useEffect(() => {
    messageRef.current = messageApi;
    modalRef.current = modalApi;
  }, [messageApi, modalApi]);
  const router = useRouter();

  const createRequirementMutation = useCreateRequirement();
  const updateRequirementMutation = useUpdateRequirement();
  const approveRequirementMutation = useApproveRequirement();

  const { data: workspacesData, isLoading: isLoadingWorkspaces } = useWorkspaces('limit=1000');
  const { data: userData } = useUserDetails();
  const currentUser = userData?.result;

  // Pagination & Filtering State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    type: 'All',
    billing: 'All',
    department_id: 'All',
    priority: 'All',
    partner: 'All'
  });

  // Date Picker State
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // Use standardized tab sync hook for consistent URL handling
  type RequirementTab = 'draft' | 'pending' | 'active' | 'completed' | 'delayed' | 'archived';
  const [activeStatusTab, setActiveStatusTab] = useTabSync<RequirementTab>({
    defaultTab: 'active',
    validTabs: ['draft', 'pending', 'active', 'completed', 'delayed', 'archived']
  });

  // Construct Query Options for Server-Side Filtering/Pagination
  const queryOptions = useMemo(() => {
    const params = new URLSearchParams();
    params.append('limit', pageSize.toString());
    params.append('skip', ((currentPage - 1) * pageSize).toString());

    if (searchQuery) params.append('name', searchQuery);
    if (filters.priority !== 'All') {
      // filters.priority is now 'High' or 'Normal' based on the options
      params.append('priority', filters.priority);
    }
    if (filters.partner !== 'All') {
      params.append('partner_id', filters.partner);
    }
    if (filters.type !== 'All') {
      const typeMap: Record<string, string> = {
        'In-house': 'inhouse',
        'Outsourced': 'outsourced',
        'Client Work': 'client'
      };

      const selectedTypes = filters.type.split(',').map(t => t.trim());
      const mappedTypes = selectedTypes.map(t => typeMap[t] || t.toLowerCase());

      params.append('type', mappedTypes.join(','));
    }
    if (filters.department_id !== 'All') {
      params.append('department_id', filters.department_id);
    }
    if (filters.billing !== 'All') {
      const billingStatusMap: Record<string, string> = {
        'Paid': 'Paid',
        'Invoiced': 'Invoiced',
        'Ready to Bill': 'Ready to Bill'
      };
      params.append('billing_status', billingStatusMap[filters.billing] || filters.billing);
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.append('from_date', dateRange[0].startOf('day').toISOString());
      params.append('to_date', dateRange[1].endOf('day').toISOString());
    }

    // Status Tab mapping to Backend Status
    const statusMap: Record<string, string> = {
      'active': 'Assigned,In_Progress,Review,Revision,Delayed,On_Hold',
      'pending': 'Waiting,Submitted,Rejected',
      'draft': 'Draft',
      'completed': 'Completed',
      'delayed': 'Delayed,On_Hold',
    };

    if (activeStatusTab && statusMap[activeStatusTab]) {
      params.append('status', statusMap[activeStatusTab]);
    }

    // Send tab context so the backend can apply smart filtering
    // (e.g. outsourced+Assigned+unmapped workspace belongs in pending, not active)
    if (['active', 'pending', 'delayed'].includes(activeStatusTab)) {
      params.append('tab', activeStatusTab);
    }

    params.append('is_archived', activeStatusTab === 'archived' ? 'true' : 'false');

    return params.toString();
  }, [currentPage, pageSize, searchQuery, filters, activeStatusTab, dateRange]);

  // Unified Requirements Fetching (Server-Side Paginated)
  const { data: requirementsData, isLoading: isLoadingRequirements } = useAllRequirements(queryOptions);

  const totalCount = useMemo(() => {
    const firstItem = requirementsData?.result?.[0];
    return firstItem?.total_count || 0;
  }, [requirementsData]);

  // Separate tab-independent query for consistent tab counts across all tabs
  const countsQueryOptions = useMemo(() => {
    const params = new URLSearchParams();
    params.append('limit', '1');
    params.append('skip', '0');

    if (searchQuery) params.append('name', searchQuery);
    if (filters.priority !== 'All') params.append('priority', filters.priority);
    if (filters.partner !== 'All') params.append('partner_id', filters.partner);
    if (filters.type !== 'All') {
      const typeMap: Record<string, string> = {
        'In-house': 'inhouse',
        'Outsourced': 'outsourced',
        'Client Work': 'client'
      };
      const selectedTypes = filters.type.split(',').map(t => t.trim());
      const mappedTypes = selectedTypes.map(t => typeMap[t] || t.toLowerCase());
      params.append('type', mappedTypes.join(','));
    }
    if (filters.department_id !== 'All') params.append('department_id', filters.department_id);
    if (filters.billing !== 'All') {
      const billingStatusMap: Record<string, string> = {
        'Paid': 'Paid',
        'Invoiced': 'Invoiced',
        'Ready to Bill': 'Ready to Bill'
      };
      params.append('billing_status', billingStatusMap[filters.billing] || filters.billing);
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.append('from_date', dateRange[0].startOf('day').toISOString());
      params.append('to_date', dateRange[1].endOf('day').toISOString());
    }
    params.append('is_archived', 'false');

    return params.toString();
  }, [searchQuery, filters, dateRange]);

  const { data: countsData } = useAllRequirements(countsQueryOptions);

  const statusCounts = useMemo(() => {
    const firstItem = countsData?.result?.[0];
    return firstItem?.status_counts || {};
  }, [countsData]);

  // Fetch collaborative requirements (where my company is receiver)
  useCollaborativeRequirements();

  const isLoading = isLoadingWorkspaces || isLoadingRequirements;

  // Helper function to strip HTML tags from text
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
      // Active work states - show as in-progress
      case 'Assigned':
      case 'In_Progress':
      case 'Waiting':
      case 'Review':
      case 'Submitted':
      case 'Revision':
        return 'in-progress';

      case 'rejected':
        return 'in-progress';

      case 'Archived':
      case 'archived':
        return 'archived' as 'in-progress';
      default: return 'in-progress';
    }
  };

  const allRequirements = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (requirementsData?.result || []) as any[];
  }, [requirementsData]);

  // Workspace Map moved down
  const workspaceMap = useMemo(() => {
    const map = new Map<number, Workspace>();
    workspacesData?.result?.workspaces?.forEach((w) => {
      map.set(w.id, w);
    });
    return map;
  }, [workspacesData]);

  // Transform backend data to UI format
  const requirements = useMemo(() => {
    const mappedData = allRequirements.map((req: RequirementDto) => {
      const myCompanyId = currentUser?.company_id ? Number(currentUser.company_id) : null;
      const reqReceiverCompanyId = req.receiver_company_id ? Number(req.receiver_company_id) : null;
      const reqSenderCompanyId = req.sender_company_id ? Number(req.sender_company_id) : null;
      const isReceiver = myCompanyId !== null && reqReceiverCompanyId === myCompanyId;
      const isSender = myCompanyId !== null && reqSenderCompanyId === myCompanyId;

      const effectiveWorkspaceId = (isReceiver && req.receiver_workspace_id)
        ? req.receiver_workspace_id
        : req.workspace_id;

      const workspace = workspaceMap.get(effectiveWorkspaceId || 0);

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

      const clientName = workspace?.client?.name || workspace?.client_company_name || null;
      const companyName = workspace?.company_name || 'Internal';

      let headerContact: string | undefined;
      let headerCompany: string | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creatorName = (typeof req.created_user === 'object' ? (req.created_user as any)?.name : undefined) || req.created_user_data?.name;
      const isClientWork = ['client', 'Client work', 'Client Work'].includes(req.type || '');

      if (isClientWork) {
        if (isReceiver) {
          // A (Receiver/Worker) sees B (Client) details
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headerContact = req.contact_person?.name || (req as any).sender_company?.name || 'Client';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headerCompany = (req as any).sender_company?.name;
        } else if (isSender) {
          // B (Sender/Client) sees A (Worker) details
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headerContact = creatorName || req.contact_person?.name || (req as any).receiver_company?.name || 'Worker';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headerCompany = (req as any).receiver_company?.name;
        }

        if (headerContact && headerCompany && headerContact === headerCompany) {
          headerCompany = undefined;
        }
      } else if (req.type === 'outsourced') {
        if (isSender) {
          const contactName = req.contact_person?.name;
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
          headerContact = creatorName ||
            req.contact_person?.name ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any).sender_company?.name ||
            'Sender';

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headerCompany = (req as any).sender_company?.name;

          if (headerContact === headerCompany) {
            headerCompany = undefined;
          }
        }
        else {
          // Not directly involved (shouldn't happen for outsourced)
          headerContact = undefined;
          headerCompany = undefined;
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (isReceiver && (req as any).sender_company) {
          headerContact = creatorName ||
            req.contact_person?.name ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any).sender_company?.name ||
            'Sender';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headerCompany = (req as any).sender_company?.name;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          headerContact = (typeof req.contact_person === 'object' ? (req.contact_person as any)?.name : req.contact_person) || 'Unknown';
          headerCompany = workspace?.client_company_name || workspace?.company_name || undefined;
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
        client: clientName || (workspace ? 'N/A' : 'N/A'),
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
        workspace_id: effectiveWorkspaceId || 0,
        workspace: workspace?.name || 'Unknown Workspace',
        approvalStatus: (req.approved_by ? 'approved' :
          (req.status === 'Waiting' || req.status === 'Review' || req.status?.toLowerCase() === 'rejected' || req.status?.toLowerCase().includes('pending')) ? 'pending' :
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
        completed_at: req.completed_at,
      };



      return mappedReq;

    });
    return mappedData;

  }, [allRequirements, workspaceMap, currentUser, stripHtmlTags]);

  // FIX: Create a ref to hold the latest requirements list
  // This allows us to access the latest data in event handlers without adding 'requirements'
  // to their dependency array, preventing an infinite update loop in FloatingMenuContext.
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

  // Quotation Dialog State
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isClientAcceptOpen, setIsClientAcceptOpen] = useState(false);
  const [isAdvanceProformaOpen, setIsAdvanceProformaOpen] = useState(false);
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);
  const [isSubmitReviewOpen, setIsSubmitReviewOpen] = useState(false);
  const [pendingSubmitReqId, setPendingSubmitReqId] = useState<number | null>(null);
  const submitForReviewMutation = useSubmitForReview();

  const { mutate: deleteRequirement } = useDeleteRequirement();


  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | undefined>(undefined);

  const handleOpenCreate = () => {
    setEditingReq(undefined);
    setIsDialogOpen(true);
  };

  const handleEditDraft = (req: Requirement) => {
    setEditingReq(req);

    setIsDialogOpen(true);
  };

  const handleDuplicateRequirement = (req: Requirement) => {
    // Create a copy of the requirement data for duplication
    // Set editingReq to undefined so it creates a new requirement instead of updating
    setEditingReq({
      ...req,
      id: undefined as unknown as number, // Remove ID so it creates new
      title: `${req.title} (Copy)`, // Add (Copy) suffix to title
    });
    setIsDialogOpen(true);
  };

  const handleQuotationConfirm = (data: { cost?: number; rate?: number; hours?: number; currency?: string; requires_advance_payment?: boolean; advance_amount?: number; advance_payment_due_date?: string }) => {
    const amount = data.cost || 0;
    const hours = data.hours || 0;
    const currency = data.currency || 'USD';
    const reqId = pendingReqId;
    if (!reqId) {
      return;
    }

    const payload: UpdateRequirementRequestDto = {
      id: reqId,
      project_id: requirements.find(r => r.id === reqId)?.workspace_id || 0,
      workspace_id: requirements.find(r => r.id === reqId)?.workspace_id || 0,
      quoted_price: amount,
      currency: currency,
      estimated_hours: hours,
      status: 'Submitted',
      requires_advance_payment: data.requires_advance_payment ?? false,
      advance_amount: data.advance_amount,
      advance_payment_due_date: data.advance_payment_due_date,
    };

    updateRequirementMutation.mutate(payload, {
      onSuccess: () => {
        messageRef.current.success("Quotation submitted successfully");
        setIsQuotationOpen(false);
        setPendingReqId(null);
      },
      onError: (err: Error) => {
        messageRef.current.error(getErrorMessage(err, "Failed to submit quotation"));
      }
    });
  };

  const handleRejectConfirm = (reason: string) => {
    const reqId = pendingReqId;
    if (!reqId) return;

    const req = requirements.find(r => r.id === reqId);
    if (!req) return;

    const workflowStatus = mapRequirementToStatus(req);
    const targetStatus = workflowStatus === 'Review' ? 'Revision' : 'rejected';

    const payload: UpdateRequirementRequestDto = {
      id: reqId,
      workspace_id: req.workspace_id || 0,
      status: targetStatus,
    };

    updateRequirementMutation.mutate({
      ...payload,
      rejection_reason: reason
    } as UpdateRequirementRequestDto, {
      onSuccess: () => {
        messageRef.current.success(targetStatus === 'Revision' ? "Revision requested" : "Requirement rejected");
        setIsRejectOpen(false);
        setPendingReqId(null);
      }
    });
  };





  /** Create and update flows are handled exclusively by handleSaveDraft and handleSendRequirement. */
  /** Save as draft: create → backend sets Draft; edit → update fields, keep status Draft */
  const handleSaveDraft = (data: CreateRequirementRequestDto, files?: File[]) => {
    if (editingReq) {
      // In edit mode, we use handleSaveDraft for the "Update" action.
      // To avoid "Invalid status transition" errors, we omit the status field.
      // The backend will update other fields while preserving the current status.
      const updatePayload: UpdateRequirementRequestDto = { ...data, id: editingReq.id };
      delete updatePayload.status;

      updateRequirementMutation.mutate(updatePayload, {
        onSuccess: () => {
          messageRef.current.success("Requirement updated");
          setIsDialogOpen(false);
          setEditingReq(undefined);
        },
        onError: (error: unknown) => {
          messageRef.current.error(getErrorMessage(error, "Failed to update requirement"));
        },
      });
      return;
    }
    createRequirementMutation.mutate(data, {
      onSuccess: async (response: { result?: { id?: number } }) => {
        messageApi.success("Draft saved");
        setIsDialogOpen(false);
        const reqId = response?.result?.id;
        if (files && files.length > 0 && reqId) {
          messageApi.loading({ content: 'Uploading documents...', key: 'req-upload' });
          try {
            const uploadPromises = files.map(file => fileService.uploadFile(file, 'REQUIREMENT', reqId));
            await Promise.all(uploadPromises);
            messageApi.success({ content: 'Documents uploaded successfully', key: 'req-upload' });
          } catch (err) {
            console.error(err);
            messageApi.error({ content: 'Failed to upload documents', key: 'req-upload' });
          }
        }
      },
      onError: (error: unknown) => {
        messageApi.error(getErrorMessage(error, "Failed to save draft"));
      },
    });
  };

  /** Send requirement: create with target status directly; edit Draft → set Waiting/Assigned */
  const handleSendRequirement = (data: CreateRequirementRequestDto, files?: File[]) => {
    const targetStatus = data.type === 'outsourced' ? 'Waiting' : 'Assigned';
    if (editingReq) {
      const updatePayload: UpdateRequirementRequestDto = { ...data, id: editingReq.id, status: targetStatus };
      updateRequirementMutation.mutate(updatePayload, {
        onSuccess: () => {
          messageApi.success(data.type === 'outsourced' ? "Sent to partner" : "Submitted for work");
          setIsDialogOpen(false);
          setEditingReq(undefined);
        },
        onError: (error: unknown) => {
          messageApi.error(getErrorMessage(error, "Failed to send requirement"));
        },
      });
      return;
    }
    // Pass status in create payload — backend supports creating with Waiting/Assigned directly.
    // This avoids the fragile two-step create-then-update flow that could leave reqs stuck in Draft.
    const createPayload = { ...data, status: targetStatus };
    createRequirementMutation.mutate(createPayload, {
      onSuccess: async (response: { result?: { id?: number } }) => {
        const successMsg = data.type === 'outsourced' ? "Sent to partner"
          : data.type === 'client' ? "Client work logged successfully"
          : "Submitted for work";
        messageApi.success(successMsg);
        setIsDialogOpen(false);

        const reqId = response?.result?.id;
        if (files && files.length > 0 && reqId) {
          messageApi.loading({ content: 'Uploading documents...', key: 'req-upload' });
          try {
            const uploadPromises = files.map(file => fileService.uploadFile(file, 'REQUIREMENT', reqId));
            await Promise.all(uploadPromises);
            messageApi.success({ content: 'Documents uploaded successfully', key: 'req-upload' });
          } catch (err) {
            console.error(err);
            messageApi.error({ content: 'Failed to upload documents', key: 'req-upload' });
          }
        }
      },
      onError: (error: unknown) => {
        messageApi.error(getErrorMessage(error, "Failed to send requirement"));
      },
    });
  };



  // Fetch partners and departments for filters
  const { data: partnersData } = usePartners();
  const { data: departmentsData } = useCompanyDepartments();

  // Filter Logic:
  // 1. First apply all filters EXCEPT the Status Tab
  // Logic removed: Filtering is now handled server-side via queryOptions.
  // The 'requirements' array contains the server-provided data for the current tab and filters.
  // 2. Apply Status Tab filter
  // Logic removed: Filtering is now handled server-side via queryOptions.
  // The 'requirements' array contains the server-provided data for the current tab and filters.
  // Delayed status



  // Get unique partners for filter options
  const allPartners = useMemo(() => {
    const partners = partnersData?.result || [];
    // The filter expects Company ID, but 'partners' are User objects.
    // We must use the company_id associated with the partner user.
    const options = partners
      .filter(isValidPartner)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        label: getPartnerName(p),
        value: String(getPartnerCompanyId(p))
      }));
    return [{ label: 'All', value: 'All' }, ...options];
  }, [partnersData]);

  const priorities = useMemo(() => ([
    { label: 'All', value: 'All' },
    { label: 'High', value: 'High' },
    { label: 'Normal', value: 'Normal' }
  ]), []);

  // Get unique departments/categories
  const allCategories = useMemo(() => {
    const depts = departmentsData?.result || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = depts.map((d: any) => ({ label: d.name, value: String(d.id) }));
    return [{ label: 'All', value: 'All' }, ...options];
  }, [departmentsData]);

  const typeOptions = useMemo(() => ([
    { label: 'All', value: 'All' },
    { label: 'In-house', value: 'In-house' },
    { label: 'Outsourced', value: 'Outsourced' },
    { label: 'Client Work', value: 'Client Work' }
  ]), []);


  const filterOptions: FilterOption[] = [
    { id: 'type', label: 'Type', options: typeOptions, placeholder: 'Type', multiSelect: true },
    { id: 'priority', label: 'Priority', options: priorities, placeholder: 'Priority' },
    { id: 'partner', label: 'Partner', options: allPartners, placeholder: 'Partner', multiSelect: true },
    // Only show Department filter when NOT on Draft or Pending tabs
    ...(!['draft', 'pending'].includes(activeStatusTab) ? [{ id: 'department_id', label: 'Department', options: allCategories, placeholder: 'Department', multiSelect: true }] : []),
    // Only show Billing filter when on Completed tab
    ...(activeStatusTab === 'completed' ? [{ id: 'billing', label: 'Billing', options: ['All', 'Ready to Bill', 'Invoiced', 'Paid'], placeholder: 'Billing Status' }] : [])
  ];

  const handleFilterChange = useCallback((filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      type: 'All',
      billing: 'All',
      priority: 'All',
      department_id: 'All',
      partner: 'All'
    });
    setSearchQuery('');
    setDateRange(null);
    setCurrentPage(1);
  }, []);

  const handleReqAccept = (id: number) => {
    const req = requirements.find(r => r.id === id);
    if (!req) {
      messageApi.error("Requirement not found");
      return;
    }

    setPendingReqId(id);

    // Draft: Send to Partner (sender) or Submit for Work (internal)
    const workflowStatus = mapRequirementToStatus(req);

    if (workflowStatus === 'Draft') {
      if (req.type === 'outsourced' && req.isSender) {
        updateRequirementMutation.mutate({
          id: req.id,
          workspace_id: req.workspace_id,
          status: 'Waiting',
        } as UpdateRequirementRequestDto, {
          onSuccess: () => {
            messageApi.success("Requirement sent to partner.");
            setPendingReqId(null);
          },
          onError: (err: Error) => {
            messageApi.error(getErrorMessage(err, "Failed to send requirement"));
          },
        });
        return;
      }
      if (req.type === 'inhouse') {
        updateRequirementMutation.mutate({
          id: req.id,
          workspace_id: req.workspace_id,
          status: 'Assigned',
        } as UpdateRequirementRequestDto, {
          onSuccess: () => {
            messageApi.success("Requirement submitted for work.");
            setPendingReqId(null);
          },
          onError: (err: Error) => {
            messageApi.error(getErrorMessage(err, "Failed to submit requirement"));
          },
        });
        return;
      }
      messageApi.info("No action required at this stage");
      return;
    }

    // Intelligent routing based on requirement type, status, and user role
    const isClientWork = ['client', 'Client work', 'Client Work'].includes(req.type || '');

    if (isClientWork) {
      if (req.isSender) {
        // Partner B (Sender in client work context) accepts and maps
        if (workflowStatus === 'Waiting') {
          setIsClientAcceptOpen(true);
          return;
        }
        // Sender B receives work from Receiver A, B reviews and approves!
        if (workflowStatus === 'Review') {
          updateRequirementMutation.mutate({
            id: req.id,
            workspace_id: req.workspace_id,
            status: 'Completed'
          }, {
            onSuccess: () => {
              messageApi.success("Work approved! Requirement marked as Completed.");
              setPendingReqId(null);
            },
            onError: (err: Error) => {
              messageApi.error(getErrorMessage(err, "Failed to approve work"));
            }
          });
          return;
        }
      }
      if (req.isReceiver) {
        // Creator A (Receiver in client work context) - wait for B
        if (workflowStatus === 'Waiting') {
          messageApi.info("Awaiting client acceptance.");
          return;
        }
      }
    }

    if (req.type === 'outsourced') {
      // RECEIVER ACTIONS (Company B - Vendor)
      if (req.isReceiver) {
        // Scenario 1: Waiting for quote submission OR resubmitting after rejection
        if (workflowStatus === 'Waiting' || workflowStatus === 'Rejected') {
          // Open quotation dialog to submit/resubmit quote
          setIsQuotationOpen(true);
          return;
        }

        // Scenario 2: Quote accepted, need to map to internal workspace
        if (workflowStatus === 'Assigned' && !req.receiver_workspace_id) {
          // Open workspace mapping modal
          setIsMappingOpen(true);
          return;
        }

        // Scenario 2.5: Workspace mapped, advance payment required but no proforma yet
        if (workflowStatus === 'Assigned' && req.receiver_workspace_id && req.requires_advance_payment && !req.advance_invoice_id) {
          setIsAdvanceProformaOpen(true);
          return;
        }

        // Scenario 3: Other receiver states - should not show accept button
        messageApi.info("No action required at this stage");
        return;
      }

      // SENDER ACTIONS (Company A - Client)
      if (req.isSender) {
        // Scenario 0: Advance invoice exists — navigate to invoice detail
        if (workflowStatus === 'Assigned' && req.advance_invoice_id) {
          router.push(`/dashboard/finance/invoices/${req.advance_invoice_id}`);
          return;
        }

        // Scenario 1: Reviewing QUOTE submission (Status: Submitted)
        if (workflowStatus === 'Submitted') {
          // Accept quote directly - update status to Assigned
          updateRequirementMutation.mutate({
            id: req.id,
            workspace_id: req.workspace_id,
            status: 'Assigned'
          }, {
            onSuccess: () => {
              messageApi.success("Quote accepted! Vendor can now map workspace and start work.");
              setPendingReqId(null);
            },
            onError: (err: Error) => {
              messageApi.error(getErrorMessage(err, "Failed to accept quote"));
            }
          });
          return;
        }

        // Scenario 2: Reviewing WORK submission (Status: Review)
        if (workflowStatus === 'Review') {
          // Approve Work -> Completed
          // Might need feedback dialog later? For now direct approval.
          updateRequirementMutation.mutate({
            id: req.id,
            workspace_id: req.workspace_id,
            status: 'Completed'
          }, {
            onSuccess: () => {
              messageApi.success("Work approved! Requirement marked as Completed.");
              setPendingReqId(null);
            },
            onError: (err: Error) => {
              messageApi.error(getErrorMessage(err, "Failed to approve work"));
            }
          });
          return;
        }

        // Scenario 3: Other sender states
        messageApi.info("No action required at this stage");
        return;
      }
    }

    // INTERNAL/INHOUSE Requirement Approval
    if (workflowStatus === 'Review') {
      updateRequirementMutation.mutate({
        id: req.id,
        workspace_id: req.workspace_id,
        status: 'Completed'
      }, {
        onSuccess: () => {
          messageApi.success("Work approved! Requirement marked as Completed.");
          setPendingReqId(null);
        },
        onError: (err: Error) => {
          messageApi.error(getErrorMessage(err, "Failed to approve work"));
        }
      });
      return;
    }

    // Fallback for non-outsourced requirements or unclear states
    // For in-house requirements awaiting quote/budget approval, show quotation modal
    setIsQuotationOpen(true);
  };

  const handleReqReject = (id: number) => {
    setPendingReqId(id);
    setIsRejectOpen(true);
  };

  const handleSubmitForReview = useCallback((id: number) => {
    setPendingSubmitReqId(id);
    setIsSubmitReviewOpen(true);
  }, []);

  // Tabs Configuration
  const tabs = [
    { id: 'active', label: 'Active' },
    { id: 'pending', label: 'Pending', count: statusCounts.Pending },
    { id: 'draft', label: 'Drafts' },
    { id: 'delayed', label: 'Delayed', count: statusCounts.Delayed },
    { id: 'completed', label: 'Completed' },
    { id: 'archived', label: 'Archive' }
  ];




  const userRole = getRoleFromUser(currentUser);


  // Handle requirement deletion/archiving logic
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
      // Archive Action
      modalRef.current.confirm({
        title: 'Archive Requirement',
        content: 'This requirement is active and cannot be permanently deleted. Do you want to archive it instead?',
        okText: 'Archive',
        cancelText: 'Cancel',
        okButtonProps: { className: 'bg-[#F59E0B] hover:bg-[#D97706]' },
        onOk: () => {
          updateRequirementMutation.mutate({
            id: requirement.id,
            workspace_id: requirement.workspace_id || 0,
            is_archived: true
          }, {
            onSuccess: () => {
              messageRef.current.success("Requirement archived");
            }
          });
        },
      });
    } else {
      // Delete Action
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
        updateRequirementMutation.mutate({
          id: requirement.id,
          workspace_id: requirement.workspace_id || 0,
          is_archived: false
        }, {
          onSuccess: () => {
            messageRef.current.success("Requirement restored successfully");
          }
        });
      },
    });
  }, [updateRequirementMutation]);

  return (
    <PageLayout
      title="Requirements"
      titleAction={getRoleFromUser(currentUser) !== 'Employee' ? {
        onClick: () => handleOpenCreate(),
        label: "Add Requirement"
      } : undefined}
      tabs={tabs}
      activeTab={activeStatusTab}
      onTabChange={(tabId) => {
        // useTabSync handles URL updates automatically
        setActiveStatusTab(tabId as RequirementTab);
      }}
    >
      {/* Filters Bar */}
      <div className="mb-2">
        <FilterBar
          filters={filterOptions}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          searchPlaceholder="Search requirements..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          extraContent={
            <DateRangeSelector
              value={dateRange}
              onChange={setDateRange}
              availablePresets={['this_week', 'this_month', 'last_month', 'this_year', 'all_time', 'custom']}
            />
          }
        />
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col">
        <div className="flex-1 overflow-y-auto pb-6">
          <RequirementsList
            isLoading={isLoading}
            requirements={requirements}
            currentUser={currentUser}
            userRole={userRole}
            activeStatusTab={activeStatusTab}
            currentPage={currentPage}
            pageSize={pageSize}
            handleReqAccept={handleReqAccept}
            handleReqReject={handleReqReject}
            handleEditDraft={handleEditDraft}
            handleDelete={handleDelete}
            handleRestore={handleRestoreRequirement}
            handleDuplicateRequirement={handleDuplicateRequirement}
            onNavigate={(workspace_id, reqId) =>
              router.push(`/dashboard/workspace/${workspace_id}/requirements/${reqId}`)
            }
            handleSubmitForReview={userRole !== 'Employee' ? handleSubmitForReview : undefined}
          />

        </div>

        {totalCount > 0 && (
          <div className="bg-white">
            <PaginationBar
              currentPage={currentPage}
              totalItems={totalCount}
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

      {/* Create/Edit Requirement Modal - Using existing modal structure */}
      <RequirementsForm
        open={isDialogOpen}
        onCancel={() => {
          setIsDialogOpen(false);
          setEditingReq(undefined);
        }}
        isEditing={!!editingReq}
        initialData={editingReq ? {
          title: editingReq.title || '',
          workspace: String(editingReq.workspace_id || ''),
          type: (() => {
            const req = editingReq;
            // Explicit Client Type
            if (['client', 'Client work', 'Client Work'].includes(req.type || '')) return 'client';

            // Outsourced but acting as Receiver (Client Work context)
            if (req.type === 'outsourced' && req.isReceiver) return 'client';

            // Default to existing type or inhouse
            return (req.type as 'inhouse' | 'outsourced') || 'inhouse';
          })(),
          description: editingReq.description || '',
          dueDate: editingReq.dueDate || '',
          is_high_priority: editingReq.is_high_priority,
          contactPerson: (typeof editingReq.contact_person === 'string' ? editingReq.contact_person : editingReq.contact_person?.name) || undefined,
          contact_person_id: editingReq.contact_person_id || undefined,
          budget: String(editingReq.budget || ''),
          quoted_price: String(editingReq.quoted_price || ''),
          currency: editingReq.currency || 'USD',
        } : undefined}
        onSubmit={handleSaveDraft}
        onSubmitAndSend={handleSendRequirement}
        workspaces={workspacesData?.result?.workspaces?.map((w) => ({
          id: w.id,
          name: w.name,
          company_name: w.company_name || w.client?.name || undefined,
          partner_name: w.partner_name,
          in_house: w.in_house
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
        variant={(() => {
          const req = requirements.find(r => r.id === pendingReqId);
          if (!req) return 'generic';
          const ws = mapRequirementToStatus(req);
          if (ws === 'Review') return 'request_revision' as RejectVariant;
          if (ws === 'Submitted') return 'reject_quote' as RejectVariant;
          if (ws === 'Waiting' && req.isReceiver) return 'decline_requirement' as RejectVariant;
          return 'generic' as RejectVariant;
        })()}
      />
      <InternalMappingModal
        open={isMappingOpen}
        onOpenChange={setIsMappingOpen}
        onConfirm={(workspace_id) => {
          if (!pendingReqId) return;
          updateRequirementMutation.mutate({
            id: pendingReqId,
            workspace_id: allRequirements.find(r => r.id === pendingReqId)?.workspace_id || 0, // Required field
            receiver_workspace_id: workspace_id,
            status: 'In_Progress'
          }, {
            onSuccess: () => {
              messageApi.success("Requirement mapped and activated!");
              setIsMappingOpen(false);
              setPendingReqId(null);
            }
          });
        }}
        workspaces={workspacesData?.result?.workspaces?.map((w: { id: number; name: string }) => ({ id: w.id, name: w.name })) || []}
      />

      <ClientAcceptModal
        open={isClientAcceptOpen}
        onClose={() => {
          setIsClientAcceptOpen(false);
          setPendingReqId(null);
        }}
        onConfirm={async (workspaceId) => {
          if (!pendingReqId) return;
          await approveRequirementMutation.mutateAsync({
            requirement_id: pendingReqId,
            status: 'Assigned',
            workspace_id: workspaceId
          });
          messageApi.success("Requirement accepted and workspace mapped!");
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workspaces={workspacesData?.result?.workspaces?.map((w: any) => ({ id: w.id, name: w.name })) || []}
        quotedPrice={requirements.find(r => r.id === pendingReqId)?.quoted_price ?? undefined}
        currency={requirements.find(r => r.id === pendingReqId)?.currency ?? undefined}
        requirementName={requirements.find(r => r.id === pendingReqId)?.title ?? undefined}
        creatorName={requirements.find(r => r.id === pendingReqId)?.headerContact ?? undefined}
        loading={approveRequirementMutation.isPending}
      />

      {isAdvanceProformaOpen && pendingReqId && (() => {
        const req = requirements.find(r => r.id === pendingReqId);
        if (!req) return null;
        return (
          <RaiseAdvanceProformaModal
            isOpen={isAdvanceProformaOpen}
            onClose={() => {
              setIsAdvanceProformaOpen(false);
              setPendingReqId(null);
            }}
            requirementId={req.id}
            requirementTitle={req.title || req.name}
            quotedPrice={req.quoted_price || 0}
            currency={req.currency || 'INR'}
            receiverCompanyId={Number(req.receiver_company_id) || 0}
            senderCompanyId={Number(req.sender_company_id) || 0}
          />
        );
      })()}

      {isSubmitReviewOpen && pendingSubmitReqId && requirements.find(r => r.id === pendingSubmitReqId) && (
        <SubmitForApprovalModal
          open={isSubmitReviewOpen}
          onClose={() => {
            setIsSubmitReviewOpen(false);
            setPendingSubmitReqId(null);
          }}
          onSubmit={async (data) => {
            await submitForReviewMutation.mutateAsync({
              requirementId: pendingSubmitReqId,
              body: data,
            });
            messageApi.success("Requirement submitted for review successfully!");
            setIsSubmitReviewOpen(false);
            setPendingSubmitReqId(null);
          }}
          requirement={requirements.find(r => r.id === pendingSubmitReqId)!}
        />
      )}
    </PageLayout>
  );
}

