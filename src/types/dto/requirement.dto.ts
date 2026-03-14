import { PricingModel, RequirementStatus } from '../enums';

export interface RequirementDto {
  id: number;
  name?: string | null;
  description?: string | null;
  status?: RequirementStatus;
  workspace_id?: number;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  quoted_price?: number | null;
  pricing_model?: PricingModel | null;
  currency?: string | null;
  priority?: string | null;
  type?: string | null;
  is_high_priority?: boolean | null;
  is_archived?: boolean;
  is_deleted?: boolean;
  rejection_reason?: string | null;
  negotiation_reason?: string | null;
  document_link?: string | null;
  hourly_rate?: number | null;
  estimated_cost?: number | null;
  estimated_hours?: number | null;
  total_billed?: number | null;

  // Foreign keys
  sender_company_id?: number | null;
  receiver_company_id?: number | null;
  receiver_workspace_id?: number | null;
  contact_person_id?: number | null;
  leader_id?: number | null;
  manager_id?: number | null;
  department_id?: number | null;
  parent_id?: number | null;
  approved_by?: number | null;
  created_user?: number | { name: string; id: number } | null;
  updated_user?: number | null;
  company_id?: number;
  created_at?: string;
  updated_at?: string | null;
  completed_at?: string | null;

  // Submission / Approval / Revision fields
  submission_remark?: string | null;
  submission_at?: string | null;
  approval_remark?: string | null;
  approval_rating?: number | null;
  approved_at?: string | null;
  revision_remark?: string | null;
  revision_round?: number;

  // Computed / aggregated
  total_task?: number;
  total_tasks?: number;
  tasks_completed?: number;
  completed_tasks?: number;
  total_count?: number;
  progress?: number;
  status_counts?: Record<string, number>;

  // Relations
  sender_company?: { name: string; id?: number } | null;
  receiver_company?: { name: string; id: number } | null;
  workspace?: { id: number; name: string | null } | null;
  leader_user?: { id: number; name: string | null; avatar?: string | null } | null;
  manager_user?: { id: number; name: string | null; avatar?: string | null } | null;
  contact_person?: {
    id: number;
    name: string | null;
    user_profile?: {
      name: string | null;
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  created_user_data?: { id: number; name: string | null; avatar?: string | null } | null;
  approved_by_user?: { id: number; name: string | null; avatar?: string | null } | null;
  invoice?: { id: number; status: string } | null;
  invoice_id?: number;
  company?: string | null;
  client?: string | null;

  // Advance billing fields
  advance_invoice_id?: number | null;
  advance_amount?: number | null;
  advance_received?: number;
  advance_invoice?: {
    id: number;
    status: string;
    invoice_number: string;
    total: number;
    amount_received: number;
  } | null;

  // ─── Legacy / Deprecated fields ───────────────────────────────────────────

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
  sender_company_id?: number;
}

export interface UpdateRequirementRequestDto extends Partial<CreateRequirementRequestDto> {
  id: number;
  is_archived?: boolean;
}

export interface SubmitForReviewRequestDto {
  remark?: string | null;
  attachment_ids?: number[];
}

export interface ApproveRequirementRequestDto {
  requirement_id: number;
  status: 'Assigned' | 'Rejected' | 'Completed' | 'Revision';
  workspace_id?: number;
  rejection_reason?: string | null;
  approval_remark?: string | null;
  approval_rating?: number | null;
  revision_remark?: string | null;
  revision_attachment_ids?: number[];
}

export interface RequirementDropdownItem {
  id: number;
  name: string;
  type: string;
  status: string;
  workspace_id: number;
  receiver_workspace_id: number | null;
  receiver_company_id: number | null;
}

