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

  // Computed / aggregated
  total_task?: number;
  total_tasks?: number;
  tasks_completed?: number;
  total_count?: number;

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

export interface RequirementDropdownItem {
  id: number;
  name: string;
  type: string;
  status: string;
  workspace_id: number;
  receiver_workspace_id: number | null;
  receiver_company_id: number | null;
}

