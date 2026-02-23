import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmployees,
  getUserById,
  getPartners,
  createUser,
  updateUserById,
  getUserDetails,
  updateCurrentUserProfile,
  updateCurrentUserPassword,
  getCompanyDepartments,
  updateUserStatus,
  inviteUser,
  updateCurrentUserCompany,
  getCurrentUserCompany,
  getRoles,
  upsertRole,
  getRolePermissions,
  updateRolePermissions,
  // updatePassword,
} from "../services/user";
import { UserDto, RoleDto, CreateEmployeeRequestDto, UpdateEmployeeRequestDto, UpdateUserProfileRequestDto } from "../types/dto/user.dto";
import { ApiResponse } from "../types/api";
import { Employee, UserPermissions, CompanyUpdateInput } from "../types/domain";
import { mapUserDtoToEmployee } from "../utils/mappers/user";
import { queryKeys } from "../lib/queryKeys";

const selectEmployees = (data: ApiResponse<UserDto[]>): ApiResponse<Employee[]> => {
  if (!data) return data as any;
  return {
    ...data,
    result: data.result ? data.result.map((user: UserDto) => mapUserDtoToEmployee(user)) : []
  } as ApiResponse<Employee[]>;
};

export const useEmployees = (options: string = "") => {
  return useQuery({
    queryKey: queryKeys.users.employees(options),
    queryFn: () => getEmployees(options),
    staleTime: 5 * 1000, // 5 seconds
    select: selectEmployees
  });
};

const selectEmployee = (data: ApiResponse<UserDto>): ApiResponse<Employee> => ({
  ...data,
  result: data.result ? mapUserDtoToEmployee(data.result) : undefined as any
});

// Search partners dropdown
export const useSearchPartners = (search?: string) => {
  return useQuery({
    queryKey: ['users', 'partners', 'dropdown', { search }],
    queryFn: () => getPartners(search || ""),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.result?.map(u => ({ label: u.name, value: u.id })) || []
  });
};

export const useEmployeesDropdown = (search?: string) => {
  return useQuery({
    queryKey: queryKeys.users.employees('dropdown', search),
    queryFn: async () => {
      // We import searchEmployees dynamically or assume it's available.
      // Based on file read, searchEmployees IS in services/user.ts
      const { searchEmployees } = await import('../services/user');
      return searchEmployees(search || "limit=1000");
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => (data.result || []).map((item: any) => ({
      id: item.value,
      name: item.label
    }))
  });
};

export const useEmployee = (id: number) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => getUserById(id),
    enabled: !!id,
    select: selectEmployee
  });
};

export const usePartners = (options: string = "") => {
  return useQuery({
    queryKey: queryKeys.users.partners(options),
    queryFn: () => getPartners(options),
    staleTime: 5 * 1000,
  });
};

export const useOutsourcePartners = (options: string = "") => {
  return useQuery({
    queryKey: queryKeys.users.partners(options),
    queryFn: () => getPartners(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};


// ...

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateEmployeeRequestDto) => createUser(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.employeesRoot() });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEmployeeRequestDto) => updateUserById(data.id, data),
    onSuccess: (_, variables) => {
      // Invalidate all employee queries (both active and inactive)
      queryClient.invalidateQueries({ queryKey: queryKeys.users.employeesRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
      // Also invalidate user details if updating current user's own data
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateUserProfileRequestDto) => updateCurrentUserProfile(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: (params: { password: string, currentPassword?: string }) => updateCurrentUserPassword(params),
  });
};

export const useCompanyDepartments = () => {
  return useQuery({
    queryKey: queryKeys.company.departments(),
    queryFn: getCompanyDepartments,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateEmployeeStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { user_id: number; is_active: boolean }) => updateUserStatus(params),
    onSuccess: () => {
      // Invalidate all employee queries (both active and inactive) when status changes
      queryClient.invalidateQueries({ queryKey: queryKeys.users.employeesRoot() });
    },
  });
};

const selectUserDetails = (data: ApiResponse<{ user: UserDto; access: UserPermissions }>): ApiResponse<Employee> => {
  if (!data) return data as any;
  return {
    ...data,
    result: data.result ? mapUserDtoToEmployee(data.result.user, data.result.access) : undefined as any
  };
};

export const useUserDetails = () => {
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: () => getUserDetails(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: selectUserDetails
  });
};

// Invite user
export const useInviteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { email: string; requestSentFor: string }) =>
      inviteUser(params.email, params.requestSentFor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.clients() });
    },
  });
};

// Create client
export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateEmployeeRequestDto) => createUser(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.clients() });
    },
  });
};

// Get current user company
export const useCurrentUserCompany = () => {
  return useQuery({
    queryKey: queryKeys.users.company(),
    queryFn: () => getCurrentUserCompany(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update company details
export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CompanyUpdateInput) => updateCurrentUserCompany(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.company() });
      queryClient.invalidateQueries({ queryKey: queryKeys.company.departments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
};
// Get all roles
export const useRoles = () => {
  return useQuery({
    queryKey: queryKeys.roles.all(),
    queryFn: () => getRoles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};



export const useRolePermissions = (roleId: number | null) => {
  return useQuery({
    queryKey: queryKeys.roles.permissions(roleId),
    queryFn: () => getRolePermissions(roleId!),
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpsertRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Partial<RoleDto>) => upsertRole(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all() });
    },
  });
};

export const useUpdateRolePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, actions }: { roleId: number; actions: number[] }) =>
      updateRolePermissions(roleId, actions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.permissions(variables.roleId) });
    },
  });
};

// End of file

