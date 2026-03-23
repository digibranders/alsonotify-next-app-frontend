import { PageLayout } from '../../layout/PageLayout';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useFloatingMenu } from '../../../context/FloatingMenuContext';
import { FilterBar, FilterOption } from '../../ui/FilterBar';

import { ShieldCheck, Briefcase, Download, Trash2, User as UserIcon, Users } from 'lucide-react';
import { EmployeeForm, EmployeeFormData } from '../../modals/EmployeesForm';
import { EmployeeDetailsModal } from '../../modals/EmployeeDetailsModal';
import { EmployeeRow } from './rows/EmployeeRow';
import { PaginationBar } from '../../ui/PaginationBar';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useUpdateEmployeeStatus,
  useRoles,
  useCompanyDepartments,
} from '../../../hooks/useUser';
import { Skeleton } from '../../ui/Skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { CompanyDepartmentType } from '../../../services/user';
import { useTabSync } from '@/hooks/useTabSync';
import { Employee } from '@/types/domain';
import { Checkbox, App, Tooltip } from "antd";
import { UserDto, CreateEmployeeRequestDto, UpdateEmployeeRequestDto } from '@/types/dto/user.dto';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from "../../../lib/queryKeys";
import { getErrorMessage } from '@/types/api-utils';
import { trimStr } from '@/utils/trim';

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const messageRef = useRef(message);
  const modalRef = useRef(modal);

  useEffect(() => {
    messageRef.current = message;
    modalRef.current = modal;
  }, [message, modal]);

  const [activeTab, setActiveTab] = useTabSync<'active' | 'inactive'>({
    defaultTab: 'active',
    validTabs: ['active', 'inactive']
  });

  // Fetch all employees (both active and inactive) to prevent re-fetches on tab switch
  // Filtering by status is done client-side in filteredEmployees useMemo
  const { data: rolesData } = useRoles();
  const { data: departmentsData } = useCompanyDepartments();
  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  const updateEmployeeStatusMutation = useUpdateEmployeeStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    role: 'All',
    department: 'All',
    access: 'All',
    employmentType: 'All'
  });
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);

  const [showAccessDropdown, setShowAccessDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const accessDropdownRef = useRef<HTMLDivElement>(null);
  const departmentDropdownRef = useRef<HTMLDivElement>(null);

  // Construct Query Options for Server-Side Filtering/Pagination
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append('limit', pageSize.toString());
    params.append('skip', ((currentPage - 1) * pageSize).toString());
    params.append('is_active', activeTab === 'active' ? 'true' : 'false');

    if (searchQuery) params.append('name', searchQuery);

    if (filters.role !== 'All') {
      const selectedNames = filters.role.split(',');
      const selectedIds = selectedNames.map(name => {
        const role = rolesData?.result?.find(r => r.name === name.trim());
        return role?.id;
      }).filter(Boolean);

      if (selectedIds.length > 0) {
        params.append('role_id', selectedIds.join(','));
      }
    }

    if (filters.department !== 'All') {
      const selectedNames = filters.department.split(',');
      const selectedIds = selectedNames.map(name => {
        const dept = departmentsData?.result?.find(d => d.name === name.trim());
        return dept?.id;
      }).filter(Boolean);

      if (selectedIds.length > 0) {
        params.append('department_id', selectedIds.join(','));
      }
    }

    if (filters.employmentType !== 'All') {
      params.append('employment_type', filters.employmentType);
    }

    return params.toString();
  }, [currentPage, pageSize, searchQuery, filters, activeTab, rolesData, departmentsData]);

  const { data: employeesData, isLoading } = useEmployees(queryParams);
  const { user: currentUser } = useCurrentUser();

  const totalCount = useMemo(() => {
    // Backend getUsersService returns total_count in each item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (employeesData?.result?.[0] as any)?.total_count || 0;
  }, [employeesData]);

  // Transform backend data to UI format
  const employees = useMemo(() => {
    if (!employeesData?.result) return [];
    return employeesData.result.map((emp: Employee) => {
      let resolvedAccess = emp.access || 'Employee';
      if (rolesData?.result) {
        const currentRoleName = emp.roleName || emp.role || emp.access;
        let foundRole = emp.roleId ? rolesData.result.find((r: { id: number }) => r.id == emp.roleId) : undefined;
        if (!foundRole && currentRoleName) {
          foundRole = rolesData.result.find((r: { name: string }) => r.name.toLowerCase() === currentRoleName.toLowerCase());
        }
        if (foundRole) {
          resolvedAccess = foundRole.name as Employee['access'];
        }
      }

      return {
        ...emp,
        id: Number(emp.id),
        access: resolvedAccess,
      };
    });
  }, [employeesData, rolesData]);

  const paginatedEmployees = employees; // Already paginated by server

  // Derived user role for access control
  const isEmployeeRole = useMemo(() => {
    return currentUser?.role === 'Employee';
  }, [currentUser]);

  // Get unique roles and departments
  const uniqueRoles = useMemo(() => ['All', ...Array.from(new Set(employees.map(emp => emp.role)))], [employees]);

  // Get departments from backend if available, otherwise from employees
  // Get departments from backend if available
  const uniqueDepts = useMemo(() => {
    if (departmentsData?.result && departmentsData.result.length > 0) {
      return ['All', ...departmentsData.result
        .filter((dept: CompanyDepartmentType) => dept.is_active !== false)
        .map((dept: CompanyDepartmentType) => dept.name)];
    }
    // Fallback if no settings found (unlikely but safe)
    return ['All', ...Array.from(new Set(employees.map(emp => emp.department)))];
  }, [departmentsData, employees]);

  // Defined access levels - Dynamic from roles
  const accessOptions = useMemo(() => {
    if (rolesData?.result && rolesData.result.length > 0) {
      return ['All', ...rolesData.result.map((r: { name: string }) => r.name)];
    }
    return ['All'];
  }, [rolesData]);

  const filterOptions: FilterOption[] = [
    {
      id: 'role',
      label: 'Designation',
      options: uniqueRoles,
      placeholder: 'Designation',
      defaultValue: 'All',
      multiSelect: true
    },
    {
      id: 'department',
      label: 'Department',
      options: uniqueDepts,
      placeholder: 'Department',
      defaultValue: 'All',
      multiSelect: true
    },
    {
      id: 'employmentType',
      label: 'Employment Type',
      options: ['All', 'Full-time', 'Contract', 'Part-time'],
      placeholder: 'Employment Type',
      defaultValue: 'All',
      multiSelect: true
    },
    {
      id: 'access',
      label: 'Access Level',
      options: accessOptions,
      placeholder: 'Access Level',
      defaultValue: 'All'
    }
  ];

  const handleFilterChange = useCallback((filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ role: 'All', department: 'All', access: 'All', employmentType: 'All' });
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const handleOpenDialog = (employee?: Employee) => {
    setEditingEmployee(employee || null);
    setIsDialogOpen(true);
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployeeForDetails(employee);
    setIsDetailsModalOpen(true);
  };

  const handleDeactivateEmployee = async (employeeId: number, isCurrentlyActive: boolean) => {
    if (employeeId === currentUserId && isCurrentlyActive) {
      messageRef.current.error("You cannot deactivate your own account.");
      return;
    }

    modalRef.current.confirm({
      title: isCurrentlyActive ? 'Deactivate Employee' : 'Activate Employee',
      content: `Are you sure you want to ${isCurrentlyActive ? 'deactivate' : 'activate'} this employee? ${isCurrentlyActive ? 'They will lose access to the system.' : ''}`,
      okText: isCurrentlyActive ? 'Deactivate' : 'Activate',
      okType: isCurrentlyActive ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk: () => {
        updateEmployeeStatusMutation.mutate(
          {
            user_id: employeeId,
            is_active: !isCurrentlyActive,
          },
          {
            onSuccess: () => {
              messageRef.current.success(`Employee ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully!`);
            },
            onError: (error: Error) => {
              const errorMessage = getErrorMessage(error, "Failed to update employee status");
              messageRef.current.error(errorMessage);
            },
          }
        );
      }
    });
  };

  const handleSaveEmployee = async (data: EmployeeFormData) => {
    const firstName = trimStr(data.firstName);
    const lastName = trimStr(data.lastName);
    const email = trimStr(data.email);
    const designation = trimStr(data.role);
    if (!firstName) {
      messageRef.current.error("First name is required");
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const selectedDepartment = departmentsData?.result?.find(
      (dept: CompanyDepartmentType) => dept.name === trimStr(data.department)
    );
    const departmentId = selectedDepartment?.id || null;

    // Map access level to role_id
    // Prioritize role_id from form if available (most reliable)
    let roleId = data.role_id;
    const roleName = data.access || 'Admin'; // Default to Admin if missing

    if (!roleId) {
      // Fallback: Find by name
      roleId = rolesData?.result?.find((r: { name: string; id: number }) => r.name === roleName)?.id;

      // Fallback: Try case-insensitive match
      if (!roleId && rolesData?.result) {
        roleId = rolesData.result.find((r: { name: string }) => r.name.toLowerCase() === roleName.toLowerCase())?.id;
      }
    }

    // Parse hourly rate (remove $ if present)
    const hourlyRateStr = data.hourly_rates || data.hourlyRate || '';
    const hourlyRate = parseFloat(hourlyRateStr.replace(/[^0-9.]/g, '')) || 0;

    // Parse date of joining
    let dateOfJoining: string | undefined = undefined;
    if (data.dateOfJoining) {
      try {
        const date = new Date(data.dateOfJoining);
        if (!isNaN(date.getTime())) {
          dateOfJoining = date.toISOString();
        }
      } catch {
        // Invalid date format
      }
    }

    // Construct working hours object
    const workingHours = {
      start_time: data.workingHoursStart || "09:00 AM",
      end_time: data.workingHoursEnd || "05:00 PM"
    };

    const countryCode = trimStr(data.countryCode) || "+91";
    let phoneNumber = trimStr(data.phone);
    if (phoneNumber.startsWith(countryCode)) {
      phoneNumber = phoneNumber.replace(countryCode, "").trim();
    }
    const fullMobileNumber = `${countryCode} ${phoneNumber}`.trim();

    if (editingEmployee) {
      const updatePayload: UpdateEmployeeRequestDto = {
        id: editingEmployee.id,
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        email,
        mobile_number: fullMobileNumber,
        designation,
        department_id: departmentId || undefined,
        role_id: roleId,
        experience: Number.parseInt(data.experience) || 0,
        skills: data.skillsets.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0),
        date_of_joining: dateOfJoining,
        salary_yearly: Number.parseFloat(data.salary) || 0,
        hourly_rates: hourlyRate,
        no_of_leaves: Number.parseFloat(data.leaves) || 0,
        working_hours: workingHours,
        employment_type: data.employment_type || data.employmentType,
        manager_id: data.manager_id,
      };

      updateEmployeeMutation.mutate(
        updatePayload,
        {
          onSuccess: () => {
            messageRef.current.success("Employee updated successfully!");
            setIsDialogOpen(false);
            setEditingEmployee(null);
          },
          onError: (error: Error) => {
            const errorMessage = getErrorMessage(error, "Failed to update employee");
            messageRef.current.error(errorMessage);
          },
        }
      );
    } else {
      // Validate role is present
      if (!roleName || !roleId) {
        messageRef.current.error("Please select a valid access level");
        return;
      }

      const createPayload: CreateEmployeeRequestDto = {
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        email,
        mobile_number: fullMobileNumber,
        designation,
        department_id: departmentId || undefined,
        role_id: roleId,
        experience: Number.parseInt(data.experience) || 0,
        skills: data.skillsets.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0),
        date_of_joining: dateOfJoining,
        salary_yearly: Number.parseFloat(data.salary) || 0,
        hourly_rates: hourlyRate,
        no_of_leaves: Number.parseFloat(data.leaves) || 0,
        working_hours: workingHours,
        employment_type: data.employment_type || data.employmentType,
        manager_id: data.manager_id,
      };

      createEmployeeMutation.mutate(
        createPayload,
        {
          onSuccess: () => {
            messageRef.current.success("Employee created successfully!");
            setIsDialogOpen(false);
          },
          onError: (error: Error) => {
            const errorMessage = getErrorMessage(error, "Failed to create employee");
            messageRef.current.error(errorMessage);
          },
        }
      );
    }
  };

  const toggleSelectAll = () => {
    const currentIds = paginatedEmployees.map(e => e.id);
    const allCurrentSelected = currentIds.every(id => selectedEmployees.includes(id));

    if (allCurrentSelected) {
      setSelectedEmployees(selectedEmployees.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedEmployees([...new Set([...selectedEmployees, ...currentIds])]);
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(empId => empId !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };


  // Get current user ID to prevent self-deactivation
  // React Compiler will automatically memoize this derived value
  const currentUserId = currentUser?.id
    ? Number(currentUser.id)
    : (currentUser?.user_id ? Number(currentUser.user_id) : null);

  // Robustly get current user email (API -> LocalStorage)
  // React Compiler will automatically memoize this derived value
  const currentUserEmail = currentUser?.email || null;

  // Bulk update access level
  // React Compiler will automatically memoize this function
  const handleBulkUpdateAccess = async (access: string) => { // access is role name
    if (selectedEmployees.length === 0) {
      messageRef.current.warning('Please select at least one employee');
      return;
    }

    // Find role ID from name
    let selectedRole = rolesData?.result?.find((r: { name: string; id: number }) => r.name === access);
    if (!selectedRole && rolesData?.result) {
      selectedRole = rolesData.result.find((r: { name: string }) => r.name.toLowerCase() === access.toLowerCase());
    }

    if (!selectedRole) {
      messageRef.current.error(`Role "${access}" not found`);
      return;
    }
    const roleId = selectedRole.id;

    // Prepare all update payloads first
    const updatePromises: Promise<unknown>[] = [];
    const failedEmployees: { id: number; name: string; reason: string }[] = [];

    for (const empId of selectedEmployees) {
      // Get employee data to include required fields
      const employee = employees.find(e => e.id === empId);
      if (!employee) {
        failedEmployees.push({ id: empId, name: 'Unknown', reason: 'Employee not found in list' });
        continue;
      }

      // Get raw backend employee data to preserve all fields
      // Access raw data from query cache because useEmployees returns mapped domain objects
      const rawData = queryClient.getQueryData<{ result: UserDto[] }>(queryKeys.users.employees(queryParams));
      const rawEmployee = rawData?.result?.find((emp: UserDto) => {
        const empBackendId = emp.id;
        return empBackendId === empId || empBackendId === parseInt(String(empId));
      });
      if (!rawEmployee) {
        failedEmployees.push({ id: empId, name: employee.name, reason: 'Raw employee data not found' });
        continue;
      }

      // Parse hourly rate from display format (e.g., "200/Hr" -> 200)
      const hourlyRate = employee.hourly_rates && parseInt(String(employee.hourly_rates)) > 0
        ? employee.hourly_rates
        : (rawEmployee.hourly_rates || null);

      // Parse date of joining
      let dateOfJoining = null;
      if (employee.date_of_joining && employee.date_of_joining !== 'N/A') {
        const d = new Date(employee.date_of_joining);
        if (!isNaN(d.getTime())) {
          dateOfJoining = d.toISOString();
        }
      }
      // Fallback to raw employee date
      if (!dateOfJoining && rawEmployee.date_of_joining) {
        const d = new Date(rawEmployee.date_of_joining);
        if (!isNaN(d.getTime())) {
          dateOfJoining = d.toISOString();
        }
      }

      // Ensure working_hours is an object (not null) - backend requires object type
      let workingHours: { start_time: string; end_time: string } | undefined = undefined;
      if (rawEmployee.working_hours && typeof rawEmployee.working_hours === 'object' && !Array.isArray(rawEmployee.working_hours)) {
        workingHours = rawEmployee.working_hours;
      }

      // Build update payload with all preserved fields
      const updatePayload: UpdateEmployeeRequestDto = {
        id: empId,
        name: employee.name, // Required
        email: employee.email, // Required
        role_id: roleId, // Send resolved role ID
        // Preserve all existing fields to prevent them from being set to null
        designation: rawEmployee.designation || undefined,
        mobile_number: (rawEmployee.mobile_number || rawEmployee.phone) || undefined,
        hourly_rates: hourlyRate || undefined,
        salary_yearly: (rawEmployee.salary_yearly || rawEmployee.salary) || undefined,
        experience: Number(rawEmployee.experience) || 0,
        skills: Array.isArray(rawEmployee.skills) ? rawEmployee.skills : [],
        date_of_joining: dateOfJoining || undefined,
        no_of_leaves: rawEmployee.no_of_leaves || undefined,
        // Preserve address fields
        address_line_1: rawEmployee.address_line_1 || undefined,
        address_line_2: rawEmployee.address_line_2 || undefined,
        city: rawEmployee.city || undefined,
        state: rawEmployee.state || undefined,
        zipcode: rawEmployee.zipcode || undefined,
        country: rawEmployee.country || undefined,
        late_time: rawEmployee.late_time || undefined,
        profile_pic: rawEmployee.profile_pic || undefined,
        // Only include working_hours if it's a valid object, otherwise omit it (don't send null)
        ...(workingHours !== undefined ? { working_hours: workingHours } : {}),
      };

      // Create promise for this update using mutateAsync
      const updatePromise = updateEmployeeMutation.mutateAsync(updatePayload).catch((error: unknown) => {
        const errorMsg = getErrorMessage(error, 'Update failed');
        failedEmployees.push({ id: empId, name: employee.name, reason: errorMsg });
        throw error;
      });

      updatePromises.push(updatePromise);
    }

    // Execute all updates and wait for completion
    try {
      const results = await Promise.allSettled(updatePromises);

      // Count successful updates
      const successfulUpdates = results.filter(r => r.status === 'fulfilled').length;
      const totalFailed = failedEmployees.length;
      const totalSelected = selectedEmployees.length;

      if (totalFailed === 0 && successfulUpdates === totalSelected) {
        messageRef.current.success(`Updated access level to ${access} for ${totalSelected} employee(s)`);
        setSelectedEmployees([]);
        setShowAccessDropdown(false);
        // Query invalidation is handled in the hook's onSuccess, but we can force refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.users.employeesRoot() });
        // Also invalidate user details if current user's role was updated
        if (currentUserId && selectedEmployees.includes(currentUserId)) {
          queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
        }
      } else if (successfulUpdates > 0) {
        messageRef.current.warning(`Updated ${successfulUpdates} employee(s), ${totalFailed} failed`);
        // Failed employees logged
      } else {
        messageRef.current.error(`Failed to update all ${totalSelected} employee(s)`);
        // Failed employees logged
      }
    } catch {
      messageRef.current.error('An error occurred during bulk update');
    }
  };

  // Bulk update department
  // React Compiler will automatically memoize this function
  const handleBulkUpdateDepartment = async (departmentName: string) => {
    if (selectedEmployees.length === 0) {
      messageRef.current.warning('Please select at least one employee');
      return;
    }

    const selectedDepartment = departmentsData?.result?.find(
      (dept: CompanyDepartmentType) => dept.name === departmentName
    );

    if (!selectedDepartment || !selectedDepartment.id) {
      messageRef.current.error(`Department "${departmentName}" not found`);
      return;
    }

    const departmentId = selectedDepartment.id;

    // Prepare all update payloads first
    const updatePromises: Promise<unknown>[] = [];
    const failedEmployees: { id: number; name: string; reason: string }[] = [];

    for (const empId of selectedEmployees) {
      // Get employee data to include required fields
      const employee = employees.find(e => e.id === empId);
      if (!employee) {
        failedEmployees.push({ id: empId, name: 'Unknown', reason: 'Employee not found in list' });
        continue;
      }

      // Get raw backend employee data to preserve all fields
      // Access raw data from query cache because useEmployees returns mapped domain objects
      const rawData = queryClient.getQueryData<{ result: UserDto[] }>(queryKeys.users.employees(queryParams));
      const rawEmployee = rawData?.result?.find((emp: UserDto) => {
        const empBackendId = emp.id;
        return empBackendId === empId || empBackendId === parseInt(String(empId));
      });
      if (!rawEmployee) {
        failedEmployees.push({ id: empId, name: employee.name, reason: 'Raw employee data not found' });
        continue;
      }

      // Parse hourly rate from display format (e.g., "200/Hr" -> 200)
      const hourlyRate = employee.hourly_rates && parseInt(String(employee.hourly_rates)) > 0
        ? employee.hourly_rates
        : (rawEmployee.hourly_rates || null);

      // Parse date of joining
      let dateOfJoining = null;
      if (employee.date_of_joining && employee.date_of_joining !== 'N/A') {
        const d = new Date(employee.date_of_joining);
        if (!isNaN(d.getTime())) {
          dateOfJoining = d.toISOString();
        }
      }
      // Fallback to raw employee date
      if (!dateOfJoining && rawEmployee.date_of_joining) {
        const d = new Date(rawEmployee.date_of_joining);
        if (!isNaN(d.getTime())) {
          dateOfJoining = d.toISOString();
        }
      }

      // Ensure working_hours is an object (not null) - backend requires object type
      let workingHours: { start_time: string; end_time: string } | undefined = undefined;
      if (rawEmployee.working_hours && typeof rawEmployee.working_hours === 'object' && !Array.isArray(rawEmployee.working_hours)) {
        workingHours = rawEmployee.working_hours;
      }

      // Resolve current role ID
      let currentRoleId = employee.roleId;
      if (!currentRoleId && employee.access) {
        let foundRole = rolesData?.result?.find((r: { name: string; id: number }) => r.name === employee.access);
        // Robust fallback: Case-insensitive search
        if (!foundRole && rolesData?.result) {
          foundRole = rolesData.result.find((r: { name: string }) => r.name.toLowerCase() === employee.access?.toLowerCase());
        }
        if (foundRole) currentRoleId = foundRole.id;
      }

      // Fallback to null if not found (though update might require it if we don't partial update carefully, 
      // but payload includes all strict fields). 
      // Actually backend updateUserService updates everything passed. If we pass null, it might error.
      // But typically we should keep existing if we can.

      if (!currentRoleId && rawEmployee.user_employee?.role_id) {
        currentRoleId = rawEmployee.user_employee.role_id;
      }

      if (!currentRoleId) {
        failedEmployees.push({ id: empId, name: employee.name, reason: 'Unable to determine current role' });
        continue;
      }

      // Build update payload with all preserved fields
      const updatePayload: UpdateEmployeeRequestDto = {
        id: empId,
        name: employee.name, // Required
        email: employee.email, // Required
        role_id: currentRoleId, // Preserve current role ID
        department_id: departmentId || undefined, // The field we're updating
        // Preserve all existing fields to prevent them from being set to null
        designation: rawEmployee.designation || undefined,
        mobile_number: (rawEmployee.mobile_number || rawEmployee.phone) || undefined,
        hourly_rates: hourlyRate || undefined,
        salary_yearly: (rawEmployee.salary_yearly || rawEmployee.salary) || undefined,
        experience: Number(rawEmployee.experience) || 0,
        skills: Array.isArray(rawEmployee.skills) ? rawEmployee.skills : [],
        date_of_joining: dateOfJoining || undefined,
        no_of_leaves: rawEmployee.no_of_leaves || undefined,
        // Preserve address fields
        address_line_1: rawEmployee.address_line_1 || undefined,
        address_line_2: rawEmployee.address_line_2 || undefined,
        city: rawEmployee.city || undefined,
        state: rawEmployee.state || undefined,
        zipcode: rawEmployee.zipcode || undefined,
        country: rawEmployee.country || undefined,
        late_time: rawEmployee.late_time || undefined,
        profile_pic: rawEmployee.profile_pic || undefined,
        // Only include working_hours if it's a valid object, otherwise omit it (don't send null)
        ...(workingHours !== undefined ? { working_hours: workingHours } : {}),
      };

      // Create promise for this update using mutateAsync
      const updatePromise = updateEmployeeMutation.mutateAsync(updatePayload).catch((error: unknown) => {
        const errorMsg = getErrorMessage(error, 'Update failed');
        failedEmployees.push({ id: empId, name: employee.name, reason: errorMsg });
        throw error; // Re-throw to mark as failed in Promise.allSettled
      });

      updatePromises.push(updatePromise);
    }

    // Execute all updates and wait for completion
    try {
      const results = await Promise.allSettled(updatePromises);

      // Count successful updates
      const successfulUpdates = results.filter(r => r.status === 'fulfilled').length;
      const totalFailed = failedEmployees.length;
      const totalSelected = selectedEmployees.length;

      if (totalFailed === 0 && successfulUpdates === totalSelected) {
        messageRef.current.success(`Updated department to ${departmentName} for ${totalSelected} employee(s)`);
        setSelectedEmployees([]);
        setShowDepartmentDropdown(false);
        // Query invalidation is handled in the hook's onSuccess, but we can force refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.users.employeesRoot() });
      } else if (successfulUpdates > 0) {
        messageRef.current.warning(`Updated ${successfulUpdates} employee(s), ${totalFailed} failed`);
        // Failed employees logged
      } else {
        messageRef.current.error(`Failed to update all ${totalSelected} employee(s)`);
        // Failed employees logged
      }
    } catch {
      messageRef.current.error('An error occurred during bulk update');
    }
  };

  // Export to CSV
  const handleExportToCSV = useCallback(() => {
    if (selectedEmployees.length === 0) {
      messageRef.current.warning('Please select at least one employee');
      return;
    }

    // Get selected employees data - use employees array which contains all employees
    const selectedEmployeesData = employees.filter(emp => selectedEmployees.includes(emp.id));

    if (selectedEmployeesData.length === 0) {
      messageRef.current.error('No employee data found for selected employees');
      return;
    }

    // CSV Headers
    const headers = ['Name', 'Email', 'Role', 'Department', 'Access Level', 'Employment Type', 'Hourly Rate', 'Date of Joining', 'Status'];

    // CSV Rows - escape special characters properly
    const rows = selectedEmployeesData.map(emp => [
      emp.name || '',
      emp.email || '',
      emp.role || '',
      emp.department || '',
      emp.access || '',
      emp.employment_type || 'N/A',
      emp.hourly_rates ? `$${emp.hourly_rates}/Hr` : ('N/A'),
      emp.formattedDateOfJoining || emp.date_of_joining || 'N/A',
      emp.status || ''
    ]);

    // Convert to CSV format with proper escaping
    const escapeCSV = (cell: unknown): string => {
      const str = String(cell || '');
      // Escape quotes by doubling them, and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create blob and download
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up the URL

      messageRef.current.success(`Exported ${selectedEmployeesData.length} employee(s) to CSV`);
    } catch {
      messageRef.current.error('Failed to export employees to CSV');
    }
  }, [selectedEmployees, employees]);

  const performBulkDeactivation = useCallback(async (idsToDeactivate: number[]) => {
    // Prepare all deactivation promises
    const deactivatePromises: Promise<unknown>[] = [];
    const failedEmployees: { id: number; name: string; reason: string }[] = [];

    for (const empId of idsToDeactivate) {
      // Get employee name for error reporting
      const employee = employees.find(e => e.id === empId);
      const employeeName = employee?.name || 'Unknown';

      // Create promise for this deactivation using mutateAsync
      const deactivatePromise = updateEmployeeStatusMutation.mutateAsync({
        user_id: empId,
        is_active: false,
      }).catch((error: unknown) => {
        const errorMsg = getErrorMessage(error, 'Deactivation failed');
        failedEmployees.push({ id: empId, name: employeeName, reason: errorMsg });
        throw error;
      });

      deactivatePromises.push(deactivatePromise);
    }

    // Execute all deactivations and wait for completion
    try {
      const results = await Promise.allSettled(deactivatePromises);

      // Count successful deactivations
      const successfulDeactivations = results.filter(r => r.status === 'fulfilled').length;
      const totalFailed = failedEmployees.length;
      const totalToDeactivate = idsToDeactivate.length;

      if (totalFailed === 0 && successfulDeactivations === totalToDeactivate) {
        messageRef.current.success(`Deactivated ${totalToDeactivate} employee(s)`);
        setSelectedEmployees([]);
        // Query invalidation is handled in the hook's onSuccess
      } else if (successfulDeactivations > 0) {
        messageRef.current.warning(`Deactivated ${successfulDeactivations} employee(s), ${totalFailed} failed`);
        // Failed employees logged
      } else {
        messageRef.current.error(`Failed to deactivate all ${totalToDeactivate} employee(s)`);
        // Failed employees logged
      }
    } catch {
      messageRef.current.error('An error occurred during bulk deactivation');
    }
  }, [updateEmployeeStatusMutation, employees]);

  // Bulk delete/deactivate
  // React Compiler will automatically memoize this function
  const handleBulkDelete = () => {
    if (selectedEmployees.length === 0) {
      messageRef.current.warning('Please select at least one employee');
      return;
    }

    // Robust check for self-selection: Check by ID or Email
    const isSelfSelected = selectedEmployees.some(empId => {
      if (currentUserId && empId === currentUserId) return true;
      // Fallback check by email if ID match fails (rare but safe)
      const emp = employees.find((e: Employee) => e.id === empId);
      return emp?.email && currentUserEmail && emp.email.toLowerCase() === currentUserEmail.toLowerCase();
    });

    // Valid employees to deactivate (filtering out self)
    const employeesToDeactivate = selectedEmployees.filter(empId => {
      if (currentUserId && empId === currentUserId) return false;
      const emp = employees.find(e => e.id === empId);
      return !((emp?.email && currentUserEmail && emp.email.toLowerCase() === currentUserEmail.toLowerCase()));
    });

    // Case 1: Attempting to deactivate ONLY self
    if (isSelfSelected && employeesToDeactivate.length === 0) {
      modalRef.current.warning({
        title: 'Cannot Deactivate Self',
        content: 'You cannot deactivate your own account. Please contact an administrator if you need assistance.',
        okText: 'OK',
      });
      return;
    }

    // Case 2: Self included with others
    if (isSelfSelected && employeesToDeactivate.length > 0) {
      modalRef.current.confirm({
        title: 'Mixed Selection Warning',
        icon: <div className="text-[#ff9900] mr-2"><ShieldCheck size={24} /></div>, // Use icon or standard warning
        content: (
          <div>
            <p className="mb-2">You have selected your own account along with others.</p>
            <p>Your account will be <strong>skipped</strong>. Do you want to proceed with deactivating the other <strong>{employeesToDeactivate.length}</strong> employee(s)?</p>
          </div>
        ),
        okText: 'Yes, Deactivate Others',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => performBulkDeactivation(employeesToDeactivate),
      });
      return;
    }

    // Case 3: Normal deactivation (No self selected)
    modalRef.current.confirm({
      title: 'Deactivate Employees',
      content: `Are you sure you want to deactivate ${employeesToDeactivate.length} employee(s)?`,
      okText: 'Yes, Deactivate',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => performBulkDeactivation(employeesToDeactivate),
    });
  };



  const { setExpandedContent } = useFloatingMenu();

  // Update floating menu with bulk actions
  useEffect(() => {
    if (selectedEmployees.length > 0) {
      setExpandedContent(
        <>
          <div className="flex items-center gap-2 border-r border-white/20 pr-6">
            <div className="bg-[#ff3b3b] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {selectedEmployees.length}
            </div>
            <span className="text-xs font-semibold">Selected</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Update Access Level Button with Dropdown */}
            <div className="relative" ref={accessDropdownRef}>
              <Tooltip
                title="Update Access Level"
                placement="top"
                styles={{ root: { marginBottom: '8px' } }}
              >
                <button
                  onClick={() => setShowAccessDropdown(!showAccessDropdown)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </Tooltip>
              {showAccessDropdown && (
                <div className="absolute bottom-full left-0 mb-6 z-30">
                  {/* Arrow */}
                  <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white"></div>
                  <div className="absolute -bottom-2.5 left-4 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-[#EEEEEE]"></div>
                  {/* Dropdown content */}
                  <div className="bg-white rounded-lg shadow-lg border border-[#EEEEEE] overflow-hidden min-w-[200px]">
                    {[
                      { value: 'Admin', icon: ShieldCheck, color: '#ff3b3b', bgColor: '#FFF5F5' },
                      { value: 'Manager', icon: Briefcase, color: '#2E90FA', bgColor: '#EFF8FF' },
                      { value: 'Leader', icon: Users, color: '#7F56D9', bgColor: '#F9F5FF' },
                      { value: 'Employee', icon: UserIcon, color: '#12B76A', bgColor: '#ECFDF3' },
                    ].map((access) => {
                      const IconComponent = access.icon;
                      return (
                        <button
                          key={access.value}
                          onClick={() => handleBulkUpdateAccess(access.value as 'Admin' | 'Manager' | 'Leader' | 'Employee')}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F7F7] transition-colors text-left"
                        >
                          <div className="p-2 rounded-full" style={{ backgroundColor: access.bgColor }}>
                            <IconComponent className="w-4 h-4" style={{ color: access.color }} />
                          </div>
                          <span className="text-xs font-medium text-[#111111]">
                            {access.value}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Change Department Button with Dropdown */}
            <div className="relative" ref={departmentDropdownRef}>
              <Tooltip
                title="Change Department"
                placement="top"
                styles={{ root: { marginBottom: '8px' } }}
              >
                <button
                  onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Briefcase className="w-4 h-4" />
                </button>
              </Tooltip>
              {showDepartmentDropdown && (
                <div className="absolute bottom-full left-0 mb-6 z-30">
                  {/* Arrow */}
                  <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white"></div>
                  <div className="absolute -bottom-2.5 left-4 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-[#EEEEEE]"></div>
                  {/* Dropdown content */}
                  <div className="bg-white rounded-lg shadow-lg border border-[#EEEEEE] overflow-hidden min-w-[200px] max-h-[300px] overflow-y-auto">
                    {uniqueDepts.filter(dept => dept !== 'All').map((dept) => (
                      <button
                        key={dept}
                        onClick={() => handleBulkUpdateDepartment(dept)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F7F7] transition-colors text-left"
                      >
                        <span className="text-sm font-medium text-[#111111]">
                          {dept}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export Data Button */}
            <Tooltip
              title="Export Data"
              placement="top"
              styles={{ root: { marginBottom: '8px' } }}
            >
              <button
                onClick={handleExportToCSV}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </Tooltip>

            {/* Delete Button */}
            <Tooltip
              title="Delete"
              placement="top"
              styles={{ root: { marginBottom: '8px' } }}
            >
              <button
                onClick={handleBulkDelete}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#ff3b3b]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          <button
            onClick={() => setSelectedEmployees([])}
            className="ml-2 text-xs text-[#999999] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </>
      );
    } else {
      setExpandedContent(null);
    }

    return () => {
      setExpandedContent(null);
    };
  }, [selectedEmployees, showAccessDropdown, showDepartmentDropdown, uniqueDepts, setExpandedContent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageLayout
      title="Employees"
      tabs={[
        { id: 'active', label: 'Active' },
        { id: 'inactive', label: 'Deactivated' }
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => {
        const id = tabId as 'active' | 'inactive';
        setActiveTab(id);
        setCurrentPage(1);
        setSelectedEmployees([]);
      }}
      titleAction={!isEmployeeRole ? {
        onClick: () => handleOpenDialog(),
        label: "Add Employee"
      } : undefined}
    >
      <div className="flex flex-col h-full relative">
        {/* Filters Bar */}
        <div className="mb-2">
          <FilterBar
            filters={filterOptions}
            selectedFilters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            searchPlaceholder="Search by name, role, or skill"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          {/* Table Header */}
          <div className="sticky top-0 z-20 bg-white grid grid-cols-[40px_2fr_1.8fr_1.2fr_1fr_1fr_1.2fr_40px] gap-4 px-4 py-3 mb-2 items-center">
            <div className="flex justify-center">
              <Checkbox
                checked={paginatedEmployees.length > 0 &&
                  paginatedEmployees.every(emp => selectedEmployees.includes(emp.id))}
                onChange={toggleSelectAll}
                className="red-checkbox"
              />
            </div>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Name</p>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Email Address</p>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Access Level</p>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Type</p>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Hourly Rate</p>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Date of Joining</p>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-wider"></p>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[40px_2fr_1.8fr_1.2fr_1fr_1fr_1.2fr_40px] gap-4 px-4 py-4 items-center">
                  <div className="flex justify-center"><Skeleton className="h-4 w-4 rounded" /></div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex justify-center"><Skeleton className="h-4 w-4 rounded" /></div>
                </div>
              ))
            ) : (
              paginatedEmployees.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  selected={selectedEmployees.includes(employee.id)}
                  onSelect={() => toggleSelect(employee.id)}
                  onEdit={() => handleOpenDialog(employee)}
                  onDeactivate={() => handleDeactivateEmployee(employee.id, employee.status === 'active')}
                  onViewDetails={() => handleViewDetails(employee)}
                  currentUserId={currentUserId}
                  currentUserEmail={currentUserEmail}
                />
              ))
            )}
          </div>

          {!isLoading && employees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#999999] font-medium">
                No employees found
              </p>
            </div>
          )}
        </div>

        <div className="bg-white">
          <PaginationBar
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            itemLabel="employees"
          />
        </div>


      </div>

      <EmployeeForm
        open={isDialogOpen}
        onCancel={() => {
          setIsDialogOpen(false);
          setEditingEmployee(null);
        }}
        isEditing={!!editingEmployee}
        initialData={editingEmployee}
        onSubmit={handleSaveEmployee}
        departments={uniqueDepts.filter(d => d !== 'All')}
      />

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        open={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedEmployeeForDetails(null);
        }}
        employee={selectedEmployeeForDetails || null}
        onEdit={() => {
          if (isEmployeeRole) return; // Guard
          setIsDetailsModalOpen(false);
          const currentEmployee = selectedEmployeeForDetails;
          setSelectedEmployeeForDetails(null);
          handleOpenDialog(currentEmployee || undefined);
        }}
      />
    </PageLayout >
  );
}
