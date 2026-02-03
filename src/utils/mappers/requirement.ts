import { RequirementDto } from '../../types/dto/requirement.dto';
import { Requirement } from '../../types/domain';

export function mapRequirementToDomain(dto: RequirementDto): Requirement {
  return {
    id: dto.id,
    title: dto.title || dto.name || 'Untitled Requirement',
    name: dto.name || dto.title,
    description: dto.description || '',
    workspaceId: dto.workspace_id || dto.workspaceId || 0,
    workspace_id: dto.workspace_id, // keep compatibility

    // Enum mappings with fallbacks
    type: (dto.type as 'inhouse' | 'outsourced' | 'client') || 'inhouse',
    status: (dto.status as 'in-progress' | 'completed' | 'delayed' | 'draft' | 'Waiting') || 'draft',
    approvalStatus: (dto.approvalStatus as 'pending' | 'approved' | 'rejected') || 'pending',

    company: dto.company || dto.sender_company?.name || null,
    client: dto.client || null,
    assignedTo: Array.isArray(dto.assignedTo) ? dto.assignedTo.map(String) : [],

    dueDate: dto.dueDate || dto.end_date || '',
    createdDate: dto.createdDate || '', // Needs mapping if blank?
    startDate: dto.start_date || '',

    isHighPriority: dto.is_high_priority || dto.priority === 'High',
    is_high_priority: dto.is_high_priority || dto.priority === 'High',

    category: dto.category || '',
    departments: dto.departments,

    progress: dto.progress || 0,
    tasksCompleted: dto.tasksCompleted || 0,
    tasksTotal: dto.tasksTotal || dto.total_task || 0,

    workspace: dto.workspace || '',

    // Financials
    pricingModel: (dto.pricingModel || dto.pricing_model) as 'hourly' | 'project',
    pricing_model: (dto.pricing_model || dto.pricingModel) as 'hourly' | 'project',
    budget: dto.budget,
    estimatedCost: dto.estimatedCost,
    hourlyRate: dto.hourlyRate,
    estimatedHours: dto.estimatedHours,
    quotedPrice: dto.quotedPrice || dto.quoted_price,
    quoted_price: dto.quoted_price,

    // Relations
    contactPerson: dto.contactPerson || dto.contact_person?.name,
    rejectionReason: dto.rejectionReason,
    headerContact: dto.headerContact,
    headerCompany: dto.headerCompany,
    rawStatus: dto.rawStatus || dto.status,

    clientId: dto.client_id,
    client_id: dto.client_id,
    contactPersonId: dto.contact_person_id,
    contact_person_id: dto.contact_person_id,
    senderCompanyId: dto.sender_company_id,
    sender_company_id: dto.sender_company_id,
    receiverCompanyId: dto.receiver_company_id,
    receiver_company_id: dto.receiver_company_id,
    receiverWorkspaceId: dto.receiver_workspace_id,
    receiver_workspace_id: dto.receiver_workspace_id,
    negotiationReason: dto.negotiation_reason,
    negotiation_reason: dto.negotiation_reason,
    isReceiver: dto.isReceiver,
    isSender: dto.isSender,
    receiverProjectId: dto.receiver_project_id,
    receiver_project_id: dto.receiver_project_id,

    receiver_company: dto.receiver_company,
    senderCompany: dto.sender_company,
    sender_company: dto.sender_company,
    createdUser: dto.created_user_data || (typeof dto.created_user === 'object' ? dto.created_user : { name: '', id: Number(dto.created_user || 0) }),
    created_user: dto.created_user_data || (typeof dto.created_user === 'object' ? dto.created_user : { name: '', id: Number(dto.created_user || 0) }),
    createdUserData: dto.created_user_data,
    created_user_data: dto.created_user_data,
    updated_user: dto.updated_user,
    approvedBy: dto.approved_by,
    approved_by: dto.approved_by,
    invoice: dto.invoice,
    invoiceId: dto.invoice_id,
    invoice_id: dto.invoice_id,
    // contactPerson already handled above
    contact_person: dto.contact_person,

    // Snake case aliases - Ensure stricter type compliance
    manager: dto.manager,
    leader: dto.leader,
    department: undefined,

    leaderUser: dto.leader_user ? { ...dto.leader_user, name: dto.leader_user.name || null } : undefined,
    leader_user: dto.leader_user ? { ...dto.leader_user, name: dto.leader_user.name || null } : undefined,
    managerUser: dto.manager_user ? { ...dto.manager_user, name: dto.manager_user.name || null } : undefined,
    manager_user: dto.manager_user ? { ...dto.manager_user, name: dto.manager_user.name || null } : undefined,

    documentLink: dto.document_link,
    document_link: dto.document_link,

    totalTasks: dto.total_task,
    total_task: dto.total_task,

    // Add snake_case aliases for dates to ensure UI compatibility
    start_date: dto.start_date || (dto as { startDate?: string }).startDate || '',
    end_date: dto.end_date || (dto as { dueDate?: string }).dueDate || ''
  };
}

export const mapRequirementDtoToDomain = mapRequirementToDomain;
