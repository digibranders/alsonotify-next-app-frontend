/**
 * Auth and User Session related types
 */

export interface LoginResponse {
  token: string;
  user: SessionUser;
  // refreshing_token?: string; // Add if needed
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface CompanyLeaveSetting {
  id: string | number;
  name: string;
  count: number;
}

export interface CompanyProfile {
  id?: number;
  name: string;
  address?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  website?: string;
  logo?: string;
  email?: string;
  phone?: string;
  description?: string;
  industry?: string;
  size?: string;
  tax_id?: string;
  tax_id_type?: string;
  timezone?: string;
  currency?: string;
  country?: string;
  default_employee_password?: string;
  account_type?: string;
  account_managers?: Array<{
    id: number;
    name: string;
    email: string;
    user_profile?: {
      designation?: string;
      profile_pic?: string;
    };
    role?: {
      name: string;
      color?: string;
    };
  }>;

  leaves?: CompanyLeaveSetting[];
  working_hours?: {
    start_time?: string;
    end_time?: string;
    working_days?: string[];
    break_time?: string;
    [key: string]: unknown;
  };
  founded?: string;
  // Add flexible index signature only if absolutely needed, but prefer explicit typing
  [key: string]: unknown;
}
