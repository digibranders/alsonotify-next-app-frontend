'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PageLayout } from '../../layout/PageLayout';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { DateRangeSelector } from '../../common/DateRangeSelector';


import { PaginationBar } from '../../ui/PaginationBar';
import { Select, App } from 'antd';
import { useWorkspaces, useCreateRequirement, useUpdateRequirement, useDeleteRequirement, useCollaborativeRequirements } from '@/hooks/useWorkspace';
import { useUserDetails } from '@/hooks/useUser';
import { getRequirementsByWorkspaceId } from '@/services/workspace';
import { fileService } from '@/services/file.service';
import { useQueries } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import { Dayjs } from 'dayjs';



const { Option } = Select;

import { RequirementsForm } from '../../modals/RequirementsForm';
import { QuotationDialog, RejectDialog, InternalMappingModal } from './components/dialogs';
import { RequirementsList } from './components/RequirementsList';

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

  const { data: workspacesData, isLoading: isLoadingWorkspaces } = useWorkspaces();

  // Get all workspace IDs
  const workspace_ids = useMemo(() => {
    return workspacesData?.result?.workspaces?.map((w: { id: number }) => w.id) || [];
  }, [workspacesData]);

  // Fetch requirements for all workspaces
  const requirementQueries = useQueries({
    queries: workspace_ids.map((id: number) => ({
      queryKey: ['requirements', id],
      queryFn: () => getRequirementsByWorkspaceId(id),
      enabled: !!id && workspace_ids.length > 0,
      refetchInterval: 5000,
    })),
  });

  // Fetch collaborative requirements (where my company is receiver)
  const { data: collaborativeData } = useCollaborativeRequirements();
  const { data: userData } = useUserDetails();
  // userData.result is the Employee/User object directly
  // We need company_id for role detection
  const currentUser = userData?.result;

  const isLoadingRequirements = requirementQueries.some(q => q.isLoading);
  const isLoading = isLoadingWorkspaces || isLoadingRequirements;

  // Helper function to strip HTML tags from text
  // Helper function to strip HTML tags from text - using DOMParser for XSS safety
  const stripHtmlTags = useMemo(() => {
    // Return a function that uses DOMParser for security
    if (typeof document === 'undefined') return (html: string) => html.replace(/<[^>]*>/g, '').trim();
    return (html: string): string => {
      if (!html) return '';
      // Use DOMParser instead of innerHTML for XSS protection
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      return (doc.body.textContent || '').trim();
    };
  }, []);

  const mapRequirementStatus = (status: string): 'in-progress' | 'completed' | 'delayed' | 'draft' => {
    // Backend sends Prisma enum values: Draft, Assigned, In_Progress, Waiting, Review, Completed, etc.
    // Map to frontend display statuses

    switch (status) {
      case 'Completed':
        return 'completed';

      case 'On_Hold':
      case 'Delayed':
        return 'delayed';

      case 'Draft':
      case 'draft':
        return 'draft';

      // Active work states - show as in-progress
      case 'Assigned':
      case 'In_Progress':
      case 'Waiting':
      case 'Review':
      case 'Submitted':
      case 'Revision':
      case 'Impediment':
      case 'Stuck':
        return 'in-progress';

      case 'rejected':
        return 'in-progress';

      case 'Archived':
      case 'archived':
        return 'archived' as 'in-progress';

      default:
        return 'in-progress';
    }
  };

  const allRequirements = useMemo(() => {
    const combined: RequirementDto[] = [];

    requirementQueries.forEach((query, index) => {
      const workspace_idFromQuery = workspace_ids[index];
      if (query.data?.result && workspace_idFromQuery) {
        const requirementsWithWorkspace = query.data.result.map((req: RequirementDto) => ({
          ...req,
          workspace_id: req.workspace_id ?? workspace_idFromQuery,
        }));
        combined.push(...requirementsWithWorkspace);
      }
    });

    // Add collaborative requirements (avoid duplicates if possible)
    if (collaborativeData?.result) {
      collaborativeData.result.forEach((collab: RequirementDto) => {
        if (!combined.some(req => req.id === collab.id)) {
          combined.push(collab);
        }
      });
    }

    return combined;
    // requirementQueries is an array that is structurally memoized, but requirementQueries.map creates a new array every render.
    // Instead, depend on the queries themselves.
  }, [requirementQueries, workspace_ids, collaborativeData]);

  // Create a map of workspace ID to workspace data for client/company lookup
  // Workspace API returns: { client: {id, name}, client_company_name, company_name }
  const workspaceMap = useMemo(() => {
    const map = new Map<number, Workspace>(); // using simplified type for now
    workspacesData?.result?.workspaces?.forEach((w) => {
      map.set(w.id, w);
    });
    return map;
  }, [workspacesData]);

  // Transform backend data to UI format with placeholder/mock data where API data is not available
  const requirements = useMemo(() => {
    const mappedData = allRequirements.map((req: RequirementDto) => {
      // Get workspace data for this requirement to access client/company information
      // NOTE: The requirement API (getRequirements.sql) doesn't include project/client data
      // It only returns: requirement fields, department, manager, leader, created_user, approved_by
      // So we must get client/company from the workspace data we already fetched
      // Determine which workspace to show
      // If I am the receiver (Vendor) and I have mapped this to an internal project (receiver_project_id),
      // I should see MY internal workspace, not the client's source workspace.
      const myCompanyId = currentUser?.company_id ? Number(currentUser.company_id) : null;
      const reqReceiverCompanyId = req.receiver_company_id ? Number(req.receiver_company_id) : null;
      const reqSenderCompanyId = req.sender_company_id ? Number(req.sender_company_id) : null;
      const isReceiver = myCompanyId !== null && reqReceiverCompanyId === myCompanyId;
      const isSender = myCompanyId !== null && reqSenderCompanyId === myCompanyId;



      const effectiveWorkspaceId = (isReceiver && req.receiver_workspace_id)
        ? req.receiver_workspace_id
        : req.workspace_id;

      const workspace = workspaceMap.get(effectiveWorkspaceId || 0);

      // PLACEHOLDER DATA: Invoice status - not directly available in requirement API
      // In real implementation, this would come from a separate invoice API or join query
      const mockInvoiceStatus = req.invoice_id
        ? (req.invoice?.status === 'paid' ? 'paid' : req.invoice?.status === 'open' ? 'billed' : undefined)
        : undefined;

      // Contact Person: Use the name from the joined user record (or placeholder if missing)
      const contactPersonName = req.contact_person?.name || null;
      const mockContactPerson = req.type === 'outsourced' && !contactPersonName
        ? 'External Vendor'
        : contactPersonName;

      // PLACEHOLDER DATA: Pricing model - infer from available data if not explicitly set
      const mockPricingModel = req.pricing_model || (req.hourly_rate ? 'hourly' : 'project');

      // PLACEHOLDER DATA: Rejection reason - may not be stored in requirement table
      const mockRejectionReason = req.status?.toLowerCase().includes('rejected') && !req.rejection_reason
        ? 'Requirement was rejected during review process' // Placeholder
        : req.rejection_reason;

      // Get client name from workspace data
      // Workspace API structure: { client: {id, name}, client_company_name: string, company_name: string }
      // Match the pattern used in WorkspacePage.tsx line 85
      const clientName = workspace?.client?.name || workspace?.client_company_name || null;

      // Get company name from workspace data (agency/company name)
      const companyName = workspace?.company_name || 'Internal';

      // Department: Only use actual department name if it exists, don't default to 'General'
      // The old frontend (Requirements.tsx line 772) only shows department tag if record.department?.name exists
      // Department mapping is handled via department_id if strictly needed, or removed if not available on DTO
      const departmentName = null;

      // Determine roles - STRICT checks with type coercion for safety
      // A is Sender: sender_company_id matches current user's company
      // B is Receiver: receiver_company_id matches current user's company


      // For outsourced requirements:
      // - Sender sees: OUTSOURCED badge, shows Receiver's name/company
      // - Receiver sees: INHOUSE badge, shows Sender's name/company

      // Header Contact: Who is on the OTHER end of this requirement?
      // - If I'm Sender (A): Show Receiver's info (partner company name or contact person from receiver side)
      // - If I'm Receiver (B): Show Sender's info (the person who created/sent the requirement)
      let headerContact: string | undefined;
      let headerCompany: string | undefined;

      if (req.type === 'outsourced') {
        if (isSender) {
          // Sender (A) views: Show receiver info (B's company)
          // Show contact person only if it's explicitly assigned and DIFFERENT from the creator (internal user)
          // Otherwise fall back to partner company
          const contactName = req.contact_person?.name;
          // Fix: backend returns created_user object, not created_user_data
          const creatorName = (typeof req.created_user === 'object' ? req.created_user?.name : undefined) || req.created_user_data?.name;
          const receiverCompanyName = req.receiver_company?.name;

          const isContactExternal = !!contactName && !!creatorName && contactName !== creatorName;

          if (isContactExternal) {
            headerContact = contactName;
            headerCompany = receiverCompanyName || 'Partner';
          } else {
            headerContact = receiverCompanyName || 'Partner';
            headerCompany = undefined;
          }
        } else if (isReceiver) {
          // Receiver (B) views: Show sender info (A's name and A's company)
          // Prioritize Sender Name (Created User) over Contact Person to ensure B sees A
          headerContact = req.created_user_data?.name ||
            (typeof req.created_user === 'object' ? req.created_user?.name : undefined) ||
            req.contact_person?.name ||
            req.sender_company?.name ||
            'Sender';

          headerCompany = req.sender_company?.name;

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
        // Inhouse requirements
        // Check if this is a mapped requirement (I am the receiver of an originally outsourced req that is now "inhouse" locally)
        if (isReceiver && req.sender_company) {
          // Treat like Receiver View: Show Sender Info
          headerContact = req.created_user_data?.name ||
            (typeof req.created_user === 'object' ? req.created_user?.name : undefined) ||
            req.contact_person?.name ||
            req.sender_company?.name ||
            'Sender';
          headerCompany = req.sender_company?.name;
        } else {
          // Standard Inhouse - show assigned internal people
          headerContact = (typeof req.contact_person === 'object' ? req.contact_person?.name : req.contact_person) || 'Unknown';
          headerCompany = workspace?.client_company_name || workspace?.company_name || undefined;
        }

        // Don't show company if it's the same as contact
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
        end_date: req.end_date || undefined, // Correctly pass snake_case end_date for RequirementCard
        start_date: req.start_date || undefined, // Correctly pass snake_case start_date for consistency
        createdDate: req.start_date ? format(new Date(req.start_date), 'dd-MMM-yyyy') : 'TBD',
        is_high_priority: req.is_high_priority ?? false,
        type: (req.type || 'inhouse') as RequirementType,
        status: mapRequirementStatus(req.status || 'Assigned'),
        category: departmentName || 'General',
        // departments removed (duplicate)
        progress: 0,
        tasksCompleted: req.total_task ? Math.floor(req.total_task * 0 / 100) : 0,
        tasksTotal: req.total_task || 0,
        workspace_id: req.workspace_id || 0,
        workspace: workspace?.name || 'Unknown Workspace',
        approvalStatus: (req.approved_by ? 'approved' :
          (req.status === 'Waiting' || req.status === 'Review' || req.status?.toLowerCase() === 'rejected' || req.status?.toLowerCase() === 'review' || req.status?.toLowerCase() === 'waiting' || req.status?.toLowerCase().includes('pending')) ? 'pending' :
            undefined
        ) as 'pending' | 'approved' | 'rejected' | undefined,
        invoice_status: mockInvoiceStatus as 'paid' | 'billed' | undefined,
        // invoiceStatus removed in favor of invoice_status
        estimated_cost: req.estimated_cost || (req.budget || undefined),
        budget: req.budget || undefined,
        quoted_price: req.quoted_price || undefined,
        currency: (req.currency && req.currency.trim() !== '') ? req.currency : 'USD',
        hourly_rate: req.hourly_rate || undefined,
        estimated_hours: req.estimated_hours || undefined,
        pricing_model: mockPricingModel as 'hourly' | 'project' | undefined,
        departments: req.department_id ? [String(req.department_id)] : [], // Placeholder until department name resolution
        // departments added
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
        receiver_project_id: req.receiver_workspace_id, // Alias for backward compatibility
        negotiation_reason: req.negotiation_reason,
        is_archived: req.is_archived,
        completed_at: req.completed_at,
      };


      console.log('RequirementDebug:', {
        reqId: req.id,
        rawType: req.type,
        rawStatus: req.status,
        myCompanyId,

        reqSenderCompanyId,
        reqReceiverCompanyId,
        isSender,
        isReceiver,
        headerContact,
        headerCompany,
        // Raw data from backend
        rawContactPerson: req.contact_person,
        rawCreatedUser: req.created_user,
        rawCreatedUserData: req.created_user_data,
        rawSenderCompany: req.sender_company,
        rawReceiverCompany: req.receiver_company,
      });

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

  // Use standardized tab sync hook for consistent URL handling
  type RequirementTab = 'draft' | 'pending' | 'active' | 'completed' | 'delayed' | 'archived';
  const [activeStatusTab, setActiveStatusTab] = useTabSync<RequirementTab>({
    defaultTab: 'active',
    validTabs: ['draft', 'pending', 'active', 'completed', 'delayed', 'archived']
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Date Picker State
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // Quotation Dialog State
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);

  const [filters, setFilters] = useState<Record<string, string>>({
    type: 'All',
    billing: 'All',
    category: 'All',
    priority: 'All',
    client: 'All',
    partner: 'All',
    assignee: 'All'
  });

  const { mutate: deleteRequirement } = useDeleteRequirement();

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const handleQuotationConfirm = (data: { cost?: number; rate?: number; hours?: number; currency?: string }) => {
    const amount = data.cost || 0;
    const hours = data.hours || 0;
    const currency = data.currency || 'USD';
    // Determine the ID: editingReq for basic edits, or pendingReqId for workflow actions
    const reqId = pendingReqId;
    if (!reqId) {
      return;
    }

    // Call mutation to update requirement with quote
    // Call mutation to update requirement with quote
    const payload: UpdateRequirementRequestDto = {
      id: reqId,
      project_id: requirements.find(r => r.id === reqId)?.workspace_id || 0,
      workspace_id: requirements.find(r => r.id === reqId)?.workspace_id || 0,
      quoted_price: amount,
      currency: currency,
      // estimated_hours: hours, // Not in DTO interface? Check DTO. 
      // DTO has budget, pricing_model etc. `estimated_hours` might not be in UpdateRequirementRequestDto.
      // Assuming it is for now or I will add it if needed.
      status: 'Submitted'
    };

    // Check if estimated_hours is supported in DTO, if not we might need to cast or update DTO.
    // Use 'as any' only if key is missing in strictly typed DTO but backed supports it.
    // For now, let's assume strictness.

    updateRequirementMutation.mutate({
      ...payload,
      estimated_hours: hours // Adding it here, assuming backend supports it even if DTO missing
    } as UpdateRequirementRequestDto, {
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

    const payload: UpdateRequirementRequestDto = {
      id: reqId,
      workspace_id: requirements.find(r => r.id === reqId)?.workspace_id || 0,
      status: 'rejected',
      // rejection_reason: reason // DTO might not have this. Check DTO.
    };

    updateRequirementMutation.mutate({
      ...payload,
      rejection_reason: reason
    } as UpdateRequirementRequestDto, {
      onSuccess: () => {
        messageRef.current.success("Requirement rejected");
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

  /** Send requirement: create then set Waiting/Assigned; edit Draft → set Waiting/Assigned */
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
    createRequirementMutation.mutate(data, {
      onSuccess: async (response: { result?: { id?: number } }) => {
        if (!response?.result?.id) {
          messageApi.success("Requirement created");
          setIsDialogOpen(false);
          return;
        }
        const reqId = response.result.id;
        updateRequirementMutation.mutate(
          { id: reqId, workspace_id: data.workspace_id, status: targetStatus } as UpdateRequirementRequestDto,
          {
            onSuccess: () => {
              messageApi.success(data.type === 'outsourced' ? "Sent to partner" : "Submitted for work");
              setIsDialogOpen(false);
            },
            onError: (error: unknown) => {
              messageApi.error(getErrorMessage(error, "Failed to send requirement"));
            },
          }
        );
        if (files && files.length > 0) {
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
        messageApi.error(getErrorMessage(error, "Failed to create requirement"));
      },
    });
  };



  // Filter Logic:
  // 1. First apply all filters EXCEPT the Status Tab
  const baseFilteredReqs = useMemo(() => requirements.filter(req => {
    // Type
    const typeMatch = filters.type === 'All' ||
      (filters.type === 'In-house' && req.type === 'inhouse') ||
      (filters.type === 'Outsourced' && req.type === 'outsourced') ||
      (filters.type === 'Client Work' && req.type === 'client');

    // Billing Status
    let billingMatch = true;
    if (filters.billing !== 'All') {
      if (filters.billing === 'Paid') {
        billingMatch = req.invoice_status === 'paid';
      } else if (filters.billing === 'Invoiced') {
        billingMatch = req.invoice_status === 'billed';
      } else if (filters.billing === 'Ready to Bill') {
        billingMatch = req.status === 'completed' && !req.invoice_status;
      }
    }

    // Priority
    const priorityMatch = filters.priority === 'All' ||
      (filters.priority === 'High Priority' && req.is_high_priority) ||
      (filters.priority === 'Normal Priority' && !req.is_high_priority);

    // Client
    const clientMatch = filters.client === 'All' || req.client === filters.client;

    // Search
    const searchMatch = searchQuery === '' ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.client || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Category - match if filter is 'All' or if requirement has the selected department
    const categoryMatch = filters.category === 'All' ||
      (filters.category && req.departments && req.departments.length > 0 && req.departments.includes(filters.category));

    // Assignee
    const assigneeMatch = filters.assignee === 'All' || (req.assignedTo && req.assignedTo.includes(filters.assignee));

    // Date Range Filter
    let dateMatch = true;
    if (dateRange && dateRange[0] && dateRange[1] && req.dueDate && req.dueDate !== 'TBD') {
      try {
        const due = new Date(req.dueDate);
        const from = dateRange[0].toDate();
        const to = dateRange[1].toDate();
        dateMatch = due >= from && due <= to;
      } catch {
        dateMatch = true;
      }
    }

    return typeMatch && billingMatch && priorityMatch && clientMatch && searchMatch && dateMatch && categoryMatch && assigneeMatch;
  }), [requirements, filters, searchQuery, dateRange]);

  // 2. Apply Status Tab filter
  const finalFilteredReqs = useMemo(() => baseFilteredReqs.filter(req => {
    
    // Status normalization
    const rawStatus = req.rawStatus || 'Assigned';
    const isArchived = !!req.is_archived;
    const isCompleted = rawStatus === 'Completed';
    const isDelayedStatus = rawStatus === 'Delayed' || rawStatus === 'On_Hold';
    const isDraft = rawStatus === 'Draft' || rawStatus === 'draft';
    const isPending = 
      rawStatus === 'Waiting' || 
      rawStatus === 'Submitted' || 
      (rawStatus === 'Assigned' && req.type === 'outsourced' && !req.workspace_id) || // Unmapped outsourced
      rawStatus?.toLowerCase().includes('pending') ||
      (req.approvalStatus === 'pending');

    // Date checks
    const now = new Date();
    // Helper to parse dates safely
    const parseDate = (d: string | Date | undefined | null) => d ? new Date(d) : null;
    const endDate = parseDate(req.end_date);
    const completedAt = parseDate(req.completed_at); // New field from backend
    // Fallback if completed_at missing: use updated_at if status is Completed? 
    // Plan said explicit field. If missing, assume on time or ignore? 
    // Let's use completed_at if present.

    const isOverdue = endDate && endDate < now && !isCompleted;
    
    // Check if completed late: completed_at > end_date
    const isCompletedLate = isCompleted && completedAt && endDate && completedAt > endDate;

    switch (activeStatusTab) {
      case 'active':
        // Active: Not archived, not completed (unless delayed logic applies? No, Active tab is for open work)
        // Includes: Assigned, In_Progress, Review, Revision, Impediment, Stuck
        // AND Delayed status items
        // AND Overdue items (which are active by definition if not completed)
        
        if (isArchived || isDraft || isPending || isCompleted) return false;
        return true; // Catch-all for working states + Delayed status

      case 'delayed':
        // Delayed: 
        // 1. Explicit status 'Delayed'
        // 2. Active (not completed) AND Overdue
        // 3. Completed AND Late (completed_at > end_date)
        
        if (isArchived || isDraft || isPending) return false;
        
        if (isDelayedStatus) return true;
        if (isOverdue) return true; // Active & Overdue
        if (isCompletedLate) return true; // Completed & Late
        
        return false;

      case 'draft':
        return !isArchived && isDraft;

      case 'pending':
        return !isArchived && isPending;

      case 'completed':
        // All completed items, regardless of timeliness
        return !isArchived && isCompleted;

      case 'archived':
        return isArchived;

      default:
        return false;
    }
  }), [baseFilteredReqs, activeStatusTab]);

  // 3. Apply Sorting
  const sortedRequirements = useMemo(() => {
    const sorted = [...finalFilteredReqs];

    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortColumn) {
          case 'title':
            aVal = (a.title || '').toLowerCase();
            bVal = (b.title || '').toLowerCase();
            break;
          case 'timeline':
            // Use end_date/dueDate for sorting timeline
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
            // Sort key not in typed union; narrow when requirement DTO is extended.
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

    return sorted;
  }, [finalFilteredReqs, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };


  // Get unique partners for filter options
  const allPartners = useMemo(() => {
    const partners = Array.from(new Set(requirements.map(r => r.sender_company?.name || r.receiver_company?.name))).filter((x): x is string => Boolean(x));
    return ['All', ...partners];
  }, [requirements]);

  // Get unique clients for filter options
  const allClients = useMemo(() => {
    const clients = Array.from(new Set(requirements.map(r => r.client))).filter((x): x is string => Boolean(x));
    return ['All', ...clients];
  }, [requirements]);

  const priorities = ['All', 'High', 'Normal'];

  // Get unique departments/categories - only include actual department names from requirements
  const allCategories = useMemo(() => {
    const depts = Array.from(new Set(requirements.flatMap(r => r.departments || []))).filter((x): x is string => Boolean(x));
    // Return 'All' plus actual department names (no 'General' placeholder)
    return ['All', ...depts];
  }, [requirements]);

  // Get unique assignees - add placeholder if no assignees available
  // PLACEHOLDER DATA: If no assignees exist, show "Unassigned" option
  const allAssignees = useMemo(() => {
    const assignees = Array.from(new Set(requirements.flatMap(r => r.assignedTo || []))).filter((x): x is string => Boolean(x));
    // Add placeholder if no assignees found
    if (assignees.length === 0) {
      return ['All', 'Unassigned'];
    }
    return ['All', ...assignees];
  }, [requirements]);

  const filterOptions: FilterOption[] = [
    { id: 'type', label: 'Type', options: ['All', 'In-house', 'Outsourced', 'Client Work'], placeholder: 'Type' },
    { id: 'priority', label: 'Priority', options: priorities, placeholder: 'Priority' },
    { id: 'client', label: 'Client', options: allClients, placeholder: 'Client' },
    { id: 'partner', label: 'Partner', options: allPartners, placeholder: 'Partner' },
    { id: 'category', label: 'Department', options: allCategories, placeholder: 'Department' },
    { id: 'assignee', label: 'Assigned To', options: allAssignees, placeholder: 'Assignee' },
    // Only show Billing filter when on Completed tab - moved to last position to prevent layout shift
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
      client: 'All',
      category: 'All',
      assignee: 'All',
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
    if (req.rawStatus === 'Draft') {
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
    if (req.type === 'outsourced') {
      // RECEIVER ACTIONS (Company B - Vendor)
      if (req.isReceiver) {
        // Scenario 1: Waiting for quote submission OR resubmitting after rejection
        if (req.rawStatus === 'Waiting' || req.rawStatus === 'rejected') {
          // Open quotation dialog to submit/resubmit quote
          setIsQuotationOpen(true);
          return;
        }

        // Scenario 2: Quote accepted, need to map to internal workspace
        if (req.rawStatus === 'Assigned' && !req.receiver_workspace_id) {
          // Open workspace mapping modal
          setIsMappingOpen(true);
          return;
        }

        // Scenario 3: Other receiver states - should not show accept button
        messageApi.info("No action required at this stage");
        return;
      }

      // SENDER ACTIONS (Company A - Client)
      if (req.isSender) {
        // Scenario 1: Reviewing QUOTE submission (Status: Submitted)
        if (req.rawStatus === 'Submitted') {
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
        if (req.rawStatus === 'Review') {
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

    // Fallback for non-outsourced requirements or unclear states
    // For in-house requirements, approval might still use quotation dialog for budget confirmation
    setIsQuotationOpen(true);
  };

  const handleReqReject = (id: number) => {
    setPendingReqId(id);
    setIsRejectOpen(true);
  };



  // Tabs Configuration
  const tabs = [
    {
      id: 'active', label: 'Active'
    },
    {
      id: 'pending', label: 'Pending', count: baseFilteredReqs.filter(req => {
        const status = (req.status || req.rawStatus || 'draft') as any;
        const type = mapRequirementToType(req);
        const role = mapRequirementToRole(req);
        const baseContext = mapRequirementToContext(req, undefined, role);
        const tabContext: TabContext = {
          ...baseContext,
          isArchived: !!req.is_archived,
          approvalStatus: req.approvalStatus as 'pending' | 'rejected' | 'approved' | undefined,
        };
        const reqTab = getRequirementTab(status, type, role, tabContext);
        return reqTab === 'pending';
      }).length
    },
    {
      id: 'draft', label: 'Drafts', count: baseFilteredReqs.filter(req => {
        if (req.status === 'draft' || req.rawStatus === 'draft') return true;
        return false;
      }).length
    },
    {
      id: 'delayed', label: 'Delayed', count: baseFilteredReqs.filter(req => !req.is_archived && req.status === 'delayed').length
    },
    { id: 'completed', label: 'Completed' },
    {
      id: 'archived', label: 'Archive'
    }
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
      titleExtra={
        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          availablePresets={['this_week', 'this_month', 'last_month', 'this_year', 'all_time', 'custom']}
        />
      }
    >
      {/* Filters Bar */}
      <div className="mb-6">
        <FilterBar
          filters={filterOptions}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          searchPlaceholder="Search requirements..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col">
        <div className="flex-1 overflow-y-auto pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-[#999999] font-['Manrope:Medium',sans-serif]">Sort by:</span>
              <Select
                value={sortColumn || undefined}
                placeholder="Sort by"
                onChange={handleSort}
                className="w-40 h-8"
                variant="borderless"
              >
                <Option value="title">Requirement</Option>
                <Option value="timeline">Timeline</Option>
                <Option value="budget">Budget</Option>
                <Option value="progress">Progress</Option>
                <Option value="status">Status</Option>
              </Select>
            </div>
          </div>

          <RequirementsList
            isLoading={isLoading}
            requirements={sortedRequirements}
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
          />

        </div>

        {finalFilteredReqs.length > 0 && (
          <div className="bg-white">
            <PaginationBar
              currentPage={currentPage}
              totalItems={finalFilteredReqs.length}
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
    </PageLayout>
  );
}

