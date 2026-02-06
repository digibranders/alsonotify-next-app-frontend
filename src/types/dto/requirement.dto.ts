export interface RequirementDto {
  id: number;
  title: string;
  name?: string; // Payload often sends name
  description?: string;
  workspace_id: number;
  status?: string;
  priority?: string;
  pricing_model?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  quoted_price?: number;
  currency?: string;
  total_task?: number;
  updated_user?: number;
  created_user?: number | { name: string; id: number }; // Accommodate both scalar and object

  sender_company_id?: number;
  sender_company?: { name: string; id?: number };

  leader_user?: { name: string; id?: number; avatar?: string };
  manager?: { name: string; id?: number };
  leader?: { name: string; id?: number };
  manager_user?: { name: string; id?: number; avatar?: string };

  document_link?: string;
  is_high_priority?: boolean;
  assignedTo?: string[] | any[]; // DTOs may be loose here initially if backend is inconsistent

  // Observed in RequirementsPage
  company?: string;
  client?: string;
  dueDate?: string;
  createdDate?: string;
  type?: string;
  category?: string;
  departments?: string[];
  department?: { name: string; id: number };
  progress?: number;
  tasksCompleted?: number;
  tasksTotal?: number;
  workspaceId?: number;
  workspace?: string;
  approvalStatus?: string;
  invoiceStatus?: string;
  estimatedCost?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  pricingModel?: string;
  contactPerson?: string;
  rejectionReason?: string;
  headerContact?: string;
  headerCompany?: string;
  quotedPrice?: number;
  rawStatus?: string;
  client_id?: number;
  contact_person_id?: number;
  receiver_company_id?: number;
  receiver_workspace_id?: number;
  negotiation_reason?: string;
  isReceiver?: boolean;
  isSender?: boolean;
  receiver_project_id?: number;

  // Relations
  receiver_company?: { name: string; id: number };
  created_user_data?: { name: string; id: number };
  approved_by?: { id: number; name?: string };
  invoice?: { status: string; id?: number };
  invoice_id?: number;
  contact_person?: { name: string; id: number };
  is_archived?: boolean;
}

export interface CreateRequirementRequestDto {
  title?: string;
  name?: string;
  description?: string;
  workspace_id: number;
  project_id?: number;
  priority?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  pricing_model?: string;
  type?: string;
  contact_person_id?: number;
  receiver_company_id?: number;
  is_high_priority?: boolean;
  contact_person?: string;
  estimated_hours?: number;
  quoted_price?: number;
  rejection_reason?: string;
  currency?: string;
  leader_id?: number;
  receiver_workspace_id?: number;
}

export interface UpdateRequirementRequestDto extends Partial<CreateRequirementRequestDto> {
  id: number;
  is_archived?: boolean;
}

/**
 * Requirement dropdown item returned by the /requirement/:workspace_id/requirement/dropdown endpoint
 */
export interface RequirementDropdownItem {
  id: number;
  name: string;
  type: string;
  status: string;
  workspace_id: number;
  receiver_workspace_id: number | null;
  receiver_company_id: number | null;
}
