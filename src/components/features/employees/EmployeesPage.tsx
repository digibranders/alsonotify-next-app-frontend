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
  useUserDetails,
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

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();

  const [activeTab, setActiveTab] = useTabSync<'active' | 'inactive'>({
    defaultTab: 'active',
    validTabs: ['active', 'inactive']
  });

  // Fetch all employees (both active and inactive) to prevent re-fetches on tab switch
  // Filtering by status is done client-side in filteredEmployees useMemo
  const queryParams = useMemo(() => {
    // No is_active filter - fetch all employees for flicker-free tab switching
    return '';
  }, []);

  const { data: rolesData } = useRoles();
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
  const [showAccessDropdown, setShowAccessDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const accessDropdownRef = useRef<HTMLDivElement>(null);
  const departmentDropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);

  const { data: employeesData, isLoading } = useEmployees(queryParams);
  const { data: departmentsData } = useCompanyDepartments();
  const { user: currentUser } = useCurrentUser();
  useUserDetails();

  // Transform backend data to UI format
  const employees = useMemo(() => {
    if (!employeesData?.result) return [];
    return employeesData.result.map((emp: Employee) => {
      // Resolve access name dynamically from rolesData if available
      let resolvedAccess = emp.access || 'Employee';
      if (rolesData?.result) {
        // Use the normalized roleName if available, or fall back to role/access
        const currentRoleName = emp.roleName || emp.role || emp.access;

        // Try precise ID match first (robust against string/number types)
        let foundRole = emp.roleId ? rolesData.result.find((r: { id: number }) => r.id == emp.roleId) : undefined;

        // If not found by ID, try finding by name (case-insensitive)
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

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: Employee) => {
      const matchesTab = emp.status === activeTab;
      const matchesSearch = searchQuery === '' ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.skillsets.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filters.role === 'All' || emp.role === filters.role;
      const matchesDept = filters.department === 'All' || emp.department === filters.department;

      // Handle "Employee" display mapping for "Member" role
      const matchesAccess = filters.access === 'All' ||
        (filters.access === 'Employee'
          ? (emp.access === 'Employee')
          : emp.access === filters.access);

      const matchesType = filters.employmentType === 'All' ||
        (filters.employmentType === 'Full-time' && (emp.employmentType === 'Full-time' || emp.employmentType === 'In-house')) ||
        (filters.employmentType === 'Contract' && (emp.employmentType === 'Contract' || emp.employmentType === 'Freelancer' || emp.employmentType === 'Agency')) ||
        (filters.employmentType === 'Part-time' && emp.employmentType === 'Part-time') ||
        (filters.employmentType !== 'All' && emp.employmentType === filters.employmentType);

      return matchesTab && matchesSearch && matchesRole && matchesDept && matchesAccess && matchesType;
    });
  }, [employees, activeTab, searchQuery, filters]);

  // Pagination
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

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
      defaultValue: 'All'
    },
    {
      id: 'department',
      label: 'Department',
      options: uniqueDepts,
      placeholder: 'Department',
      defaultValue: 'All'
    },
    {
      id: 'employmentType',
      label: 'Employment Type',
      options: ['All', 'Full-time', 'Contract', 'Part-time'],
      placeholder: 'Employment Type',
      defaultValue: 'All'
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
      message.error("You cannot deactivate your own account.");
      return;
    }

    modal.confirm({
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
              message.success(`Employee ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully!`);
            },
            onError: (error: Error) => {
              const errorMessage = getErrorMessage(error, "Failed to update employee status");
              message.error(errorMessage);
            },
          }
        );
      }
    });
  };

  const handleSaveEmployee = async (data: EmployeeFormData) => {
    if (!data.firstName) {
      message.error("First name is required");
      return;
    }

    const fullName = `${data.firstName} ${data.lastName}`.trim();

    // Find department ID from name
    const selectedDepartment = departmentsData?.result?.find(
      (dept: CompanyDepartmentType) => dept.name === data.department
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
    const hourlyRate = parseFloat(data.hourlyRate.replace(/[^0-9.]/g, '')) || 0;

    // Parse date of joining
    let dateOfJoining = new Date().toISOString();
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

    // Construct full mobile number with country code
    const countryCode = data.countryCode || "+91";
    // Ensure phone number doesn't already have the code if user typed it
    let phoneNumber = data.phone;
    if (phoneNumber.startsWith(countryCode)) {
      phoneNumber = phoneNumber.replace(countryCode, "").trim();
    }
    const fullMobileNumber = `${countryCode} ${phoneNumber}`.trim();

    if (editingEmployee) {
      const updatePayload: UpdateEmployeeRequestDto = {
        id: editingEmployee.id,
        name: fullName,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        mobile_number: fullMobileNumber,
        designation: data.role,
        department_id: departmentId || undefined,
        role_id: roleId,
        experience: Number.parseInt(data.experience) || 0,
        skills: data.skillsets.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0),
        date_of_joining: dateOfJoining,
        salary_yearly: Number.parseFloat(data.salary) || 0,
        hourly_rates: hourlyRate,
        no_of_leaves: Number.parseFloat(data.leaves) || 0,
        working_hours: workingHours,
        employment_type: data.employmentType,
        manager_id: data.manager_id,
      };

      updateEmployeeMutation.mutate(
        updatePayload,
        {
          onSuccess: () => {
            message.success("Employee updated successfully!");
            setIsDialogOpen(false);
            setEditingEmployee(null);
          },
          onError: (error: Error) => {
            const errorMessage = getErrorMessage(error, "Failed to update employee");
            message.error(errorMessage);
          },
        }
      );
    } else {
      // Validate role is present
      if (!roleName || !roleId) {
        message.error("Please select a valid access level");
        return;
      }

      const createPayload: CreateEmployeeRequestDto = {
        name: fullName,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        mobile_number: fullMobileNumber,
        designation: data.role,
        department_id: departmentId || undefined,
        role_id: roleId,
        experience: Number.parseInt(data.experience) || 0,
        skills: data.skillsets.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0),
        date_of_joining: dateOfJoining,
        salary_yearly: Number.parseFloat(data.salary) || 0,
        hourly_rates: hourlyRate,
        no_of_leaves: Number.parseFloat(data.leaves) || 0,
        working_hours: workingHours,
        employment_type: data.employmentType,
        manager_id: data.manager_id,
      };

      createEmployeeMutation.mutate(
        createPayload,
        {
          onSuccess: () => {
            message.success("Employee created successfully!");
            setIsDialogOpen(false);
          },
          onError: (error: Error) => {
            const errorMessage = getErrorMessage(error, "Failed to create employee");
            message.error(errorMessage);
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
  // Get current user ID to prevent self-deactivation
  const currentUserId = currentUser?.id
    ? Number(currentUser.id)
    : (currentUser?.user_id ? Number(currentUser.user_id) : null);

  // Robustly get current user email (API -> LocalStorage)
  const currentUserEmail = currentUser?.email || null;

  // Bulk update access level
  const handleBulkUpdateAccess = useCallback(async (access: string) => { // access is role name
    if (selectedEmployees.length === 0) {
      message.warning('Please select at least one employee');
      return;
    }

    // Find role ID from name
    let selectedRole = rolesData?.result?.find((r: { name: string; id: number }) => r.name === access);
    if (!selectedRole && rolesData?.result) {
      selectedRole = rolesData.result.find((r: { name: string }) => r.name.toLowerCase() === access.toLowerCase());
    }

    if (!selectedRole) {
      message.error(`Role "${access}" not found`);
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
      const hourlyRate = employee.hourlyRate && employee.hourlyRate !== 'N/A'
        ? parseFloat(employee.hourlyRate.replace(/[^0-9.]/g, ''))
        : (rawEmployee.hourly_rates || null);

      // Parse date of joining - try multiple formats
      let dateOfJoining = null;
      if (employee.dateOfJoining && employee.dateOfJoining !== 'N/A') {
        try {
          // Parse from format "DD-MMM-YYYY" (e.g., "17-Dec-2007")
          const dateParts = employee.dateOfJoining.split('-');
          if (dateParts.length === 3) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = monthNames.indexOf(dateParts[1]);
            if (monthIndex !== -1) {
              const date = new Date(parseInt(dateParts[2]), monthIndex, parseInt(dateParts[0]));
              if (!isNaN(date.getTime())) {
                dateOfJoining = date.toISOString();
              }
            }
          }
        } catch {
          // Error parsing date
        }
      }
      // Fallback to raw employee date
      if (!dateOfJoining && rawEmployee.date_of_joining) {
        try {
          const date = new Date(rawEmployee.date_of_joining || '');
          if (!isNaN(date.getTime())) {
            dateOfJoining = date.toISOString();
          }
        } catch {
          // Error parsing raw date
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
        message.success(`Updated access level to ${access} for ${totalSelected} employee(s)`);
        setSelectedEmployees([]);
        setShowAccessDropdown(false);
        // Query invalidation is handled in the hook's onSuccess, but we can force refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.users.employeesRoot() });
        // Also invalidate user details if current user's role was updated
        if (currentUserId && selectedEmployees.includes(currentUserId)) {
          queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
        }
      } else if (successfulUpdates > 0) {
        message.warning(`Updated ${successfulUpdates} employee(s), ${totalFailed} failed`);
        // Failed employees logged
      } else {
        message.error(`Failed to update all ${totalSelected} employee(s)`);
        // Failed employees logged
      }
    } catch (error) {
      message.error('An error occurred during bulk update');
    }
  }, [selectedEmployees, rolesData, employees, queryClient, queryParams, updateEmployeeMutation, message, currentUserId]);

  // Bulk update department
  const handleBulkUpdateDepartment = useCallback(async (departmentName: string) => {
    if (selectedEmployees.length === 0) {
      message.warning('Please select at least one employee');
      return;
    }

    const selectedDepartment = departmentsData?.result?.find(
      (dept: CompanyDepartmentType) => dept.name === departmentName
    );

    if (!selectedDepartment || !selectedDepartment.id) {
      message.error(`Department "${departmentName}" not found`);
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
      const hourlyRate = employee.hourlyRate && employee.hourlyRate !== 'N/A'
        ? parseFloat(employee.hourlyRate.replace(/[^0-9.]/g, ''))
        : (rawEmployee.hourly_rates || null);

      // Parse date of joining - try multiple formats
      let dateOfJoining = null;
      if (employee.dateOfJoining && employee.dateOfJoining !== 'N/A') {
        try {
          // Parse from format "DD-MMM-YYYY" (e.g., "17-Dec-2007")
          const dateParts = employee.dateOfJoining.split('-');
          if (dateParts.length === 3) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = monthNames.indexOf(dateParts[1]);
            if (monthIndex !== -1) {
              const date = new Date(parseInt(dateParts[2]), monthIndex, parseInt(dateParts[0]));
              if (!isNaN(date.getTime())) {
                dateOfJoining = date.toISOString();
              }
            }
          }
        } catch {
          // Error parsing date
        }
      }
      // Fallback to raw employee date
      if (!dateOfJoining && rawEmployee.date_of_joining) {
        try {
          const date = new Date(rawEmployee.date_of_joining);
          if (!isNaN(date.getTime())) {
            dateOfJoining = date.toISOString();
          }
        } catch {
          // Error parsing raw date
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
        message.success(`Updated department to ${departmentName} for ${totalSelected} employee(s)`);
        setSelectedEmployees([]);
        setShowDepartmentDropdown(false);
        // Query invalidation is handled in the hook's onSuccess, but we can force refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.users.employeesRoot() });
      } else if (successfulUpdates > 0) {
        message.warning(`Updated ${successfulUpdates} employee(s), ${totalFailed} failed`);
        // Failed employees logged
      } else {
        message.error(`Failed to update all ${totalSelected} employee(s)`);
        // Failed employees logged
      }
    } catch (error) {
      message.error('An error occurred during bulk update');
    }
  }, [selectedEmployees, departmentsData, employees, queryClient, queryParams, rolesData, updateEmployeeMutation, message]);

  // Export to CSV
  const handleExportToCSV = useCallback(() => {
    if (selectedEmployees.length === 0) {
      message.warning('Please select at least one employee');
      return;
    }

    // Get selected employees data - use employees array which contains all employees
    const selectedEmployeesData = employees.filter(emp => selectedEmployees.includes(emp.id));

    if (selectedEmployeesData.length === 0) {
      message.error('No employee data found for selected employees');
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
      emp.employmentType || 'N/A',
      emp.hourlyRate || 'N/A',
      emp.dateOfJoining || 'N/A',
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

      message.success(`Exported ${selectedEmployeesData.length} employee(s) to CSV`);
    } catch {
      message.error('Failed to export employees to CSV');
    }
  }, [selectedEmployees, employees, message]);

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
        message.success(`Deactivated ${totalToDeactivate} employee(s)`);
        setSelectedEmployees([]);
        // Query invalidation is handled in the hook's onSuccess
      } else if (successfulDeactivations > 0) {
        message.warning(`Deactivated ${successfulDeactivations} employee(s), ${totalFailed} failed`);
        // Failed employees logged
      } else {
        message.error(`Failed to deactivate all ${totalToDeactivate} employee(s)`);
        // Failed employees logged
      }
    } catch {
      message.error('An error occurred during bulk deactivation');
    }
  }, [updateEmployeeStatusMutation, employees, message]);

  // Bulk delete/deactivate
  const handleBulkDelete = useCallback(() => {
    if (selectedEmployees.length === 0) {
      message.warning('Please select at least one employee');
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
      modal.warning({
        title: 'Cannot Deactivate Self',
        content: 'You cannot deactivate your own account. Please contact an administrator if you need assistance.',
        okText: 'OK',
      });
      return;
    }

    // Case 2: Self included with others
    if (isSelfSelected && employeesToDeactivate.length > 0) {
      modal.confirm({
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
    modal.confirm({
      title: 'Deactivate Employees',
      content: `Are you sure you want to deactivate ${employeesToDeactivate.length} employee(s)?`,
      okText: 'Yes, Deactivate',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => performBulkDeactivation(employeesToDeactivate),
    });
  }, [selectedEmployees, currentUserId, currentUserEmail, employees, modal, message, performBulkDeactivation]);



  const { setExpandedContent } = useFloatingMenu();

  // Update floating menu with bulk actions
  useEffect(() => {
    if (selectedEmployees.length > 0) {
      setExpandedContent(
        <>
          <div className="flex items-center gap-2 border-r border-white/20 pr-6">
            <div className="bg-[#ff3b3b] text-white text-[12px] font-bold px-2 py-0.5 rounded-full">
              {selectedEmployees.length}
            </div>
            <span className="text-[14px] font-['Manrope:SemiBold',sans-serif]">Selected</span>
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
                          <span className="text-[14px] font-['Manrope:Medium',sans-serif] text-[#111111]">
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
                        <span className="text-[14px] font-['Manrope:Medium',sans-serif] text-[#111111]">
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
            className="ml-2 text-[12px] text-[#999999] hover:text-white transition-colors"
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
  }, [selectedEmployees, showAccessDropdown, showDepartmentDropdown, uniqueDepts, handleBulkDelete, handleBulkUpdateAccess, handleBulkUpdateDepartment, handleExportToCSV, setExpandedContent]);

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
      titleAction={{
        onClick: () => handleOpenDialog(),
        label: "Add Employee"
      }}
    >
      <div className="flex flex-col h-full relative">
        {/* Filters Bar */}
        <div className="mb-6">
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
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#6B7280] uppercase tracking-wider">Name</p>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#6B7280] uppercase tracking-wider">Email Address</p>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#6B7280] uppercase tracking-wider">Access Level</p>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#6B7280] uppercase tracking-wider">Type</p>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#6B7280] uppercase tracking-wider">Hourly Rate</p>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#6B7280] uppercase tracking-wider">Date of Joining</p>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#6B7280] uppercase tracking-wider"></p>
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

          {!isLoading && filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#999999] font-['Manrope:Regular',sans-serif]">
                No employees found
              </p>
            </div>
          )}
        </div>

        <div className="bg-white">
          <PaginationBar
            currentPage={currentPage}
            totalItems={filteredEmployees.length}
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
          setIsDetailsModalOpen(false);
          setSelectedEmployeeForDetails(null);
          handleOpenDialog(selectedEmployeeForDetails || undefined);
        }}
      />
    </PageLayout >
  );
}