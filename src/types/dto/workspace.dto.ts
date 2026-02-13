import { WorkspaceStatus } from '../enums';

export interface WorkspaceDto {
  id: number;
  name: string;
  description?: string;
  status?: WorkspaceStatus;
  client_id?: number;
  partner_id?: number;
  start_date?: string;
  end_date?: string;
  in_house?: boolean;
  is_active?: boolean;

  // Counts
  total_count?: number;
  total_task?: number;
  total_task_in_progress?: number;
  total_task_delayed?: number;
  total_task_completed?: number;

  total_requirements?: number;
  in_progress_requirements?: number;
  delayed_requirements?: number;
  task_count?: number;
  in_progress_count?: number;
  delayed_count?: number;
  completed_count?: number;

  partner_name?: string;
  company_name?: string;

  client_user?: { name: string; id?: number };
  client?: { id: number; name: string };
  company?: { id: number; name: string };

  client_company_name?: string;
  assigned_users?: Array<{ name: string; image_url?: string }>;

  // ─── Legacy / Deprecated fields ───────────────────────────────────────────

}

export interface ProjectCommentDto {
  id: number;
  comment: string;
  type: "PROJECT" | "TASK" | "WORKSPACE";
  reference_id: number;
  [key: string]: unknown;
}

export interface CreateWorkspaceRequestDto {
  name: string;
  description?: string;
  status?: string;
  client_id?: number;
  partner_id?: number;
  start_date?: string;
  end_date?: string;
  in_house?: boolean;
}

export interface UpdateWorkspaceRequestDto extends Partial<CreateWorkspaceRequestDto> {
  id: number;
}

