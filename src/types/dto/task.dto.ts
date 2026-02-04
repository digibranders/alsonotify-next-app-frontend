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
  id: number;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  is_high_priority?: boolean;
  workspace_id?: number;
  requirement_id?: number;
  assigned_to?: number;
  member_id?: number;
  leader_id?: number;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  priority?: string;
  estimated_time?: number;
  time_spent?: number;
  execution_mode?: 'parallel' | 'sequential';
  disabled?: boolean;
  is_revision?: boolean;
  revision_round?: number;

  // Relations/Nested objects often returned by different endpoints
  worklogs?: WorklogDto[];
  comments?: CommentDto[];
  task_workspace?: { id: number; name?: string };
  task_requirement?: {
    id: number;
    name?: string;
    sender_company?: { id: number; name: string };
  };
  task_project?: {
    company?: { name: string };
    client_user?: { company?: { name: string } };
  };
  leader_user?: { id: number; name?: string; email?: string; profile_pic?: string };
  member_user?: { id: number; name?: string; email?: string; profile_pic?: string };
  assigned_to_user?: { id: number; name: string };
  task_members?: Array<{
    id: number;
    user_id: number;
    status: string;
    estimated_time: number | null;
    seconds_spent: number;
    active_worklog_start_time?: string | null;
    is_current_turn: boolean;
    queue_order: number;
    execution_mode: 'parallel' | 'sequential';
    user: {
      id: number;
      name: string;
      profile_pic?: string;
    };
  }>;

  // Additional fields observed in usage or responses
  client?: { name: string };
  client_name?: string;
  client_company_name?: string;
  manager_user?: { name: string };
  total_count?: number; // Metadata often mixed in
  total_seconds_spent?: number;
  company?: { name: string };
  company_name?: string;

  // Requirement relations
  requirement_relation?: { name: string; id: number };
  requirement_name?: string;
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
