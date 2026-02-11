/**
 * Centralized Domain Types
 * 
 * This file contains the core domain entities used across the UI.
 * It replaces scattered local interfaces and 'any' usages.
 */

export interface Requirement {
  id: number;
  title: string;
  name?: string;
  description: string;
  company: string | null;
  client: string | null;
  assignedTo: string[];
  dueDate: string;
  createdDate: string;
  startDate?: string;
  isHighPriority?: boolean;
  is_high_priority: boolean;
  type: 'inhouse' | 'outsourced' | 'client' | 'Client work' | 'Client Work';
  status: 'in-progress' | 'completed' | 'delayed' | 'draft' | 'Waiting' | 'archived' | 'Archived' | 'Submitted' | 'Rejected' | 'Revision' | 'On_Hold' | 'Assigned' | 'Review' | 'Impediment' | 'Stuck' | 'Pending';
  category: string;
  departments?: string[];
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  workspaceId: number;
  workspace_id?: number;
  workspace: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  invoiceStatus?: 'unbilled' | 'billed' | 'paid';
  estimatedCost?: number;
  budget?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  pricingModel?: 'hourly' | 'requirement' | 'project';
  contactPerson?: string;
  rejectionReason?: string;
  headerContact?: string;
  // workspace_id?: number; // defined via camelCase above with alias
  headerCompany?: string;
  quotedPrice?: number;
  currency?: string;
  rawStatus?: string;
  clientId?: number;
  client_id?: number;
  contactPersonId?: number;
  contact_person_id?: number;
  senderCompanyId?: number;
  sender_company_id?: number;
  receiverCompanyId?: number;
  receiver_company_id?: number;
  receiver_company?: { name: string; id: number };
  receiverWorkspaceId?: number;
  receiver_workspace_id?: number;
  negotiationReason?: string;
  negotiation_reason?: string;
  is_archived?: boolean;
  isReceiver?: boolean;
  isSender?: boolean;
  receiverProjectId?: number;
  receiver_project_id?: number;

  // These fields might be needed based on usage in other files, 
  // keeping them optional for now as we discover them
  projectId?: number;
  project_id?: number;
  manager?: { name: string; id?: number };
  leader?: { name: string; id?: number };
  department?: { name: string; id?: number };

  // Backend fields used in RequirementDetailsPage (snake_case)
  pricing_model?: 'hourly' | 'project'; // covered by pricingModel
  start_date?: string; // covered by startDate
  endDate?: string;
  end_date?: string;
  quoted_price?: number; // covered by quotedPrice
  totalTask?: number;
  total_task?: number;
  leaderUser?: { name: string | null; id?: number; avatar?: string };
  leader_user?: { name: string | null; id?: number; avatar?: string };
  managerUser?: { name: string | null; id?: number; avatar?: string };
  manager_user?: { name: string | null; id?: number; avatar?: string };
  senderCompany?: { name: string; id?: number };
  sender_company?: { name: string; id?: number };
  documentLink?: string;
  document_link?: string;

  // Expanded fields for UI usage
  // 'title' is already defined above
  totalTasks?: number;
  total_tasks?: number; // Backend alias
  // sender_company already defined above
  createdUser?: { name: string; id: number };
  created_user?: { name: string; id: number };
  createdUserData?: { name: string; id: number };
  created_user_data?: { name: string; id: number };
  updated_user?: number;
  approvedBy?: { id: number; name?: string };
  approved_by?: { id: number; name?: string };
  invoice?: { status: string; id?: number };
  invoiceId?: number;
  invoice_id?: number;
  // contactPerson: ... defined above
  contact_person?: { name: string; id: number };
}

// Backend enum only (Prisma TaskStatus). Re-export from workflow for single source of truth.
export type TaskStatus = 'Assigned' | 'In_Progress' | 'Completed' | 'Delayed' | 'Impediment' | 'Review' | 'Stuck';

export interface Task {
  id: string;
  name: string;
  taskId: string;
  client: string | null;
  project: string | null;
  leader: string | null;
  assignedTo: string | { name: string; id: number } | null;
  startDate: string;
  dueDate: string;
  estTime: number;
  timeSpent: number;
  activities: number;
  status: TaskStatus;
  isHighPriority?: boolean;
  is_high_priority: boolean;
  timelineDate: string;
  timelineLabel: string;
  // For date-range filtering
  dueDateValue: number | null;
  // For editing
  workspaceId?: number;
  workspace_id?: number;
  requirementId?: number;
  requirement_id?: number;
  memberId?: number;
  member_id?: number;
  leaderId?: number;
  leader_id?: number;
  description?: string;
  endDateIso?: string; // Raw ISO string for form editing
  executionMode?: 'parallel' | 'sequential';
  execution_mode?: 'parallel' | 'sequential';
  totalSecondsSpent: number;
  total_seconds_spent: number;
  taskMembers?: {
    id: number;
    userId: number;
    user_id: number;
    status: string;
    estimatedTime: number | null;
    estimated_time: number | null;
    secondsSpent: number;
    seconds_spent: number;
    activeWorklogStartTime?: string | null;
    active_worklog_start_time?: string | null;
    isCurrentTurn: boolean;
    is_current_turn: boolean;
    queueOrder: number;
    queue_order: number;
    executionMode: 'parallel' | 'sequential';
    execution_mode: 'parallel' | 'sequential';
    user: {
      id: number;
      name: string;
      profilePic?: string;
      profile_pic?: string;
    };
  }[];
  task_members?: {
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
  }[];
  // Expanded fields for UI usage
  start_date?: string;
  end_date?: string;
  estimatedTime?: number;
  estimated_time?: number;
  // timeSpent already defined as number
  // removing duplicate definition if it persists
  time_spent?: number;
  worklogs?: Array<{ id: number; timeSpent: number; time_spent: number }>;
  company?: { name: string; id?: number };
  companyName?: string;
  company_name?: string;
  clientCompanyName?: string;
  client_company_name?: string; // Added for TasksPage
  title?: string; // Added for TasksPage compatibility

  // Relations used in TasksPage
  taskProject?: {
    clientUser?: { company?: { name: string } };
    client_user?: { company?: { name: string } };
    company?: { name: string };
    companyName?: string;
    company_name?: string;
  };
  task_project?: {
    client_user?: { company?: { name: string } };
    company?: { name: string };
    company_name?: string;
  };
  memberUser?: { name: string | null; id: number; profilePic?: string; profile_pic?: string };
  member_user?: { name: string | null; id: number; profile_pic?: string };
  leaderUser?: { name: string | null; id: number; profilePic?: string; profile_pic?: string };
  leader_user?: { name: string | null; id: number; profile_pic?: string };
  assignedToUser?: { name: string | null; id: number };
  assigned_to_user?: { name: string | null; id: number };
  // assignedTo already defined as string, but UI usage suggests object or string
  // Changing base definition to union
  assigned_to?: { name: string; id: number } | string; // Sometimes string in older parts

  // Requirement relation aliases
  taskRequirement?: { name: string; id: number };
  task_requirement?: { name: string; id: number; sender_company?: { name: string; id?: number } };
  requirementRelation?: { name: string; id: number };
  requirement_relation?: { name: string; id: number };
  requirementName?: string;
  requirement_name?: string;
  requirement?: { name: string; id: number };
  subtasks?: Task[];
  steps?: any[];
}

export interface Workspace {
  id: number;
  name: string;
  taskCount?: number;
  inProgressCount?: number;
  delayedCount?: number;
  completedCount?: number;
  totalRequirements?: number;
  inProgressRequirements?: number;
  delayedRequirements?: number;
  status: string;
  isActive: boolean;
  description?: string;
  partnerId?: number;
  partner_id?: number;
  inHouse?: boolean;
  in_house?: boolean;
  partnerName?: string;
  partner_name?: string;
  companyName?: string;
  company_name?: string;
  client?: { id: number; name: string | null } | null;
  client_user?: { id: number; name: string | null } | null;
  company?: { id: number; name: string } | null;
  // Additional fields used in ProjectCard
  clientCompanyName?: string;
  client_company_name?: string;
  endDate?: string;
  end_date?: string;
  assignedUsers?: { name: string; imageUrl?: string; image_url?: string }[];
  assigned_users?: { name: string; image_url?: string }[];
  totalTask?: number;
  total_task?: number;
  totalTaskCompleted?: number;
  total_task_completed?: number;
}

export interface Employee {
  id: number;
  profileId?: number; // Original Profile ID (if distinct from User ID)
  name: string;
  role: string;
  roleName?: string; // Robust role name from role object
  email: string;
  phone: string;
  hourlyRate: string;
  dateOfJoining: string;
  date_of_birth?: string;
  experience: number | string; // UI uses string or number sometimes
  skillsets: string;
  status: 'active' | 'inactive';
  department: string;
  access: 'Admin' | 'Manager' | 'Leader' | 'Employee';
  managerName?: string;
  managerId?: number;
  manager_id?: number;
  salary: number;
  currency: string;
  workingHours: number;
  breakTime: number;
  leaves: number;
  roleId?: number;
  roleColor?: string;
  employmentType?: string; // 'Full-time' | 'Contract' etc
  rawWorkingHours?: Record<string, unknown>; // Keeping loose for now as backend object structure varies
  profilePic?: string;
  profile_pic?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  timezone?: string;

  // Extended fields for EmployeesPage mapping
  userId?: number;
  user_id?: number;
  designation?: string;
  mobileNumber?: string;
  mobile_number?: string;
  userProfile?: {
    mobile_number?: string;
    phone?: string;
    date_of_birth?: string;
    employee_id?: string;
    designation?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    gender?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
    currency?: string;
    skills?: string[];
    emergency_contact?: any;
    working_hours?: any;
    date_of_joining?: string;
    experience?: number;
    hourly_rates?: number;
    no_of_leaves?: number;
    profile_pic?: string;
  };
  user_profile?: {
    mobile_number?: string;
    phone?: string;
    date_of_birth?: string;
    employee_id?: string;
  };
  user?: { mobile_number?: string; phone?: string };
  hourlyRates?: number;
  hourly_rates?: number;
  // dateOfJoining defined above
  date_of_joining?: string;
  formattedDateOfJoining?: string;
  skills?: string[];
  userEmployee?: { isActive?: boolean; is_active?: boolean };
  employeeType?: string;
  employee_type?: string;
  employeeAccess?: string;
  employee_access?: string;
  company_id?: number;
  isActive?: boolean;
  is_active?: boolean;
  employee_id?: string;
  documents?: any[];
  permissions?: UserPermissions;
  user_employee?: {
    is_active?: boolean;
    role?: any;
    role_id?: number | null;
  };
}

export type UserPermissions = Record<string, Record<string, boolean>>;

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date | string;
  end: Date | string;
  type: string;
  // Add more as we refactor CalendarPage
  [key: string]: unknown;
}

export interface Holiday {
  id: number | string;
  name: string;
  date: string;
  isApi?: boolean;
  is_api?: boolean;
  isDeleted?: boolean;
  is_deleted?: boolean;
}

export interface Department {
  id: string | number;
  name: string;
  active?: boolean;
  isActive?: boolean;
  is_active?: boolean;
}

export interface Role {
  id: number;
  name: string;
  color?: string;
  description?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  profilePic?: string;
  profile_pic?: string;
  mobileNumber?: string;
  mobile_number?: string;
  isActive?: boolean;
  is_active?: boolean;
  company?: { id: number; name: string };
  department?: { id: number; name: string };
}

export interface ChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
  order: number;
  indentLevel: number;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: number;
  userId: number;
  user_id: number;
  companyId: number;
  company_id: number;
  title: string;
  type: 'TEXT_NOTE' | 'CHECKLIST_NOTE';
  color: string;
  isPinned?: boolean;
  isArchived: boolean;
  is_archived: boolean;
  labels?: string[];
  createdAt: string;
  created_at: string;
  updatedAt?: string;
  updated_at?: string;
  content?: string;
  items?: ChecklistItem[];
}
