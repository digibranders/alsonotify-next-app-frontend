import { UserDto } from '../../types/dto/user.dto';
import { Employee, UserPermissions } from '../../types/domain';
import { formatDateForApi, formatDateForDisplay } from '../date';

export const mapUserDtoToEmployee = (dto: UserDto, permissions?: UserPermissions): Employee => {
  // Strict ID Normalization:
  // Normalize all IDs to the User Table ID (user_id).
  // Some endpoints return UserProfile as root (id = profileId, user_id = userId).
  // Some endpoints return User as root (id = userId).
  const normalizedId = dto.user_id || dto.id;

  // Access Level / Role
  // Allow dto.role to pass through (it might be 'Manager', 'Leader', etc.)
  // Ensure access is treated as string if it comes from DTO
  const accessString = (typeof dto.access === 'string' ? dto.access : undefined)
    || (typeof dto.employee_access === 'string' ? dto.employee_access : undefined)
    || (typeof dto.role === 'string' ? dto.role : undefined)
    || 'Employee';

  const access = accessString as Employee['access'];

  // Employment Type
  let employmentType = dto.employment_type || dto.employmentType || 'Full-time';
  if (employmentType === 'In-house') employmentType = 'Full-time';
  else if (employmentType === 'Freelancer' || employmentType === 'Agency') employmentType = 'Contract';

  // Status
  let status: 'active' | 'inactive' = 'active';
  if (dto.is_active === false) status = 'inactive';
  if (dto.user_employee?.is_active === false) status = 'inactive';

  // Phone
  const phone = dto.mobile_number || dto.phone || dto.user_profile?.mobile_number || dto.user_profile?.phone || dto.user?.mobile_number || '';

  // Dates (Backend sends flat structure from getUsersService)
  const rawDateOfJoining = dto.date_of_joining || dto.user_profile?.date_of_joining || dto.joining_date;

  const dateOfJoining = rawDateOfJoining && rawDateOfJoining !== 'N/A'
    ? formatDateForApi(rawDateOfJoining)
    : 'N/A';

  const formattedDateOfJoining = rawDateOfJoining && rawDateOfJoining !== 'N/A'
    ? formatDateForDisplay(rawDateOfJoining)
    : 'N/A';

  return {
    id: normalizedId,
    user_id: normalizedId,
    userId: normalizedId,
    profileId: dto.user_id ? dto.id : undefined, // Original Profile ID if user_id was the source
    name: dto.name || '',
    role: dto.designation || (typeof dto.role === 'object' ? dto.role?.name : dto.role) || 'Unassigned',
    designation: dto.designation,
    email: dto.email || '',
    phone,
    mobileNumber: phone,
    mobile_number: phone,

    hourlyRate: dto.hourly_rates ? `${dto.hourly_rates}/Hr` : 'N/A',
    hourlyRates: dto.hourly_rates,
    hourly_rates: dto.hourly_rates,

    dateOfJoining,
    formattedDateOfJoining,
    date_of_joining: dto.date_of_joining,
    date_of_birth: dto.date_of_birth,
    employee_id: dto.employee_id,

    experience: dto.experience || 0,
    skillsets: dto.skills?.join(', ') || 'None',
    skills: dto.skills,

    status,
    isActive: status === 'active',
    is_active: status === 'active',

    department: typeof dto.department === 'string' ? dto.department : (dto.department?.name || 'Unassigned'),
    access,
    employeeAccess: access,
    employee_access: access,

    managerName: dto.manager?.name || 'N/A',
    managerId: dto.manager_id || undefined,
    manager_id: dto.manager_id || undefined,

    salary: dto.salary_yearly || dto.salary || dto.user_employee?.salary_yearly || dto.user_employee?.salary || 0,
    currency: dto.currency || 'USD',
    workingHours: dto.workingHours || 0,
    breakTime: Number(dto.working_hours?.break_time) || 0,
    rawWorkingHours: dto.working_hours,
    leaves: dto.leaves || dto.no_of_leaves || 0,

    roleId: dto.role_id || dto.user_employee?.role_id,
    roleColor: dto.roleColor || dto.user_employee?.role?.color,

    roleName: (dto.user_employee as any)?.role?.name || (typeof dto.role === 'object' ? (dto.role as any)?.name : dto.role), // Ensure string

    employmentType,
    employeeType: employmentType,
    employee_type: employmentType,

    profilePic: dto.profile_pic,
    profile_pic: dto.profile_pic,

    userProfile: dto.user_profile,
    user_profile: dto.user_profile,
    user: dto.user,
    userEmployee: dto.user_employee,
    user_employee: dto.user_employee,

    company_id: dto.company_id,
    permissions: permissions || {},
  };
};


