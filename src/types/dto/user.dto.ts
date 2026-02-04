export interface UserDto {
  id: number;
  name: string;
  email: string;
  phone?: string;
  mobile_number?: string;
  designation?: string;
  is_active?: boolean;
  role?: string | { id?: number; name: string; color?: string };
  role_id?: number;
  roleColor?: string;
  status?: string;
  date_of_birth?: string;
  employee_id?: string;

  // Nested structure often found in employee responses
  user_employee?: {
    is_active?: boolean;
    role_id?: number;
    role?: { color?: string };
    salary?: number;
    salary_yearly?: number;
  };

  department_id?: number;
  department?: { id: number; name: string } | string; // Sometimes string in some responses
  manager_id?: number | null;
  manager?: { id: number; name: string };

  employment_type?: string;
  salary_yearly?: number;
  salary?: number;
  hourly_rates?: number;
  working_hours?: {
    start_time: string; end_time: string;
    break_time?: string | number
  };
  no_of_leaves?: number;
  joining_date?: string;
  experience?: string | number;
  skills?: string[];
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  profile_pic?: string;
  date_of_joining?: string;
  late_time?: string;

  // Other observed fields
  employmentType?: string;
  access?: string;
  employee_access?: string;
  employee_type?: string;
  currency?: string;
  leaves?: number;
  workingHours?: number;
  user_profile?: {
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
  user?: { mobile_number?: string; phone?: string }; // Nested user object sometimes returned
  company?: string | { id: number; name: string }; // Company name (from ClientOrOutsourceType) or object
  company_id?: number;
  companies?: { id: number; name: string }[];

  partner_company?: { name: string; id?: number };

  // Partner specific fields
  association_id?: number;
  partner_user_id?: number;
  invite_id?: number;
  associated_date?: string;
  timezone?: string;
  user_id?: number;
}

export type UserAccessDto = Record<string, Record<string, boolean>>;

// Role types for access management
export interface RoleDto {
  id?: number;
  name: string;
  color?: string;
}

export interface PermissionActionDto {
  id: number;
  name: string;
  assigned: boolean;
}

export interface ModuleActionGroupDto {
  module: string;
  actions: PermissionActionDto[];
}

export interface CreateEmployeeRequestDto {
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile_number?: string;
  password?: string;
  department_id?: number;
  role_id?: number;
  designation?: string;
  employment_type?: string;
  salary?: number;
  salary_yearly?: number;
  hourly_rates?: number;
  date_of_joining?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  working_hours?: {
    start_time: string;
    end_time: string;
    break_time?: string | number;
  };
  no_of_leaves?: number;
  experience?: string | number;
  skills?: string[];
  manager_id?: number;
  profile_pic?: string;
  late_time?: string;
}

export interface UpdateEmployeeRequestDto extends Partial<CreateEmployeeRequestDto> {
  id: number;
  is_active?: boolean;
}

export interface UpdateUserProfileRequestDto {
  name?: string;
  email?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  designation?: string;
  mobile_number?: string;
  phone?: string;
  date_of_birth?: string | null;
  gender?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  profile_pic?: string;
  currency?: string;
  employee_id?: string;
  skills?: string[];
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}
