export interface Employee {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  hourlyRate: string;
  dateOfJoining: string;
  experience: string | number;
  skillsets: string;
  status: 'active' | 'inactive';
  department: string;
  access: 'Admin' | 'Manager' | 'Leader' | 'Employee';
  managerName?: string;
  salary: number;
  currency: string;
  workingHours: number;
  leaves: number;
  roleId?: number;
  roleColor?: string;
  employmentType?: string;
  rawWorkingHours?: Record<string, any>;
  profile_pic?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  timezone?: string;
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

export interface Task {
  id: string;
  name: string;
  taskId: string;
  client: string;
  project: string;
  leader: string;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  estTime: number;
  timeSpent: number;
  activities: number;
  status: 'impediment' | 'in-progress' | 'completed' | 'todo' | 'delayed';
  is_high_priority: boolean;
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

export interface Requirement {
  id: number;
  title: string;
  description: string;
  company?: string;
  client: string;
  departments?: string[];
  assignedTo: string[];
  startDate?: string;
  createdDate?: string;
  dueDate: string;
  is_high_priority: boolean;
  type?: 'inhouse' | 'outsourced';
  status: 'in-progress' | 'completed' | 'delayed';
  category?: string;
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  workspaceId?: number; // Optional as per RequirementsPage usage
  workspace?: string; // String name for display
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  subTasks?: SubTask[];
}

export interface Workspace {
  id: number;
  name: string;
  taskCount: number;
  client: string;
  status: 'active' | 'inactive';
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
  [key: string]: unknown; // Keeping unknown for safety instead of any
}

export interface CompanyUpdateInput {
  name: string;
  address?: string;
  website?: string;
  logo?: string;
  tax_id?: string;
  tax_id_type?: string;
  [key: string]: unknown;
}
