import {
  TaskStatus,
  RequirementStatus,
  PricingModel,
  WorkspaceStatus,
  EmployeeStatus,
  RequirementType,
  ExecutionMode
} from '@/types/enums';

import { RequirementDto } from './dto/requirement.dto';
import { TaskDto } from './dto/task.dto';
import { WorkspaceDto } from './dto/workspace.dto';
import { UserDto } from './dto/user.dto';

export type {
  TaskStatus,
  RequirementStatus,
  PricingModel,
  WorkspaceStatus,
  EmployeeStatus,
  RequirementType,
  ExecutionMode
};

export type PartnerStatus = 'active' | 'inactive' | 'pending';

export interface Partner extends Omit<UserDto, 'association_id'> {
  association_id?: number;
  company: string; // Business Name
  type: 'INDIVIDUAL' | 'ORGANIZATION';
  status: PartnerStatus;
  requirements: number;
  onboarding: string;
  logo_url?: string;
  rawStatus?: string;
  isOrgAccount?: boolean;
  partner_user_id?: number;
}

export interface Requirement extends Omit<RequirementDto, 'workspace' | 'status' | 'name' | 'title' | 'contact_person'> {
  title: string;
  name: string;
  // Flattened for UI display
  workspace: string;
  company: string | null | undefined;
  client: string | null | undefined;
  assignedTo: string[];
  startDate?: string;
  is_high_priority: boolean;

  /** @deprecated use end_date */
  dueDate?: string;
  /** @deprecated use created_at */
  createdDate?: string;

  status: RequirementStatus | 'in-progress' | 'completed' | 'delayed' | 'draft' | 'archived';
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  receiver_project_id?: number | null;

  // UI fields
  isSender?: boolean;
  isReceiver?: boolean;
  approvalStatus?: string;
  rawStatus?: string;
  invoice_status?: 'paid' | 'billed';
  headerContact?: string;
  headerCompany?: string;
  category?: string;
  completed_at?: string | null;


  departments?: string[];
  contact_person?: UserDto | string | null;
  // Relations and snake_case fields are now inherited from RequirementDto
}

export interface Client {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  status: 'active' | 'inactive';
  requirements: number;
  onboarding: string;
}

export interface SubTask {
  id: string;
  name: string;
  taskId: string;
  assignedTo: string;
  dueDate: string;
  status: 'impediment' | 'in-progress' | 'completed' | 'todo' | 'delayed';
  type?: 'task' | 'revision';
}

// Backend enum only (Prisma TaskStatus). Re-export from workflow for single source of truth.
// export type TaskStatus = ... (imported from enums)

export interface Task extends Omit<TaskDto, 'id' | 'name' | 'title'> {
  id: string; // Alias for id (stringified in domain)
  taskId: string; // Alias for id (stringified)
  name: string;
  client: string | null;
  project: string | null;
  leader: string | null;
  assignedTo: string | { name: string; id: number } | null;
  startDate: string;
  dueDate: string;
  estTime: number;
  timeSpent: number;
  activities: number;
  timelineDate: string;
  timelineLabel: string;
  // For date-range filtering
  dueDateValue: number | null;

  // UI computed
  totalSecondsSpent: number;
  type?: 'task' | 'revision';

  // Relations and snake_case fields are now inherited from TaskDto
}

export interface Workspace extends WorkspaceDto {
  is_active: boolean;

  // UI Specific display fields
  partner_name?: string;
  company_name?: string;

  // Relations and snake_case counts are now inherited from WorkspaceDto
}

export interface Employee extends Omit<UserDto, 'working_hours'> {
  profileId?: number;
  role: string;
  roleName?: string;
  experience: number | string;
  skillsets: string;
  status: EmployeeStatus;
  department: string;
  access: 'Admin' | 'Manager' | 'Leader' | 'Employee';
  salary: number;
  currency: string;
  roleId?: number;
  roleColor?: string;
  profilePic?: string;
  bio?: string;
  isActive?: boolean;
  emergency_contact?: string;
  permissions?: UserPermissions;
  documents?: UserDocument[];

  // Standardized snake_case (matching UserDto)
  date_of_joining?: string;
  hourly_rate?: string;
  working_hours?: UserDto['working_hours'] | number; // Allow number if it's used as such in some contexts
  break_time?: number | string;
  leaves_count?: number;
  employment_type?: string;
  hourly_rates?: number;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  formattedDateOfJoining?: string | null;
  timezone?: string;

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

export interface DocumentType {
  id: string;
  name: string;
  required: boolean;
}

export interface UserDocument {
  id: string;
  documentTypeId: string;
  documentTypeName: string;
  fileName: string;
  fileSize: number; // in bytes
  fileUrl: string;
  uploadedDate: string;
  fileType: 'image' | 'pdf' | 'docx' | 'excel' | 'powerpoint' | 'csv' | 'text' | 'code' | 'archive' | 'audio' | 'video' | '3d' | 'font' | 'ebook' | 'design';
  isRequired: boolean;
}

export interface ProfileUpdateInput {
  name: string;
  email: string;
  phone?: string;
  mobile_number?: string;
  designation?: string;
  [key: string]: unknown;
}

export interface CompanyUpdateInput {
  name: string;
  address?: string;
  website?: string;
  logo?: string;
  tax_id?: string;
  tax_id_type?: string;
  account_manager_ids?: number[];
  [key: string]: unknown;
}
