'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageLayout } from '../../layout/PageLayout';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { DateRangeSelector } from '../../common/DateRangeSelector';
import { useFloatingMenu } from '../../../context/FloatingMenuContext';
import {
  X, Calendar as CalendarIcon, Clock, CheckCircle, CheckSquare, Users, Trash2,
  FilePlus, Receipt, MoreHorizontal, Play, XCircle, RotateCcw, ChevronDown, AlertCircle,
  ArrowDown, ArrowUp, Archive
} from 'lucide-react';

import { PaginationBar } from '../../ui/PaginationBar';
import { Modal, Button, Input, Select, Tooltip, Popover, Checkbox, App } from 'antd';
import { useWorkspaces, useCreateRequirement, useUpdateRequirement, useDeleteRequirement, useApproveRequirement, useCollaborativeRequirements } from '@/hooks/useWorkspace';
import { useEmployees, useUserDetails } from '@/hooks/useUser';
import { Skeleton } from '../../ui/Skeleton';
import { getRequirementsByWorkspaceId } from '@/services/workspace';
import { fileService } from '@/services/file.service';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import dayjs, { Dayjs } from 'dayjs';
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";


const { TextArea } = Input;
const { Option } = Select;

import { RequirementsForm } from '../../modals/RequirementsForm';
import { WorkspaceForm } from '../../modals/WorkspaceForm';
import { RequirementCard } from './components/RequirementCard';
import { QuotationDialog, RejectDialog, InternalMappingModal } from './components/dialogs';

import { Requirement, Workspace } from '@/types/domain';
import { RequirementDto, CreateRequirementRequestDto, UpdateRequirementRequestDto } from '@/types/dto/requirement.dto';
import { getErrorMessage } from '@/types/api-utils';
import { getRequirementTab, type TabContext } from '@/lib/workflow';
import {
  mapRequirementToStatus,
  mapRequirementToRole,
  mapRequirementToContext,
  mapRequirementToType,
} from './utils/requirementState.utils';

export function RequirementsPage() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const createRequirementMutation = useCreateRequirement();
  const updateRequirementMutation = useUpdateRequirement();
  const deleteRequirementMutation = useDeleteRequirement();
  const approveRequirementMutation = useApproveRequirement();

  // Fetch all workspaces first to get requirements for each
  const { data: workspacesData, isLoading: isLoadingWorkspaces } = useWorkspaces();
  const { data: employeesData } = useEmployees();

  // Get all workspace IDs
  const workspaceIds = useMemo(() => {
    return workspacesData?.result?.workspaces?.map((w: { id: number }) => w.id) || [];
  }, [workspacesData]);

  // Fetch requirements for all workspaces
  const requirementQueries = useQueries({
    queries: workspaceIds.map((id: number) => ({
      queryKey: ['requirements', id],
      queryFn: () => getRequirementsByWorkspaceId(id),
      enabled: !!id && workspaceIds.length > 0,
      refetchInterval: 5000,
    })),
  });

  // Fetch collaborative requirements (where my company is receiver)
  const { data: collaborativeData, isLoading: isLoadingCollaborative } = useCollaborativeRequirements();
  const { data: userData } = useUserDetails();
  // userData.result is the Employee/User object directly
  // We need company_id for role detection
  const currentUser = userData?.result;

  console.log('CurrentUser DEBUG:', {
    rawUserData: userData,
    resultUser: userData?.result?.user,
    companyId: userData?.result?.company_id,
  });


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
    // Backend sends Prisma enum values: Assigned, In_Progress, Waiting, Review, Completed, etc.
    // Map to frontend display statuses

    switch (status) {
      case 'Completed':
        return 'completed';

      case 'On_Hold':
      case 'Delayed':
        return 'delayed';

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

      case 'Rejected':
        return 'draft';

      case 'Archived':
      case 'archived':
        return 'archived' as any;

      default:
        return 'in-progress';
    }
  };

  const allRequirements = useMemo(() => {
    const combined: RequirementDto[] = [];

    requirementQueries.forEach((query, index) => {
      const workspaceIdFromQuery = workspaceIds[index];
      if (query.data?.result && workspaceIdFromQuery) {
        const requirementsWithWorkspace = query.data.result.map((req: RequirementDto) => ({
          ...req,
          workspace_id: req.workspace_id ?? workspaceIdFromQuery,
        }));
        combined.push(...requirementsWithWorkspace);
      }
    });

    // Add collaborative requirements (avoid duplicates if possible)
    if (collaborativeData?.result) {
      collaborativeData.result.forEach((collab: RequirementDto) => {
        if (collab.title === 'Test 2' || collab.id === 3) {
          console.log('DEBUG COLLAB REQ:', { id: collab.id, title: collab.title, currency: collab.currency, raw: collab });
        }
        if (!combined.some(req => req.id === collab.id)) {
          combined.push(collab);
        }
      });
    }

    return combined;
    // requirementQueries is an array that is structurally memoized, but requirementQueries.map creates a new array every render.
    // Instead, depend on the queries themselves.
  }, [requirementQueries, workspaceIds, collaborativeData]);

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
      const mockPricingModel = req.pricingModel || (req.hourlyRate ? 'hourly' : 'project');

      // PLACEHOLDER DATA: Rejection reason - may not be stored in requirement table
      const mockRejectionReason = req.status?.toLowerCase().includes('rejected') && !req.rejectionReason
        ? 'Requirement was rejected during review process' // Placeholder - would need separate field or table
        : req.rejectionReason;

      // Get client name from workspace data
      // Workspace API structure: { client: {id, name}, client_company_name: string, company_name: string }
      // Match the pattern used in WorkspacePage.tsx line 85
      const clientName = workspace?.client?.name || workspace?.client_company_name || null;

      // Get company name from workspace data (agency/company name)
      const companyName = workspace?.company_name || 'Internal';

      // Department: Only use actual department name if it exists, don't default to 'General'
      // The old frontend (Requirements.tsx line 772) only shows department tag if record.department?.name exists
      const departmentName = req.department?.name || null;

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
          headerContact = req.contact_person?.name || req.manager?.name || req.leader?.name || clientName || undefined;
          headerCompany = workspace?.client_company_name || workspace?.company_name || undefined;
        }

        // Don't show company if it's the same as contact
        if (headerContact && headerCompany && headerContact === headerCompany) {
          headerCompany = undefined;
        }
      }

      const mappedReq: Requirement = {
        id: req.id,
        title: req.title || req.name || 'Untitled Requirement',
        description: stripHtmlTags(req.description || 'No description provided'),
        company: req.type === 'outsourced' ? (headerCompany || companyName) : companyName,
        client: clientName || (workspace ? 'N/A' : 'N/A'),
        assignedTo: req.manager ? [req.manager.name] : req.leader ? [req.leader.name] : [],
        dueDate: req.end_date ? format(new Date(req.end_date), 'dd-MMM-yyyy') : 'TBD',
        startDate: req.start_date ? format(new Date(req.start_date), 'dd-MMM-yyyy') : undefined,
        createdDate: req.start_date ? format(new Date(req.start_date), 'dd-MMM-yyyy') : 'TBD',
        is_high_priority: req.is_high_priority ?? false,
        type: (req.type || 'inhouse') as 'inhouse' | 'outsourced' | 'client',
        status: mapRequirementStatus(req.status || 'Assigned'),
        category: departmentName || 'General',
        departments: departmentName ? [departmentName] : [],
        progress: req.progress || 0,
        tasksCompleted: req.total_task ? Math.floor(req.total_task * (req.progress || 0) / 100) : 0,
        tasksTotal: req.total_task || 0,
        workspaceId: req.workspace_id || 0,
        workspace: workspace?.name || 'Unknown Workspace',
        approvalStatus: (req.approved_by?.id ? 'approved' :
          (req.status === 'Waiting' || req.status === 'Review' || req.status === 'Rejected' || req.status?.toLowerCase() === 'review' || req.status?.toLowerCase() === 'waiting' || req.status?.toLowerCase() === 'rejected' || req.status?.toLowerCase().includes('pending')) ? 'pending' :
            undefined
        ) as 'pending' | 'approved' | 'rejected' | undefined,
        invoiceStatus: mockInvoiceStatus as 'paid' | 'billed' | undefined,
        estimatedCost: req.estimatedCost || (req.budget || undefined),
        budget: req.budget || undefined,
        quotedPrice: req.quotedPrice || req.quoted_price || undefined, // Add quoted_price for vendor quotes
        currency: (req.currency && req.currency.trim() !== '') ? req.currency : 'USD',
        hourlyRate: req.hourlyRate || undefined,
        estimatedHours: req.estimatedHours || undefined,
        pricingModel: mockPricingModel as 'hourly' | 'project' | undefined,
        contactPerson: mockContactPerson || undefined,
        contact_person_id: req.contact_person_id,
        rejectionReason: mockRejectionReason,
        headerContact,
        headerCompany,
        isReceiver,
        isSender,
        rawStatus: req.status,
        sender_company_id: req.sender_company_id,
        receiver_company_id: req.receiver_company_id,
        receiver_workspace_id: req.receiver_workspace_id,
        receiver_project_id: req.receiver_workspace_id, // Backward compat if needed, but safer to rely on new field
        negotiation_reason: req.negotiation_reason,
        is_archived: req.is_archived,
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

      if (req.id === 3 || mappedReq.title === 'Test 2') {
        console.log('DEBUG MAPPED REQ:', {
          id: mappedReq.id,
          currency: mappedReq.currency,
          rawCurrency: req.currency,
          isReceiver: mappedReq.isReceiver
        });
      }

      return mappedReq;

    });
    return mappedData;

  }, [allRequirements, workspaceMap, currentUser]);

  // Use standardized tab sync hook for consistent URL handling
  type RequirementTab = 'draft' | 'pending' | 'active' | 'completed' | 'delayed' | 'archived';
  const [activeStatusTab, setActiveStatusTab] = useTabSync<RequirementTab>({
    defaultTab: 'active',
    validTabs: ['draft', 'pending', 'active', 'completed', 'delayed', 'archived']
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReqs, setSelectedReqs] = useState<number[]>([]);

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
      id: undefined as any, // Remove ID so it creates new
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
      project_id: requirements.find(r => r.id === reqId)?.workspaceId || 0,
      workspace_id: requirements.find(r => r.id === reqId)?.workspaceId || 0,
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
        messageApi.success("Quotation submitted successfully");
        setIsQuotationOpen(false);
        setPendingReqId(null);
      },
      onError: (err: Error) => {
        messageApi.error(getErrorMessage(err, "Failed to submit quotation"));
      }
    });
  };

  const handleRejectConfirm = (reason: string) => {
    const reqId = pendingReqId;
    if (!reqId) return;

    const payload: UpdateRequirementRequestDto = {
      id: reqId,
      workspace_id: requirements.find(r => r.id === reqId)?.workspaceId || 0,
      status: 'Rejected',
      // rejection_reason: reason // DTO might not have this. Check DTO.
    };

    updateRequirementMutation.mutate({
      ...payload,
      rejection_reason: reason
    } as UpdateRequirementRequestDto, {
      onSuccess: () => {
        messageApi.success("Requirement rejected");
        setIsRejectOpen(false);
        setPendingReqId(null);
      }
    });
  };

  const handleCreateRequirement = (data: CreateRequirementRequestDto, files?: File[]) => {
    if (!data.title && !data.name) {
      messageApi.error("Requirement title is required");
      return;
    }
    if (!data.workspace_id) {
      messageApi.error("Please select a workspace");
      return;
    }

    createRequirementMutation.mutate(data, {
      onSuccess: async (response: any) => {
        messageApi.success("Requirement created successfully");
        setIsDialogOpen(false);

        // Handle file uploads if any
        if (files && files.length > 0 && response?.result?.id) {
          const reqId = response.result.id;
          messageApi.loading({ content: 'Uploading documents...', key: 'req-upload' });
          try {
            // Upload files sequentially or parallel
            const uploadPromises = files.map(file =>
              fileService.uploadFile(file, 'REQUIREMENT', reqId)
            );
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
      }
    });
  };

  const handleUpdateRequirement = (data: CreateRequirementRequestDto, files?: File[]) => {
    if (!editingReq) return;

    // We need to construct UpdateRequirementRequestDto which includes id.
    // The incoming data is CreateRequirementRequestDto (from form).
    const updatePayload: UpdateRequirementRequestDto = {
      ...data,
      id: editingReq.id,
    };

    // INTELLIGENT WORKFLOW: If editing a Rejected Outsourced Requirement, treat it as "Resending" -> Move to Waiting
    // This triggers the backend logic to clear old quotes and rejection reasons
    if (editingReq.type === 'outsourced' && editingReq.rawStatus === 'Rejected') {
      updatePayload.status = 'Waiting';
    }

    updateRequirementMutation.mutate(updatePayload, {
      onSuccess: () => {
        messageApi.success("Requirement updated successfully");
        setIsDialogOpen(false);
        setEditingReq(undefined);
      },
      onError: (error: unknown) => {
        messageApi.error(getErrorMessage(error, "Failed to update requirement"));
      }
    });
  };



  // Filter Logic:
  // 1. First apply all filters EXCEPT the Status Tab
  const { setExpandedContent } = useFloatingMenu();
  const baseFilteredReqs = requirements.filter(req => {
    // Type
    const typeMatch = filters.type === 'All' ||
      (filters.type === 'In-house' && req.type === 'inhouse') ||
      (filters.type === 'Outsourced' && req.type === 'outsourced') ||
      (filters.type === 'Client Work' && req.type === 'client');

    // Billing Status
    let billingMatch = true;
    if (filters.billing !== 'All') {
      if (filters.billing === 'Paid') {
        billingMatch = req.invoiceStatus === 'paid';
      } else if (filters.billing === 'Invoiced') {
        billingMatch = req.invoiceStatus === 'billed';
      } else if (filters.billing === 'Ready to Bill') {
        billingMatch = req.status === 'completed' && !req.invoiceStatus;
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
      req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
  });

  // 2. Apply Status Tab filter
  const finalFilteredReqs = baseFilteredReqs.filter(req => {
    const status = mapRequirementToStatus(req);
    const type = mapRequirementToType(req);
    const role = mapRequirementToRole(req);
    const baseContext = mapRequirementToContext(req, undefined, role);
    const tabContext: TabContext = {
      ...baseContext,
      isArchived: !!req.is_archived,
      approvalStatus: req.approvalStatus,
    };
    const reqTab = getRequirementTab(status, type, role, tabContext);
    return reqTab === activeStatusTab;
  });

  // 3. Apply Sorting
  const sortedRequirements = useMemo(() => {
    const sorted = [...finalFilteredReqs];

    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal: any;
        let bVal: any;

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
            aVal = a.quotedPrice || a.estimatedCost || a.budget || 0;
            bVal = b.quotedPrice || b.estimatedCost || b.budget || 0;
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
            aVal = (a as any)[sortColumn];
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

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
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

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
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
  };

  const toggleSelect = (id: number) => {
    setSelectedReqs(prev => {
      if (prev.includes(id)) {
        return prev.filter(reqId => reqId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleBulkDelete = useCallback(async () => {
    try {
      const deletePromises = selectedReqs.map(id => {
        const req = requirements.find(r => r.id === id);
        if (!req) return Promise.resolve();
        return deleteRequirementMutation.mutateAsync({ id, workspace_id: req.workspaceId || 0 });
      });
      await Promise.all(deletePromises);
      messageApi.success(`Deleted ${selectedReqs.length} requirement(s)`);
      setSelectedReqs([]);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, "Failed to delete requirements"));
    }
  }, [selectedReqs, requirements, deleteRequirementMutation, messageApi]);

  const handleBulkComplete = useCallback(async () => {
    try {
      const updatePromises = selectedReqs.map(id => {
        const req = requirements.find(r => r.id === id);
        if (!req) return Promise.resolve();
        return updateRequirementMutation.mutateAsync({
          id,
          workspace_id: req.workspaceId,
          status: 'Completed',
        } as any);
      });
      await Promise.all(updatePromises);
      messageApi.success(`Marked ${selectedReqs.length} requirement(s) as completed`);
      setSelectedReqs([]);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, "Failed to update requirements"));
    }
  }, [selectedReqs, requirements, updateRequirementMutation, messageApi]);

  const handleBulkApprove = useCallback(async () => {
    try {
      const approvePromises = selectedReqs.map(id =>
        approveRequirementMutation.mutateAsync({ requirement_id: id, status: "Assigned" })
      );
      await Promise.all(approvePromises);
      messageApi.success(`Approved ${selectedReqs.length} requirement(s)`);
      setSelectedReqs([]);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, "Failed to approve requirements"));
    }
  }, [selectedReqs, approveRequirementMutation, messageApi]);

  const handleBulkReject = useCallback(async () => {
    try {
      const rejectPromises = selectedReqs.map(id =>
        approveRequirementMutation.mutateAsync({ requirement_id: id, status: "Rejected" })
      );
      await Promise.all(rejectPromises);
      messageApi.success(`Rejected ${selectedReqs.length} requirement(s)`);
      setSelectedReqs([]);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, "Failed to reject requirements"));
    }
  }, [selectedReqs, approveRequirementMutation, messageApi]);

  const handleBulkSubmit = useCallback(async () => {
    try {
      const updatePromises = selectedReqs.map(id => {
        const req = requirements.find(r => r.id === id);
        if (!req) return Promise.resolve();
        return updateRequirementMutation.mutateAsync({
          id,
          workspace_id: req.workspaceId,
          status: 'Assigned',
        } as any);
      });
      await Promise.all(updatePromises);
      messageApi.success(`Submitted ${selectedReqs.length} requirement(s) for approval`);
      setSelectedReqs([]);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, "Failed to submit requirements"));
    }
  }, [selectedReqs, requirements, updateRequirementMutation, messageApi]);

  const handleBulkReopen = useCallback(async () => {
    try {
      const updatePromises = selectedReqs.map(id => {
        const req = requirements.find(r => r.id === id);
        if (!req) return Promise.resolve();
        return updateRequirementMutation.mutateAsync({
          id,
          workspace_id: req.workspaceId,
          status: 'Assigned',
        } as any);
      });
      await Promise.all(updatePromises);
      messageApi.success(`Reopened ${selectedReqs.length} requirement(s)`);
      setSelectedReqs([]);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, "Failed to reopen requirements"));
    }
  }, [selectedReqs, requirements, updateRequirementMutation, messageApi]);

  const handleBulkAssign = useCallback(async (employee: { user_id?: number; id?: number; name?: string }) => {
    try {
      const updatePromises = selectedReqs.map(id => {
        const req = requirements.find(r => r.id === id);
        if (!req) return Promise.resolve();

        const leaderId = employee?.user_id || employee?.id;
        if (!leaderId) return Promise.resolve();

        return updateRequirementMutation.mutateAsync({
          id,
          workspace_id: req.workspaceId,
          leader_id: leaderId,
        } as any);
      });
      await Promise.all(updatePromises);
      messageApi.success(`Assigned ${employee?.name || 'selected user'} to ${selectedReqs.length} requirement(s)`);
      setSelectedReqs([]);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, "Failed to assign requirements"));
    }
  }, [selectedReqs, requirements, updateRequirementMutation, messageApi]);

  const handleReqAccept = (id: number) => {
    const req = requirements.find(r => r.id === id);
    if (!req) {
      messageApi.error("Requirement not found");
      return;
    }

    setPendingReqId(id);

    // Intelligent routing based on requirement type, status, and user role
    if (req.type === 'outsourced') {
      // RECEIVER ACTIONS (Company B - Vendor)
      if (req.isReceiver) {
        // Scenario 1: Waiting for quote submission OR resubmitting after rejection
        if (req.rawStatus === 'Waiting' || req.rawStatus === 'Rejected') {
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
            workspace_id: req.workspaceId,
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
            workspace_id: req.workspaceId,
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
        const isPendingWorkflow = req.rawStatus === 'Waiting' || (req.rawStatus as string) === 'Review' || req.rawStatus === 'Submitted';
        return isPendingWorkflow || req.approvalStatus === 'pending';
      }).length
    },
    {
      id: 'draft', label: 'Drafts', count: baseFilteredReqs.filter(req => {
        if (req.status === 'draft') return true;
        return false;
      }).length
    },
    {
      id: 'delayed', label: 'Delayed', count: baseFilteredReqs.filter(req => req.status === 'delayed').length
    },
    { id: 'completed', label: 'Completed' },
    {
      id: 'archived', label: 'Archive'
    }
  ];




  const floatingMenuContent = useMemo(() => {
    if (selectedReqs.length === 0) return null;

    return (
      <>
        <div className="flex items-center gap-2 border-r border-white/20 pr-6">
          <div className="bg-[#ff3b3b] text-white text-[12px] font-bold px-2 py-0.5 rounded-full">
            {selectedReqs.length}
          </div>
          <span className="text-[14px] font-['Manrope:SemiBold',sans-serif]">Selected</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Context Aware Actions */}
          {activeStatusTab === 'draft' && (
            <Tooltip title="Submit for Approval">
              <button onClick={handleBulkSubmit} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#4CAF50]">
                <Play className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {activeStatusTab === 'pending' && (
            <>
              <Tooltip title="Approve">
                <button onClick={handleBulkApprove} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#4CAF50]">
                  <CheckCircle className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip title="Reject">
                <button onClick={handleBulkReject} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#ff3b3b]">
                  <XCircle className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}

          {activeStatusTab === 'active' && (
            <Tooltip title="Mark as Completed">
              <button onClick={handleBulkComplete} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#4CAF50]">
                <CheckSquare className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {activeStatusTab === 'completed' && (
            <Tooltip title="Reopen">
              <button onClick={handleBulkReopen} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {/* Common Actions */}
          <Popover
            content={
              <div className="w-48">
                {employeesData?.result && employeesData.result.length > 0 ? (
                  employeesData.result.map((emp: { user_id?: number; id?: number; name?: string }) => (
                    <button
                      key={String(emp.user_id || emp.id || '')}
                      onClick={() => handleBulkAssign(emp)}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 rounded"
                    >
                      {emp.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-[13px] text-[#999999]">
                    No employees available
                  </div>
                )}
              </div>
            }
            trigger="click"
            placement="top"
          >
            <Tooltip title="Assign To">
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Users className="w-4 h-4" />
              </button>
            </Tooltip>
          </Popover>

          <Tooltip title="Delete Requirements">
            <button onClick={handleBulkDelete} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#ff3b3b]">
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>

          <button onClick={() => setSelectedReqs([])} className="ml-2 text-[12px] text-[#999999] hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </>
    );
  }, [selectedReqs, activeStatusTab, employeesData, handleBulkSubmit, handleBulkApprove, handleBulkReject, handleBulkComplete, handleBulkReopen, handleBulkAssign, handleBulkDelete]);

  // Update floating menu with bulk actions
  useEffect(() => {
    setExpandedContent(floatingMenuContent);

    return () => {
      setExpandedContent(null);
    };
  }, [floatingMenuContent, setExpandedContent]);

  return (
    <PageLayout
      title="Requirements"
      titleAction={{
        onClick: handleOpenCreate
      }}
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
            <div className="flex items-center gap-2">
              <Checkbox
                checked={sortedRequirements.length > 0 && selectedReqs.length === sortedRequirements.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedReqs(sortedRequirements.map(r => r.id));
                  } else {
                    setSelectedReqs([]);
                  }
                }}
                className="red-checkbox"
              />
              <span className="text-[13px] text-[#666666] font-['Manrope:Medium',sans-serif]">Select All</span>
            </div>

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

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 animate-pulse">
                  <div className="flex justify-between mb-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-6" />
                  <div className="h-2 w-full bg-[#F0F0F0] rounded-full mb-6" />
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedRequirements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#999999] font-['Inter:Regular',sans-serif]">
                No requirements found
              </p>
            </div>
          ) : (
            <div className="pb-6">
              <ResponsiveMasonry
                columnsCountBreakPoints={{ 350: 1, 750: 2, 1200: 3 }}
              >
                <Masonry gutter="16px">
                  {sortedRequirements.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize).map((requirement) => (
                    <RequirementCard
                      key={requirement.id}
                      requirement={requirement}
                      currentUserId={currentUser?.id}
                      selected={selectedReqs.includes(requirement.id)}
                      onSelect={() => toggleSelect(requirement.id)}
                      onAccept={() => handleReqAccept(requirement.id)}
                      onReject={() => {
                        const req = requirement;
                        if (req.type === 'outsourced') {
                          setPendingReqId(requirement.id);
                          setIsRejectOpen(true);
                        } else {
                          handleReqReject(requirement.id);
                        }
                      }}
                      onEdit={() => handleEditDraft({
                        ...requirement,
                      } as any)}
                      onDelete={() => {
                        const status = mapRequirementToStatus(requirement);
                        const type = mapRequirementToType(requirement);
                        const role = mapRequirementToRole(requirement);
                        const baseContext = mapRequirementToContext(requirement, undefined, role);
                        const tabContext: TabContext = {
                          ...baseContext,
                          isArchived: !!requirement.is_archived,
                          approvalStatus: requirement.approvalStatus,
                        };
                        const tab = getRequirementTab(status, type, role, tabContext);
                        const isActive = tab === 'active' || tab === 'completed' || tab === 'delayed';
                        const isArchived = tab === 'archived';
                        const canDelete = tab === 'draft' || tab === 'pending' || isArchived;

                        if (!canDelete) {
                          // Archive Action
                          modalApi.confirm({
                            title: 'Archive Requirement',
                            content: 'This requirement is active and cannot be permanently deleted. Do you want to archive it instead?',
                            okText: 'Archive',
                            cancelText: 'Cancel',
                            okButtonProps: { className: 'bg-[#F59E0B] hover:bg-[#D97706]' },
                            onOk: () => {
                              updateRequirementMutation.mutate({
                                id: requirement.id,
                                workspace_id: requirement.workspaceId || 0,
                                is_archived: true
                              } as any, {
                                onSuccess: () => messageApi.success("Requirement archived")
                              });
                            },
                          });
                        } else {
                          // Delete Action
                          modalApi.confirm({
                            title: 'Delete Requirement',
                            content: 'Are you sure you want to permanently delete this requirement? This action cannot be undone.',
                            okText: 'Delete',
                            cancelText: 'Cancel',
                            okButtonProps: { danger: true },
                            onOk: () => {
                              deleteRequirement({ id: requirement.id, workspace_id: requirement.workspaceId });
                            },
                          });
                        }
                      }}
                      deleteLabel={(activeStatusTab === 'active' || activeStatusTab === 'completed' || activeStatusTab === 'delayed') ? 'Archive' : 'Delete'}
                      deleteIcon={(activeStatusTab === 'active' || activeStatusTab === 'completed' || activeStatusTab === 'delayed') ? <Archive className="w-3.5 h-3.5" /> : undefined}
                      onDuplicate={() => {
                        handleDuplicateRequirement({
                          ...requirement,
                          workspaceId: requirement.workspaceId,
                        });
                      }}
                      onNavigate={() =>
                        router.push(`/dashboard/workspace/${requirement.workspaceId}/requirements/${requirement.id}`)
                      }
                    />
                  ))}
                </Masonry>
              </ResponsiveMasonry>
            </div>
          )}

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
      <Modal
        open={isDialogOpen}
        destroyOnHidden={true}
        onCancel={() => {
          setIsDialogOpen(false);
          setEditingReq(undefined);
        }}
        footer={null}
        width={700}
        centered
        className="rounded-[16px] overflow-hidden"
        styles={{
          body: {
            padding: 0,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <RequirementsForm
          isEditing={!!editingReq}
          initialData={editingReq ? {
            title: editingReq.title,
            workspace: String(editingReq.workspaceId),
            type: editingReq.type === 'client' ? 'inhouse' : (editingReq.type || 'inhouse') as 'inhouse' | 'outsourced',
            description: editingReq.description || '',
            dueDate: editingReq.dueDate || '',
            is_high_priority: editingReq.is_high_priority,
            contactPerson: editingReq.contactPerson,
            contact_person_id: editingReq.contact_person_id || editingReq.clientId || undefined,
            budget: String(editingReq.budget || ''),
            quoted_price: String(editingReq.quotedPrice || ''),
            currency: editingReq.currency || 'USD',
          } : undefined}
          onSubmit={editingReq ? handleUpdateRequirement : handleCreateRequirement}
          onCancel={() => {
            setIsDialogOpen(false);
            setEditingReq(undefined);
          }}
          workspaces={workspacesData?.result?.workspaces?.map((w: { id: number; name: string }) => ({ id: w.id, name: w.name })) || []}
          isLoading={createRequirementMutation.isPending || updateRequirementMutation.isPending}
        />
      </Modal>

      <QuotationDialog
        open={isQuotationOpen}
        onOpenChange={setIsQuotationOpen}
        onConfirm={handleQuotationConfirm}
        pricingModel={requirements.find(r => r.id === pendingReqId)?.pricingModel as 'hourly' | 'project' | undefined}
      />
      <RejectDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        onConfirm={handleRejectConfirm}
      />
      <InternalMappingModal
        open={isMappingOpen}
        onOpenChange={setIsMappingOpen}
        onConfirm={(workspaceId) => {
          if (!pendingReqId) return;
          updateRequirementMutation.mutate({
            id: pendingReqId,
            workspace_id: allRequirements.find(r => r.id === pendingReqId)?.workspaceId || 0, // Required field
            receiver_workspace_id: workspaceId,
            status: 'In_Progress'
          } as any, {
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

