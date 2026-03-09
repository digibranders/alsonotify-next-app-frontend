import { TaskStatus, ExecutionMode } from '../enums';

// Nested types
export interface WorklogDto {
  id: number;
  task_id: number;
  user_id: number;
  hours?: number;
  time_in_seconds?: number;
  description?: string;
  date?: string;
  start_datetime?: string;
  end_datetime?: string;
  created_user?: number;
  created_at?: string;
  // Fields present when fetched via active-timer
  task_name?: string;
  project_name?: string;
  workspace_name?: string;
}

export type ActiveTimerResponseDto = WorklogDto | null;

export type RevisionResponseDto = TaskDto;

export interface CommentDto {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface TaskDto {
  title: string;
  id: number;
  name: string;
  description?: string | null;
  status?: TaskStatus;
  start_date?: string;
  end_date?: string | null;
  estimated_time?: number | null;
  workspace_id?: number;
  requirement_id?: number | null;
  leader_id?: number | null;
  member_id?: number | null;
  execution_mode?: ExecutionMode;
  is_high_priority?: boolean;
  is_active?: boolean;
  is_revision?: boolean;
  revision_round?: number;
  is_review_task?: boolean;
  review_for_task_id?: number | null;
  parent_id?: number | null;
  disabled?: boolean;
  document_link?: string | null;
  company_id?: number;
  created_user?: number | null;
  created_at?: string;
  updated_at?: string | null;

  // Computed / aggregated
  time_spent?: number;
  total_seconds_spent?: number;
  task_project?: { company?: { name: string } | null } | null;

  // Relations
  task_workspace?: { 
    id: number; 
    name: string | null;
    company?: { name: string };
    partner?: { company: string };
  } | null;
  task_requirement?: {
    id: number;
    name: string | null;
    sender_company?: { id: number; name: string } | null;
  } | null;
  leader_user?: { id: number; name: string | null; email?: string; profile_pic?: string | null } | null;
  member_user?: { id: number; name: string | null; email?: string; profile_pic?: string | null } | null;
  manager_user?: { id: number; name: string | null; email?: string; profile_pic?: string | null } | null;
  task_members?: Array<{
    id: number;
    user_id: number;
    status: string;
    estimated_time: number | null;
    queue_order: number;
    execution_mode: ExecutionMode;
    is_current_turn: boolean;
    seconds_spent: number;
    active_worklog_start_time: string | null;
    user: {
      id: number;
      name: string | null;
      profile_pic?: string | null;
    };
  }>;
  company?: { id: number; name: string } | null;
  subtasks?: Array<{
    id: number;
    name: string;
    start_date: string;
    estimated_time: number | null;
    status: TaskStatus;
    member_user: {
      id: number;
      name: string | null;
    } | null;
  }>;
  worklogs?: WorklogDto[];
  total_count?: number; // API pagination metadata attached to rows

  // ─── Legacy / Deprecated fields ───────────────────────────────────────────

}

export interface AssignedTaskDetailDto {
  estimated_time: number; // in hours
  worked_time: number; // in seconds
  status: string;
  worked_sessions: number;
  task_worklog?: {
    id: number | null;
    task_id: number;
    description: string;
    end_datetime: string | null;
    start_datetime: string;
    time_in_seconds: number | null;
  } | null;
}

export interface CreateTaskRequestDto {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  assigned_to?: number;
  workspace_id?: number;
  requirement_id?: number;
  parent_task_id?: number;
  estimated_time?: number;
  is_high_priority?: boolean;
  member_id?: number;
  leader_id?: number;
  assigned_members?: number[];
  execution_mode?: 'parallel' | 'sequential';
}

export interface UpdateTaskRequestDto extends Partial<CreateTaskRequestDto> {
  id: number;
}

