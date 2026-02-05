
import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";
import { CompanyUpdateInput } from "../types/genericTypes";
import { CompanyProfile } from "../types/auth";
import { UserDto, RoleDto, ModuleActionGroupDto, CreateEmployeeRequestDto, UpdateEmployeeRequestDto, UpdateUserProfileRequestDto, UserAccessDto } from "../types/dto/user.dto";

// Get user details
// Get user details
export const getUserDetails = async (): Promise<ApiResponse<{ user: UserDto; access: UserAccessDto }>> => {
  const { data } = await axiosApi.get<ApiResponse<{ user: UserDto; access: UserAccessDto }>>("/user/details");
  return data;
};

// Create user/employee
export const createUser = async (params: CreateEmployeeRequestDto): Promise<ApiResponse<UserDto>> => {
  const { data } = await axiosApi.post<ApiResponse<UserDto>>("/user/create", params);
  return data;
};

// Update user by ID
export const updateUserById = async (id: number, params: UpdateEmployeeRequestDto): Promise<ApiResponse<UserDto>> => {
  const { data } = await axiosApi.put<ApiResponse<UserDto>>(`/user/update/${id}`, params);
  return data;
};

// Get employees
export const getEmployees = async (options: string = ""): Promise<ApiResponse<UserDto[]>> => {
  const { data } = await axiosApi.get<ApiResponse<UserDto[]>>(`/user?${options}`);
  return data;
};

// Get user by id
export const getUserById = async (id: number): Promise<ApiResponse<UserDto>> => {
  const { data } = await axiosApi.get<ApiResponse<UserDto>>(`/user/${id}`);
  return data;
};

// Get partners (using UserDto as base since structure is similar enough for listing)
// Or we could define a specific PartnerDto if needed, but UserDto is flexible.
// Checking ClientOrOutsourceType: id, name, email, company, phone, country. All in UserDto now.
export const getPartners = async (options: string = ""): Promise<ApiResponse<UserDto[]>> => {
  const { data } = await axiosApi.get<ApiResponse<UserDto[]>>(
    `/user/partners${options ? `?${options}` : ""}`
  );
  return data;
};

// Invite user (partner)
export const inviteUser = async (email: string, requestSentFor: string) => {
  const { data } = await axiosApi.post("/user/invite", {
    email,
    requestSentFor: requestSentFor,
  });
  return data;
};

// Search partners dropdown
export const searchPartners = async (search?: string): Promise<ApiResponse<{ label: string; value: number }[]>> => {
  const params = search ? { search } : {};
  const { data } = await axiosApi.get<ApiResponse<{ label: string; value: number }[]>>(`/user/partners/dropdown`, { params });
  return data;
};

// Search employees dropdown
export const searchEmployees = async (search?: string): Promise<ApiResponse<{ label: string; value: number }[]>> => {
  const params = search ? { search } : {};
  const { data } = await axiosApi.get<ApiResponse<{ label: string; value: number }[]>>(`/user/user-dropdown`, { params });
  return data;
};

// Update user profile
export const updateCurrentUserProfile = async (
  params: UpdateUserProfileRequestDto
): Promise<ApiResponse<UserDto>> => {
  // Ensure mobile_number is sent if phone is provided
  const payload = {
    ...params,
    mobile_number: params.mobile_number || params.phone,
  };
  const { data } = await axiosApi.post<ApiResponse<UserDto>>(`/user/profile`, payload);
  return data;
};

// Update user password
export const updateCurrentUserPassword = async (params: { password: string, currentPassword?: string }): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosApi.post<ApiResponse<unknown>>(`/user/password`, params);
  return data;
};

// Get company details
export const getCurrentUserCompany = async (): Promise<ApiResponse<CompanyProfile>> => {
  const { data } = await axiosApi.get<ApiResponse<CompanyProfile>>(`/user/company`);
  return data;
};

// Update company details
export const updateCurrentUserCompany = async (params: CompanyUpdateInput): Promise<ApiResponse<CompanyProfile>> => {
  const { data } = await axiosApi.post<ApiResponse<CompanyProfile>>(`/user/company`, params);
  return data;
};

// Get company departments
export interface CompanyDepartmentType {
  id?: number | null;
  name: string;
  company_id: number;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  is_deleted?: boolean;
}

export const getCompanyDepartments = async (): Promise<ApiResponse<CompanyDepartmentType[]>> => {
  const { data } = await axiosApi.get<ApiResponse<CompanyDepartmentType[]>>(`/user/company/departments-dropdown`);
  return data;
};

// Update user status (activate/deactivate)
export const updateUserStatus = async (params: { user_id: number; is_active: boolean }): Promise<ApiResponse<UserDto>> => {
  const { data } = await axiosApi.patch<ApiResponse<UserDto>>(`/user/update/status`, params);
  return data;
};

// Update partner status (activate/deactivate)
export const updatePartnerStatus = async (params: { association_id: number; is_active: boolean }): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosApi.patch<ApiResponse<unknown>>(`/user/partners/status`, params);
  return data;
};

// Get all roles
export const getRoles = async (): Promise<ApiResponse<{ id: number; name: string }[]>> => {
  const { data } = await axiosApi.get<ApiResponse<{ id: number; name: string }[]>>(`/role`);
  return data;
};

// Accept invitation
export const acceptInvitation = async (token: string) => {
  const { data } = await axiosApi.post("/auth/accept-invite", { token });
  return data;
};

// Create or update role
export const upsertRole = async (params: Partial<RoleDto>): Promise<ApiResponse<RoleDto>> => {
  const { data } = await axiosApi.put<ApiResponse<RoleDto>>("/role", params);
  return data;
};

// Get permissions for a role
export const getRolePermissions = async (roleId: number): Promise<ApiResponse<ModuleActionGroupDto[]>> => {
  const { data } = await axiosApi.get<ApiResponse<ModuleActionGroupDto[]>>(`/role/${roleId}/actions`);
  return data;
};

// Update permissions for a role
export const updateRolePermissions = async (roleId: number, actions: number[]): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosApi.put<ApiResponse<unknown>>(`/role/${roleId}/actions`, { actions });
  return data;
};

// Get received invites
export const getReceivedInvites = async (): Promise<ApiResponse<{
  id: number;
  inviterName: string;
  inviterCompany: string;
  inviterImage: string | null;
  type: string;
  date: string
}[]>> => {
  try {
    const { data } = await axiosApi.get("/user/invites/received");
    return data;
  } catch (error) {
    // Gracefully handle missing endpoint or server errors
    console.warn('Failed to fetch received invites:', error);
    return { success: true, message: 'No invites', result: [] };
  }
};

// Accept invite by ID
export const acceptInviteById = async (inviteId: number): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosApi.post("/user/invite/accept-id", { inviteId });
  return data;
};

// Decline invite by ID
export const declineInviteById = async (inviteId: number): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosApi.post("/user/invite/decline-id", { inviteId });
  return data;
};

// Delete partner (or cancel request)
export const deletePartner = async (params: { userType: 'PARTNER'; partnerUserId?: number; inviteId?: number }): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosApi.delete<ApiResponse<unknown>>("/user/partners", { data: params });
  return data;
};
