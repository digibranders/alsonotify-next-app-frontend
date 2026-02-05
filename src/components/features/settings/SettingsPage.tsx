import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import { Plus, X, Pencil } from 'lucide-react';
import { Button, Input, App, Modal, DatePicker } from "antd";
import { useUpdateCompany, useCurrentUserCompany, useRoles, useRolePermissions, useUpsertRole, useUpdateRolePermissions, useUserDetails } from '@/hooks/useUser';
import { usePublicHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '@/hooks/useHoliday';
import { getErrorMessage } from '@/types/api-utils';
import { DEFAULT_DOCUMENT_TYPES, DOCUMENT_TYPES_STORAGE_KEY } from '@/constants/documentTypes';
import { useDocumentSettings } from '@/hooks/useDocumentSettings';
import { getRoleFromUser } from '@/utils/roleUtils';
import { useAccountType } from '@/utils/accountTypeUtils';
import dayjs from 'dayjs';
import { Department, Holiday, Role } from '@/types/domain';
import { CompanyUpdateInput } from '@/types/genericTypes';
import { CompanyLeaveSetting } from '@/types/auth';
import { CompanyDetailsTab } from './tabs/CompanyDetailsTab';
import { SecurityTab } from './tabs/SecurityTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { LeavesTab } from './tabs/LeavesTab';
import { WorkingHoursTab } from './tabs/WorkingHoursTab';
import { AccessManagementTab } from './tabs/AccessManagementTab';
import { IntegrationsTab } from './tabs/IntegrationsTab';
import { useCompanyDetails } from '@/hooks/useCompanyDetails';


type SettingsTab = 'company' | 'leaves' | 'working-hours' | 'integrations' | 'notifications' | 'security' | 'access-management';

export function SettingsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { isIndividual } = useAccountType();

  // Redirect individual accounts to profile page (matching reference implementation)
  useEffect(() => {
    if (isIndividual) {
      router.replace('/dashboard/profile');
      return;
    }
  }, [isIndividual, router]);

  // Use standardized tab sync hook for consistent URL handling
  const [activeTab, setActiveTab] = useTabSync<SettingsTab>({
    defaultTab: 'company',
    validTabs: ['company', 'leaves', 'working-hours', 'integrations', 'notifications', 'security', 'access-management']
  });

  const handleTabChange = useCallback((tab: string) => {
    // useTabSync handles URL updates automatically
    setActiveTab(tab as SettingsTab);
    setIsEditing(false); // Reset editing mode when switching tabs
  }, [setActiveTab]);
  const [isEditing, setIsEditing] = useState(false);

  // State for new tabs
  const [bankDetails, setBankDetails] = useState({ accountName: '', bankName: '', accountNumber: '', ifscCode: '' });
  const [notifications, setNotifications] = useState({ email: true, push: false, reports: true });
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', twoFactor: false });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const updateCompanyMutation = useUpdateCompany();
  const { data: companyData } = useCurrentUserCompany();
  const { data: userDetails } = useUserDetails();

  const isAdmin = useMemo(() => {
    const userData = userDetails?.result || {};
    return getRoleFromUser(userData) === 'Admin';
  }, [userDetails]);



  // Company Details State - managed by custom hook
  const {
    companyName, setCompanyName,
    companyLogo, setCompanyLogo,
    taxId, setTaxId,
    taxIdType, setTaxIdType,
    timeZone, setTimeZone,
    currency, setCurrency,
    country, setCountry,
    address, setAddress,
    defaultEmployeePassword, setDefaultEmployeePassword,
    resetCompanyDetails,
    getCompanyDetailsPayload
  } = useCompanyDetails({ companyData });

  // Update other states when company data loads
  useEffect(() => {
    if (companyData?.result) {
      if (companyData.result.leaves) {
        setLeaves(companyData.result.leaves);
      }

      if (companyData.result.working_hours) {
        setWorkStartTime(companyData.result.working_hours.start_time || '09:00');
        setWorkEndTime(companyData.result.working_hours.end_time || '18:00');
        setWorkingDays(companyData.result.working_hours.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
        setBreakTime(companyData.result.working_hours.break_time || '60');
      }
    }
  }, [companyData]);
  const [departments, setDepartments] = useState<Department[]>([
    { id: '1', name: 'Design', active: true },
    { id: '2', name: 'Development', active: true },
    { id: '3', name: 'SEO', active: true },
  ]);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  const { documentTypes: requiredDocuments, updateDocumentTypes: setRequiredDocuments } = useDocumentSettings();
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  // Persist done via hook


  // Leaves State
  const [leaves, setLeaves] = useState<CompanyLeaveSetting[]>([
    { id: '1', name: 'Sick Leave', count: 10 },
    { id: '2', name: 'Casual Leave', count: 5 }
  ]);

  // Holidays - Fetch from API, but manage locally for bulk saving
  const { data: holidaysData, isLoading: isLoadingHolidays } = usePublicHolidays();
  const [localHolidays, setLocalHolidays] = useState<Holiday[]>([]);

  // Initialize local holidays when data loads
  useEffect(() => {
    if (holidaysData?.result && !isEditing) {
      const activeHolidays = holidaysData.result
        .filter((h: Holiday) => !h.is_deleted)
        .map((h: Holiday) => ({
          id: h.id,
          name: h.name,
          date: h.date,
          is_api: h.is_api
        }));
      setLocalHolidays(activeHolidays);
    }
  }, [holidaysData, isEditing]);

  const createHolidayMutation = useCreateHoliday();
  const updateHolidayMutation = useUpdateHoliday();
  const deleteHolidayMutation = useDeleteHoliday();

  // Holiday modal state
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: null as dayjs.Dayjs | null });

  const publicHolidays = useMemo((): Holiday[] => {
    return localHolidays.filter(h => !h.is_deleted);
  }, [localHolidays]);

  // Working Hours State
  const [workingDays, setWorkingDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('18:00');
  const [breakTime, setBreakTime] = useState('60');

  // Role Management State
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormColor, setRoleFormColor] = useState('#BBBBBB');
  const [editingRole, setEditingRole] = useState<{ id?: number; name: string; color?: string } | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());

  const { data: rolesData, isLoading: isLoadingRoles } = useRoles();
  const { data: rolePermissions, isLoading: isLoadingPermissions } = useRolePermissions(selectedRoleId);
  const upsertRoleMutation = useUpsertRole();
  const updatePermissionsMutation = useUpdateRolePermissions();

  useEffect(() => {
    if (rolePermissions?.result) {
      const initial = new Set<number>();
      rolePermissions.result.forEach((mod) => {
        mod.actions.forEach((act) => {
          if (act.assigned) {
            initial.add(act.id);
          }
        });
      });
      setSelectedPermissionIds(initial);
    }
  }, [rolePermissions]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Handlers
  const handleAddDepartment = () => {
    if (!newDeptName.trim()) return;
    setDepartments([...departments, { id: Date.now().toString(), name: newDeptName, active: true }]);
    setNewDeptName('');
    setIsAddingDept(false);
  };

  const handleDeleteDepartment = (id: string) => {
    setDepartments(departments.filter(d => d.id !== id));
  };

  const toggleDepartmentStatus = (id: string) => {
    setDepartments(departments.map(d => d.id === id ? { ...d, active: !d.active } : d));
  };

  const handleAddDocument = () => {
    if (!newDocName.trim()) return;
    setRequiredDocuments([...requiredDocuments, { id: Date.now().toString(), name: newDocName, required: true }]);
    setNewDocName('');
    setIsAddingDoc(false);
  };

  const handleDeleteDocument = (id: string) => {
    setRequiredDocuments(requiredDocuments.filter(d => d.id !== id));
  };

  const toggleDocumentRequired = (id: string) => {
    setRequiredDocuments(requiredDocuments.map(d => d.id === id ? { ...d, required: !d.required } : d));
  };

  const toggleWorkingDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  // Holiday Handlers
  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm({ name: '', date: null });
    setIsHolidayModalOpen(true);
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      name: holiday.name,
      date: dayjs(holiday.date)
    });
    setIsHolidayModalOpen(true);
  };

  const handleDeleteHoliday = (id: number | string) => {
    setLocalHolidays(prev => prev.map(h => h.id === id ? { ...h, is_deleted: true } : h));
  };

  const handleSaveHoliday = () => {
    if (!holidayForm.name.trim()) {
      message.error('Holiday name is required');
      return;
    }
    if (!holidayForm.date) {
      message.error('Holiday date is required');
      return;
    }

    if (editingHoliday) {
      setLocalHolidays(prev => prev.map(h =>
        h.id === editingHoliday.id
          ? { ...h, name: holidayForm.name.trim(), date: holidayForm.date!.format('YYYY-MM-DD') }
          : h
      ));
    } else {
      const newHoliday: Holiday = {
        id: `temp-${Date.now()}`,
        name: holidayForm.name.trim(),
        date: holidayForm.date.format('YYYY-MM-DD'),
        is_api: false
      };
      setLocalHolidays(prev => [...prev, newHoliday]);
    }

    setIsHolidayModalOpen(false);
    setEditingHoliday(null);
    setHolidayForm({ name: '', date: null });
  };

  const handleSaveRole = () => {
    if (!roleFormName.trim()) {
      message.error('Role name is required');
      return;
    }

    const payload = {
      id: editingRole?.id,
      name: roleFormName.trim(),
      color: roleFormColor,
    };

    upsertRoleMutation.mutate(payload, {
      onSuccess: () => {
        message.success(`Role ${editingRole ? 'updated' : 'added'} successfully`);
        setIsRoleModalOpen(false);
        setRoleFormName('');
        setRoleFormColor('#BBBBBB');
        setEditingRole(null);
      },
      onError: (error: unknown) => {
        message.error(getErrorMessage(error, `Failed to ${editingRole ? 'update' : 'add'} role`));
      },
    });
  };

  const handleUpdateLeaveCount = (id: string, count: string) => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, count: parseInt(count) || 0 } : l));
  };

  const handleSaveChanges = useCallback(async () => {
    try {
      // Prepare company update payload based on active tab
      // Always include Name to satisfy any potential backend requirement or synchronization
      const payload: Record<string, unknown> = {
        name: companyName
      };

      if (activeTab === 'company') {
        const companyDetailsPayload = getCompanyDetailsPayload();
        Object.assign(payload, companyDetailsPayload);

        // Ensure name is present if not in payload (though it should be)
        if (!payload.name) payload.name = companyName;
      }

      if (activeTab === 'security' && isAdmin) {
        payload.default_employee_password = defaultEmployeePassword;
      }

      if (activeTab === 'leaves') {
        payload.leaves = leaves;
        // Include local holidays for bulk synchronization
        payload.public_holidays = localHolidays;
      }

      if (activeTab === 'working-hours') {
        payload.working_hours = {
          start_time: workStartTime,
          end_time: workEndTime,
          working_days: workingDays,
          break_time: breakTime
        };
      }

      await updateCompanyMutation.mutateAsync(payload as unknown as CompanyUpdateInput);
      message.success('Settings saved successfully!');
      setIsEditing(false);
      // Ensure local state reflects newest DB state if needed, though useTabSync/Refresh usually handles it
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, "Failed to update settings");
      message.error(errorMessage);
    }
  }, [activeTab, companyName, companyLogo, taxId, timeZone, currency, country, address, isAdmin, defaultEmployeePassword, leaves, workStartTime, workEndTime, workingDays, breakTime, updateCompanyMutation, message]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset changes to original database values
    if (companyData?.result) {
      if (activeTab === 'company') {
        resetCompanyDetails();
      }

      if (activeTab === 'leaves') {
        if (companyData.result.leaves) {
          setLeaves([...companyData.result.leaves]);
        }
        if (holidaysData?.result) {
          setLocalHolidays(holidaysData.result
            .filter((h: Holiday) => !h.is_deleted)
            .map((h: Holiday) => ({
              id: h.id,
              name: h.name,
              date: h.date,
              is_api: h.is_api
            })));
        }
      }

      if (activeTab === 'working-hours') {
        if (companyData.result.working_hours) {
          setWorkStartTime(companyData.result.working_hours.start_time || '09:00');
          setWorkEndTime(companyData.result.working_hours.end_time || '18:00');
          setWorkingDays(companyData.result.working_hours.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
          setBreakTime(companyData.result.working_hours.break_time || '60');
        }
      }

      if (activeTab === 'security') {
        setDefaultEmployeePassword(companyData.result.default_employee_password || 'Pass@123');
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  // Determine if the user is an employee (not Admin/Owner)
  const permissions = userDetails?.result?.permissions?.['Settings'] || {};

  const canViewCompany = isAdmin || permissions['VIEW_COMPANY_DETAILS'];
  const canEditCompany = isAdmin || permissions['EDIT_COMPANY_DETAILS'];
  const canViewNotifications = isAdmin || permissions['VIEW_NOTIFICATIONS'];
  const canViewSecurity = isAdmin || permissions['VIEW_SECURITY'];
  const canEditSecurity = isAdmin || permissions['EDIT_SECURITY'];
  const canViewLeaves = isAdmin || permissions['VIEW_LEAVES'];
  const canEditLeaves = isAdmin || permissions['EDIT_LEAVES'];
  const canViewWorkingHours = isAdmin || permissions['VIEW_WORKING_HOURS'];
  const canEditWorkingHours = isAdmin || permissions['EDIT_WORKING_HOURS'];
  const canViewAccessManagement = isAdmin || permissions['VIEW_ACCESS_MANAGEMENT'];
  const canEditAccessManagement = isAdmin || permissions['EDIT_ACCESS_MANAGEMENT'];
  const canViewIntegrations = isAdmin || permissions['VIEW_INTEGRATIONS'];
  const canEditIntegrations = isAdmin || permissions['EDIT_INTEGRATIONS'];

  /* Helper to determine tab visibility */
  const showTab = (tabId: string) => {
    if (isIndividual) {
      // Individual User Tabs
      return ['company', 'financials', 'notifications', 'security', 'integrations'].includes(tabId);
    }

    // Organization User Tabs (Permission Check)
    switch (tabId) {
      case 'company': return isAdmin || canViewCompany;
      case 'leaves': return isAdmin || canViewLeaves;
      case 'working-hours': return isAdmin || canViewWorkingHours;
      case 'integrations': return isAdmin || canViewIntegrations;
      case 'notifications': return isAdmin || canViewNotifications;
      case 'security': return isAdmin || canViewSecurity;
      case 'access-management': return isAdmin || canViewAccessManagement;
      case 'financials': return isAdmin;
      default: return true;
    }
  };

  return (
    <div className="w-full h-full bg-white rounded-[24px] border border-[#EEEEEE] p-8 flex flex-col overflow-hidden relative font-['Manrope',sans-serif]">
      {/* Header Section */}
      <div className="flex-none mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[20px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
            {isIndividual ? 'Settings' : 'Company Settings'}
          </h1>
          {/* Only show Edit button if user has edit permission */}
          {(activeTab === 'company' && canEditCompany) ||
            (activeTab === 'security' && canEditSecurity) ||
            (activeTab === 'leaves' && canEditLeaves) ||
            (activeTab === 'working-hours' && canEditWorkingHours) ? (
            !isEditing ? (
              <Button
                onClick={handleEdit}
                className="bg-[#111111] hover:bg-[#000000]/90 text-white font-['Manrope:SemiBold',sans-serif] px-6 h-10 rounded-full text-[13px] flex items-center gap-2 border-none"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCancelEdit}
                  type="text"
                  className="text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] font-['Manrope:SemiBold',sans-serif] px-6 h-10 rounded-full text-[13px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  loading={updateCompanyMutation.isPending}
                  className="bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white font-['Manrope:SemiBold',sans-serif] px-8 h-10 rounded-full shadow-lg shadow-[#ff3b3b]/20 text-[13px] border-none"
                >
                  Save Changes
                </Button>
              </div>
            )
          ) : null}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-[#EEEEEE] overflow-x-auto">
          {showTab('company') && (
            <button
              onClick={() => handleTabChange('company')}
              className={`pb-3 px-1 relative font-['Manrope:SemiBold',sans-serif] text-[14px] transition-colors whitespace-nowrap ${activeTab === 'company' ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              {isIndividual ? 'Details' : 'Company Details'}
              {activeTab === 'company' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
            </button>
          )}

          {showTab('notifications') && (
            <button
              onClick={() => handleTabChange('notifications')}
              className={`pb-3 px-1 relative font-['Manrope:SemiBold',sans-serif] text-[14px] transition-colors whitespace-nowrap ${activeTab === 'notifications' ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              Notifications
              {activeTab === 'notifications' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
            </button>
          )}

          {showTab('security') && (
            <button
              onClick={() => handleTabChange('security')}
              className={`pb-3 px-1 relative font-['Manrope:SemiBold',sans-serif] text-[14px] transition-colors whitespace-nowrap ${activeTab === 'security' ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              Security
              {activeTab === 'security' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
            </button>
          )}

          {showTab('leaves') && (
            <button
              onClick={() => handleTabChange('leaves')}
              className={`pb-3 px-1 relative font-['Manrope:SemiBold',sans-serif] text-[14px] transition-colors whitespace-nowrap ${activeTab === 'leaves' ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              Leaves
              {activeTab === 'leaves' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
            </button>
          )}

          {showTab('working-hours') && (
            <button
              onClick={() => handleTabChange('working-hours')}
              className={`pb-3 px-1 relative font-['Manrope:SemiBold',sans-serif] text-[14px] transition-colors whitespace-nowrap ${activeTab === 'working-hours' ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              Working Hours
              {activeTab === 'working-hours' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
            </button>
          )}

          {showTab('access-management') && (
            <button
              onClick={() => handleTabChange('access-management')}
              className={`pb-3 px-1 relative font-['Manrope:SemiBold',sans-serif] text-[14px] transition-colors whitespace-nowrap ${activeTab === 'access-management' ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              Access Management
              {activeTab === 'access-management' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
            </button>
          )}

          {showTab('integrations') && (
            <button
              onClick={() => handleTabChange('integrations')}
              className={`pb-3 px-1 relative font-['Manrope:SemiBold',sans-serif] text-[14px] transition-colors whitespace-nowrap ${activeTab === 'integrations' ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              Integrations
              {activeTab === 'integrations' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
            </button>
          )}
        </div>
      </div>

      {/* Content Area - Using CSS visibility to prevent DOM unmounting and flickering */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10">

        {/* Company Details Tab */}
        <div style={{ display: activeTab === 'company' ? 'block' : 'none' }}>
          <CompanyDetailsTab
            isIndividual={isIndividual}
            isAdmin={isAdmin}
            canEditCompany={canEditCompany}
            isEditing={isEditing}
            companyName={companyName}
            setCompanyName={setCompanyName}
            companyLogo={companyLogo}
            setCompanyLogo={setCompanyLogo}
            taxId={taxId}
            setTaxId={setTaxId}
            taxIdType={taxIdType}
            setTaxIdType={setTaxIdType}
            timeZone={timeZone}
            setTimeZone={setTimeZone}
            currency={currency}
            setCurrency={setCurrency}
            country={country}
            setCountry={setCountry}
            address={address}
            setAddress={setAddress}
            companyData={companyData}
            departments={departments}
            isAddingDept={isAddingDept}
            setIsAddingDept={setIsAddingDept}
            newDeptName={newDeptName}
            setNewDeptName={setNewDeptName}
            handleAddDepartment={handleAddDepartment}
            handleDeleteDepartment={handleDeleteDepartment}
            toggleDepartmentStatus={toggleDepartmentStatus}
            requiredDocuments={requiredDocuments}
            isAddingDoc={isAddingDoc}
            setIsAddingDoc={setIsAddingDoc}
            newDocName={newDocName}
            setNewDocName={setNewDocName}
            handleAddDocument={handleAddDocument}
            handleDeleteDocument={handleDeleteDocument}
            toggleDocumentRequired={toggleDocumentRequired}
          />
        </div>

        {/* Leaves Tab */}
        <div style={{ display: activeTab === 'leaves' ? 'block' : 'none' }}>
          <LeavesTab
            leaves={leaves}
            handleUpdateLeaveCount={handleUpdateLeaveCount}
            canEditLeaves={canEditLeaves}
            isEditing={isEditing}
            onEdit={handleEdit}
            onSave={handleSaveChanges}
            isSaving={updateCompanyMutation.isPending}
            isLoadingHolidays={isLoadingHolidays}
            publicHolidays={publicHolidays}
            handleAddHoliday={handleAddHoliday}
            handleEditHoliday={handleEditHoliday}
            handleDeleteHoliday={handleDeleteHoliday}
          />
        </div>

        {/* Working Hours Tab */}
        <div style={{ display: activeTab === 'working-hours' ? 'block' : 'none' }}>
          <WorkingHoursTab
            workingDays={workingDays}
            toggleWorkingDay={toggleWorkingDay}
            canEditWorkingHours={canEditWorkingHours}
            isEditing={isEditing}
            onEdit={handleEdit}
            onSave={handleSaveChanges}
            isSaving={updateCompanyMutation.isPending}
            workStartTime={workStartTime}
            setWorkStartTime={setWorkStartTime}
            workEndTime={workEndTime}
            setWorkEndTime={setWorkEndTime}
            breakTime={breakTime}
            setBreakTime={setBreakTime}
          />
        </div>

        {/* Integrations Tab */}
        <div style={{ display: activeTab === 'integrations' ? 'block' : 'none' }}>
          <IntegrationsTab />
        </div>

        {/* Access Management Tab */}
        <div style={{ display: activeTab === 'access-management' ? 'block' : 'none' }}>
          <AccessManagementTab
            canEditAccessManagement={canEditAccessManagement}
            rolesData={rolesData}
            isLoadingRoles={isLoadingRoles}
            selectedRoleId={selectedRoleId}
            setSelectedRoleId={setSelectedRoleId}
            setEditingRole={setEditingRole}
            setRoleFormName={setRoleFormName}
            setRoleFormColor={setRoleFormColor}
            setIsRoleModalOpen={setIsRoleModalOpen}
            updatePermissionsMutation={updatePermissionsMutation}
            isLoadingPermissions={isLoadingPermissions}
            rolePermissions={rolePermissions}
            selectedPermissionIds={selectedPermissionIds}
            setSelectedPermissionIds={setSelectedPermissionIds}
          />
        </div>

        {/* Notifications Tab */}
        <div style={{ display: activeTab === 'notifications' ? 'block' : 'none' }}>
          <NotificationsTab notifications={notifications} setNotifications={setNotifications} />
        </div>

        {/* Security Tab */}
        <div style={{ display: activeTab === 'security' ? 'block' : 'none' }}>
          <SecurityTab
            isAdmin={isAdmin}
            canEditSecurity={canEditSecurity}
            isEditing={isEditing}
            security={security}
            setSecurity={setSecurity}
            defaultEmployeePassword={defaultEmployeePassword}
            setDefaultEmployeePassword={setDefaultEmployeePassword}
          />
        </div>

      </div>

      {/* Holiday Modal */}
      <Modal
        title={null}
        open={isHolidayModalOpen}
        onCancel={() => {
          setIsHolidayModalOpen(false);
          setEditingHoliday(null);
          setHolidayForm({ name: '', date: null });
        }}
        footer={null}
        width={500}
        centered
        className="rounded-[16px] overflow-hidden"
        closeIcon={<X className="w-5 h-5 text-[#666666]" />}
        styles={{
          body: { padding: 0 },
        }}
      >
        <div className="flex flex-col bg-white">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-[#EEEEEE] px-6 py-6">
            <div className="flex items-center gap-2 text-[20px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-2">
              <div className="p-2 rounded-full bg-[#F7F7F7]">
                <Plus className="w-5 h-5 text-[#666666]" />
              </div>
              {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
            </div>
            <p className="text-[13px] text-[#666666] font-['Manrope:Regular',sans-serif] ml-11">
              {editingHoliday ? 'Update holiday details' : 'Add a new public holiday for your company'}
            </p>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5">
              {/* Holiday Name */}
              <div className="space-y-2">
                <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                  <span className="text-[#ff3b3b]">*</span> Holiday Name
                </span>
                <Input
                  placeholder="e.g., New Year, Christmas"
                  className={`h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${holidayForm.name ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                />
              </div>

              {/* Holiday Date */}
              <div className="space-y-2">
                <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                  <span className="text-[#ff3b3b]">*</span> Date
                </span>
                <DatePicker
                  format="YYYY-MM-DD"
                  placeholder="Select holiday date"
                  className={`w-full h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] ${holidayForm.date ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                  value={holidayForm.date}
                  onChange={(date) => setHolidayForm({ ...holidayForm, date })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-6">
                <Button
                  type="text"
                  onClick={() => {
                    setIsHolidayModalOpen(false);
                    setEditingHoliday(null);
                    setHolidayForm({ name: '', date: null });
                  }}
                  className="h-[44px] px-4 text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] transition-colors rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  onClick={handleSaveHoliday}
                  loading={createHolidayMutation.isPending || updateHolidayMutation.isPending}
                  className="h-[44px] px-8 rounded-lg bg-[#111111] hover:bg-[#000000]/90 text-white text-[14px] font-['Manrope:SemiBold',sans-serif] transition-transform active:scale-95 border-none"
                >
                  {editingHoliday ? 'Update' : 'Add'} Holiday
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Role Management Modal */}
      <Modal
        title={null}
        open={isRoleModalOpen}
        onCancel={() => {
          setIsRoleModalOpen(false);
          setRoleFormName('');
          setEditingRole(null);
        }}
        footer={null}
        width={400}
        centered
        className="rounded-2xl overflow-hidden"
        closeIcon={null}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[18px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
              {editingRole ? 'Edit Role' : 'Add New Role'}
            </h3>
            <button
              onClick={() => {
                setIsRoleModalOpen(false);
                setRoleFormName('');
                setEditingRole(null);
              }}
              className="p-2 hover:bg-[#F7F7F7] rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#666666]" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                Role Name
              </span>
              <Input
                placeholder="e.g. Project Manager"
                value={roleFormName}
                onChange={(e) => setRoleFormName(e.target.value)}
                className="h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-['Manrope:Medium',sans-serif] text-[13px]"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRole()}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                Badge Color
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {['#BBBBBB', '#ff3b3b', '#2E90FA', '#12B76A', '#7F56D9', '#F79009', '#F04438', '#667085'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setRoleFormColor(color)}
                    className={`w-5 h-5 rounded-full border-2 shrink-0 transition-all ${roleFormColor === color ? 'border-[#111111] scale-110' : 'border-transparent'
                      }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="text"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setRoleFormName('');
                  setEditingRole(null);
                }}
                className="h-10 px-6 font-['Manrope:SemiBold',sans-serif] text-[13px] text-[#666666]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRole}
                loading={upsertRoleMutation.isPending}
                className="bg-[#111111] hover:bg-black text-white font-['Manrope:SemiBold',sans-serif] px-8 h-11 rounded-full text-[13px] border-none shadow-sm transition-all active:scale-95"
              >
                {editingRole ? 'Update' : 'Add'} Role
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}