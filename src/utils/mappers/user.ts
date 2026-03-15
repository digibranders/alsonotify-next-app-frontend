import { UserDto } from '../../types/dto/user.dto';
import { Employee, UserPermissions } from '../../types/domain';
import { formatDateForApi, formatDateForDisplay } from '../date/date';

export const mapUserDtoToEmployee = (dto: UserDto, permissions?: UserPermissions): Employee => {
  // Strict ID Normalization:
  // Normalize all IDs to the User Table ID (user_id).
  // Some endpoints return UserProfile as root (id = profileId, user_id = userId).
  // Some endpoints return User as root (id = userId).
  const normalizedId = dto.user_id || dto.id;

  // Access Level / Role
  // Allow dto.role to pass through (it might be 'Manager', 'Leader', etc.)
  // Ensure access is treated as string if it comes from DTO
  const accessString = (typeof dto.role === 'string' ? dto.role : (typeof dto.role === 'object' ? dto.role?.name : undefined))
    || (typeof dto.employee_access === 'string' ? dto.employee_access : undefined)
    || 'Employee';

  const access = accessString as Employee['access'];

  // Employment Type
  let employmentType = dto.employment_type || 'Full-time';
  if (employmentType === 'In-house') employmentType = 'Full-time';
  else if (employmentType === 'Freelancer' || employmentType === 'Agency') employmentType = 'Contract';

  // Status
  let status: 'active' | 'inactive' = 'active';
  if (dto.is_active === false) status = 'inactive';
  if (dto.user_employee?.is_active === false) status = 'inactive';

  // Phone
  const rawUserProfile = dto.user_profile;
  const userProfileObj = Array.isArray(rawUserProfile) ? rawUserProfile[0] : (rawUserProfile as any) || {};

  const phone = dto.mobile_number || dto.phone || userProfileObj?.mobile_number || userProfileObj?.phone || dto.user?.mobile_number || '';

  // Dates (Backend sends flat structure from getUsersService)
  const rawDateOfJoining = dto.date_of_joining || userProfileObj?.date_of_joining || (dto.user_employee as any)?.date_of_joining;

  let profilePic = dto.profile_pic 
    || userProfileObj?.profile_pic 
    || (dto as any).user?.profile_pic 
    || (dto as any).user_employee?.user?.profile_pic;

  if (profilePic === 'null' || profilePic === 'undefined') {
    profilePic = null;
  }

  const dateOfJoining = rawDateOfJoining && rawDateOfJoining !== 'N/A'
    ? formatDateForApi(rawDateOfJoining)
    : 'N/A';

  const formattedDateOfJoining = rawDateOfJoining && rawDateOfJoining !== 'N/A'
    ? formatDateForDisplay(rawDateOfJoining)
    : 'N/A';

  return {
    ...dto,
    id: normalizedId,
    user_id: normalizedId,
    profileId: dto.user_id ? dto.id : undefined,
    name: dto.name || '',
    role: dto.designation || (typeof dto.role === 'object' ? dto.role?.name : dto.role) || 'Unassigned',
    designation: dto.designation,
    email: dto.email || '',
    phone,
    mobile_number: phone,

    date_of_joining: dateOfJoining,
    formattedDateOfJoining,
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
    employee_access: access,

    salary: dto.salary_yearly || dto.salary || dto.user_employee?.salary_yearly || dto.user_employee?.salary || 0,
    currency: dto.user_profile?.currency || 'USD',
    working_hours: dto.working_hours,

    roleId: dto.role_id || dto.user_employee?.role_id,


    roleName: dto.user_employee?.role?.name || (typeof dto.role === 'object' ? dto.role.name : dto.role),

    employment_type: employmentType,

    hourly_rates: dto.hourly_rates || undefined,

    profile_pic: profilePic,

    user_profile: userProfileObj,
    user_employee: dto.user_employee,

    company_id: dto.company_id,
    association_id: dto.association_id,
    permissions: permissions || {},

    // New fields
    emergencyContactName: userProfileObj?.emergency_contact?.name || null,
    emergencyContactPhone: userProfileObj?.emergency_contact?.phone || null,
  };
};
