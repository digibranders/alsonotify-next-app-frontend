import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { Button, Input, App, Modal, DatePicker } from "antd";
import dayjs from 'dayjs';

// Types
import { RoleDto } from '@/types/dto/user.dto';
import { SettingsTab } from './SettingsPage';
import { ApiResponse } from '@/types/api';
import { Department, Holiday, Employee, CompanyUpdateInput } from '@/types/domain';
import { CompanyProfile, CompanyLeaveSetting } from '@/types/auth';
import { UseMutateAsyncFunction, UseMutateFunction } from '@tanstack/react-query';

// Components & Tabs
import { CompanyDetailsTab } from './tabs/CompanyDetailsTab';
import { SecurityTab } from './tabs/SecurityTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { LeavesTab } from './tabs/LeavesTab';
import { WorkingHoursTab } from './tabs/WorkingHoursTab';
import { AccessManagementTab } from './tabs/AccessManagementTab';
import { IntegrationsTab } from './tabs/IntegrationsTab';

// Hooks
import { useCompanyDetails } from '@/hooks/useCompanyDetails';
import { getErrorMessage } from '@/types/api-utils';
import { trimStr } from '@/utils/trim';
import { useDocumentSettings } from '@/hooks/useDocumentSettings';
import { useRolePermissions } from '@/hooks/useUser';

interface SettingsContentProps {
    activeTab: SettingsTab;
    setActiveTab: (tab: SettingsTab) => void;
    isIndividual: boolean;
    isAdmin: boolean;
    companyData: ApiResponse<CompanyProfile> | undefined;
    holidaysData: ApiResponse<Holiday[]> | undefined;
    rolesData: ApiResponse<RoleDto[]> | undefined;
    userDetails: ApiResponse<Employee> | undefined;
    updateCompanyMutation: { mutateAsync: UseMutateAsyncFunction<ApiResponse<CompanyProfile>, unknown, CompanyUpdateInput, unknown>; isPending: boolean };
    upsertRoleMutation: { mutate: UseMutateFunction<ApiResponse<RoleDto>, unknown, Partial<RoleDto>, unknown>; isPending: boolean };
    updatePermissionsMutation: { mutate: UseMutateFunction<ApiResponse<unknown>, unknown, { roleId: number; actions: number[] }, unknown>; isPending: boolean };
    createHolidayMutation: { isPending: boolean };
    updateHolidayMutation: { isPending: boolean };
    permissions: Record<string, boolean>;
}

export function SettingsContent({
    activeTab,
    setActiveTab,
    isIndividual,
    isAdmin,
    companyData,
    holidaysData,
    rolesData,
    updateCompanyMutation,
    upsertRoleMutation,
    updatePermissionsMutation,
    permissions
}: SettingsContentProps) {
    const { message } = App.useApp();
    const messageRef = useRef(message);

    useEffect(() => {
        messageRef.current = message;
    }, [message]);

    // const { data: employeesData } = useEmployees();

    const [isEditing, setIsEditing] = useState(false);
    const [notifications, setNotifications] = useState({ email: true, push: false, reports: true });
    const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', twoFactor: false });

    // Company Details State
    const {
        companyName, setCompanyName,
        companyLogo, setCompanyLogo,
        taxId, setTaxId,
        taxIdType, setTaxIdType,
        timeZone, setTimeZone,
        currency, setCurrency,
        country, setCountry,
        addressLine1, setAddressLine1,
        addressLine2, setAddressLine2,
        city, setCity,
        state, setState,
        zipcode, setZipcode,
        defaultEmployeePassword, setDefaultEmployeePassword,
        resetCompanyDetails,
        getCompanyDetailsPayload
    } = useCompanyDetails({ initialData: companyData?.result });

    const [departments, setDepartments] = useState<Department[]>(() => []);
    const [isAddingDept, setIsAddingDept] = useState(false);

    useEffect(() => {
        // Sync departments from company API when company data loads (no pre-seeded defaults)
        const apiDepts = (companyData?.result as { departments?: Array<{ id: number; name: string; is_active?: boolean }> })?.departments;
        if (!Array.isArray(apiDepts)) return;
        const next = apiDepts.map((d) => ({
            id: d.id,
            name: d.name,
            active: d.is_active !== false,
        }));
        queueMicrotask(() => setDepartments(next));
    }, [companyData?.result]);
    const [newDeptName, setNewDeptName] = useState('');

    const { documentTypes: requiredDocuments, updateDocumentTypes: setRequiredDocuments } = useDocumentSettings();
    const [isAddingDoc, setIsAddingDoc] = useState(false);
    const [newDocName, setNewDocName] = useState('');

    // Leaves State
    const [leaves, setLeaves] = useState<CompanyLeaveSetting[]>(() =>
        companyData?.result?.leaves || [
            { id: '1', name: 'Sick Leave', count: 10 },
            { id: '2', name: 'Casual Leave', count: 5 }
        ]
    );

    // Holidays State
    const [localHolidays, setLocalHolidays] = useState<Holiday[]>(() => {
        if (holidaysData?.result) {
            return holidaysData.result
                .filter((h: Holiday) => !h.is_deleted)
                .map((h: Holiday) => ({
                    id: h.id,
                    name: h.name,
                    date: h.date,
                    is_api: h.is_api
                }));
        }
        return [];
    });

    const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
    const [holidayForm, setHolidayForm] = useState({ name: '', date: null as dayjs.Dayjs | null });

    const publicHolidays = useMemo((): Holiday[] => {
        return localHolidays.filter(h => !h.is_deleted);
    }, [localHolidays]);

    // Working Hours State
    const [workingDays, setWorkingDays] = useState<string[]>(() => companyData?.result?.working_hours?.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const [workStartTime, setWorkStartTime] = useState(() => companyData?.result?.working_hours?.start_time || '09:00');
    const [workEndTime, setWorkEndTime] = useState(() => companyData?.result?.working_hours?.end_time || '18:00');
    const [breakTime, setBreakTime] = useState(() => String(companyData?.result?.working_hours?.break_time || '60'));

    // Role & Permissions State
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const { data: rolePermissions, isLoading: isLoadingPermissions } = useRolePermissions(selectedRoleId);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [roleFormName, setRoleFormName] = useState('');
    const [roleFormColor, setRoleFormColor] = useState('#BBBBBB');
    const [editingRole, setEditingRole] = useState<RoleDto | null>(null);

    // Handlers
    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab as SettingsTab);
        setIsEditing(false);
    }, [setActiveTab]);

    const handleAddDepartment = () => {
        const name = newDeptName.trim();
        if (!name) return;
        setDepartments([...departments, { id: Date.now().toString(), name, active: true }]);
        setNewDeptName('');
        setIsAddingDept(false);
    };

    const handleDeleteDepartment = (id: string | number) => {
        setDepartments(departments.filter(d => d.id !== id));
    };

    const toggleDepartmentStatus = (id: string | number) => {
        setDepartments(departments.map(d => d.id === id ? { ...d, active: !d.active } : d));
    };

    const handleAddDocument = () => {
        const name = newDocName.trim();
        if (!name) return;
        setRequiredDocuments([...requiredDocuments, { id: Date.now().toString(), name, required: true }]);
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
        if (!holidayForm.name.trim() || !holidayForm.date) {
            messageRef.current.error('Name and date are required');
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
    };

    const handleSaveRole = () => {
        if (!roleFormName.trim()) {
            messageRef.current.error('Role name is required');
            return;
        }

        const payload = {
            id: editingRole?.id,
            name: roleFormName.trim(),
            color: roleFormColor,
        };

        upsertRoleMutation.mutate(payload, {
            onSuccess: () => {
                messageRef.current.success(`Role ${editingRole ? 'updated' : 'added'} successfully`);
                setIsRoleModalOpen(false);
                setEditingRole(null);
            },
            onError: (error) => {
                messageRef.current.error(getErrorMessage(error, `Failed to save role`));
            },
        });
    };

    const handleUpdateLeaveCount = (id: string | number, count: string) => {
        setLeaves(leaves.map(l => l.id === id ? { ...l, count: parseInt(count) || 0 } : l));
    };

    const handleAddLeaveType = (name: string) => {
        if (!name.trim()) return;
        const newId = `leave-${Date.now()}`;
        setLeaves([...leaves, { id: newId, name: name.trim(), count: 0 }]);
    };

    const handleDeleteLeaveType = (id: string | number) => {
        setLeaves(leaves.filter(l => l.id !== id));
    };

    const handleSaveChanges = useCallback(async () => {
        try {
            const payload: CompanyUpdateInput & { departments?: { id?: number; name: string; is_active: boolean }[] } = getCompanyDetailsPayload() as CompanyUpdateInput;

            if (activeTab === 'security' && isAdmin) {
                payload.default_employee_password = trimStr(defaultEmployeePassword) || undefined;
            }

            if (activeTab === 'leaves') {
                payload.leaves = leaves;
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

            // Company-specific departments: saved for the authenticated user's company (backend uses JWT company_id)
            if (activeTab === 'company') {
                payload.departments = departments.map((d) => ({
                    ...(typeof d.id === 'number' ? { id: d.id } : {}),
                    name: (d.name ?? '').trim(),
                    is_active: d.active !== false
                }));
            }

            await updateCompanyMutation.mutateAsync(payload as CompanyUpdateInput);
            messageRef.current.success('Settings saved successfully!');
            setIsEditing(false);
        } catch (error) {
            messageRef.current.error(getErrorMessage(error, "Failed to update settings"));
        }
    }, [activeTab, isAdmin, defaultEmployeePassword, leaves, localHolidays, workStartTime, workEndTime, workingDays, breakTime, departments, updateCompanyMutation, getCompanyDetailsPayload]);

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (companyData?.result) {
            if (activeTab === 'company') {
                resetCompanyDetails();
                const apiDepts = (companyData.result as { departments?: Array<{ id: number; name: string; is_active?: boolean }> }).departments;
                if (Array.isArray(apiDepts)) {
                    setDepartments(apiDepts.map((d) => ({ id: d.id, name: d.name, active: d.is_active !== false })));
                }
            }
            if (activeTab === 'leaves') {
                if (companyData.result.leaves) setLeaves([...companyData.result.leaves]);
                // Re-sync local holidays if needed
            }
            if (activeTab === 'working-hours' && companyData.result.working_hours) {
                setWorkStartTime(companyData.result.working_hours.start_time || '09:00');
                setWorkEndTime(companyData.result.working_hours.end_time || '18:00');
                setWorkingDays(companyData.result.working_hours.working_days || []);
                setBreakTime(String(companyData.result.working_hours.break_time || '60'));
            }
        }
    };

    const handleEdit = () => setIsEditing(true);

    // Derived Visibility
    const canEditCompany = isAdmin || permissions['EDIT_COMPANY_DETAILS'];
    const canEditSecurity = isAdmin || permissions['EDIT_SECURITY'];
    const canEditLeaves = isAdmin || permissions['EDIT_LEAVES'];
    const canEditWorkingHours = isAdmin || permissions['EDIT_WORKING_HOURS'];

    const showTab = (tabId: string) => {
        if (isIndividual) return ['company', 'notifications', 'security', 'integrations'].includes(tabId);
        const viewPermMap: Record<string, string> = {
            company: 'VIEW_COMPANY_DETAILS',
            leaves: 'VIEW_LEAVES',
            'working-hours': 'VIEW_WORKING_HOURS',
            notifications: 'VIEW_NOTIFICATIONS',
            security: 'VIEW_SECURITY',
            'access-management': 'VIEW_ACCESS_MANAGEMENT',
            integrations: 'VIEW_INTEGRATIONS'
        };
        return isAdmin || permissions[viewPermMap[tabId]];
    };

    const isEditableTab = ['company', 'security', 'leaves', 'working-hours'].includes(activeTab);
    const hasEditPermission = (activeTab === 'company' && canEditCompany) ||
        (activeTab === 'security' && canEditSecurity) ||
        (activeTab === 'leaves' && canEditLeaves) ||
        (activeTab === 'working-hours' && canEditWorkingHours);

    return (
        <div className="w-full h-full bg-white rounded-[24px] border border-[#EEEEEE] p-8 flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="flex-none mb-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-semibold text-[#111111]">
                        {isIndividual ? 'Settings' : 'Company Settings'}
                    </h1>
                    {isEditableTab && hasEditPermission && (
                        !isEditing ? (
                            <Button onClick={handleEdit} className="bg-[#111111] hover:bg-[#000000]/90 text-white px-6 h-10 rounded-full flex items-center gap-2">
                                <Pencil className="w-4 h-4" /> Edit
                            </Button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Button onClick={handleCancelEdit} type="text">Cancel</Button>
                                <Button onClick={handleSaveChanges} loading={updateCompanyMutation.isPending} className="bg-[#ff3b3b] text-white px-8 h-10 rounded-full">Save Changes</Button>
                            </div>
                        )
                    )}
                </div>

                <div className="flex items-center gap-8 border-b border-[#EEEEEE] overflow-x-auto no-scrollbar">
                    {['company', 'notifications', 'security', 'leaves', 'working-hours', 'access-management', 'integrations']
                        .filter(showTab)
                        .map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`pb-3 px-1 relative font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === tab ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'}`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b] transition-opacity duration-150 ${activeTab === tab ? 'opacity-100' : 'opacity-0'}`} />
                            </button>
                        ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">
                <div className={activeTab === 'company' ? '' : 'hidden'}>
                    <CompanyDetailsTab
                        isIndividual={isIndividual} isAdmin={isAdmin} canEditCompany={canEditCompany} isEditing={isEditing}
                        companyName={companyName} setCompanyName={setCompanyName} companyLogo={companyLogo} setCompanyLogo={setCompanyLogo}
                        taxId={taxId} setTaxId={setTaxId} taxIdType={taxIdType} setTaxIdType={setTaxIdType}
                        timeZone={timeZone} setTimeZone={setTimeZone} currency={currency} setCurrency={setCurrency}
                        country={country} setCountry={setCountry}
                        addressLine1={addressLine1} setAddressLine1={setAddressLine1}
                        addressLine2={addressLine2} setAddressLine2={setAddressLine2}
                        city={city} setCity={setCity}
                        state={state} setState={setState}
                        zipcode={zipcode} setZipcode={setZipcode}
                        companyData={companyData} departments={departments} isAddingDept={isAddingDept} setIsAddingDept={setIsAddingDept}
                        newDeptName={newDeptName} setNewDeptName={setNewDeptName} handleAddDepartment={handleAddDepartment}
                        handleDeleteDepartment={handleDeleteDepartment} toggleDepartmentStatus={toggleDepartmentStatus}
                        requiredDocuments={requiredDocuments} isAddingDoc={isAddingDoc} setIsAddingDoc={setIsAddingDoc}
                        newDocName={newDocName} setNewDocName={setNewDocName} handleAddDocument={handleAddDocument}
                        handleDeleteDocument={handleDeleteDocument} toggleDocumentRequired={toggleDocumentRequired}
                    />
                </div>
                <div className={activeTab === 'notifications' ? '' : 'hidden'}><NotificationsTab notifications={notifications} setNotifications={setNotifications} /></div>
                <div className={activeTab === 'security' ? '' : 'hidden'}>
                    <SecurityTab
                        security={security}
                        setSecurity={setSecurity}
                        isAdmin={isAdmin}
                        isEditing={isEditing}
                        defaultEmployeePassword={defaultEmployeePassword}
                        setDefaultEmployeePassword={setDefaultEmployeePassword}
                        canEditSecurity={canEditSecurity}
                    />
                </div>
                <div className={activeTab === 'leaves' ? '' : 'hidden'}>
                    <LeavesTab
                        isEditing={isEditing}
                        leaves={leaves}
                        handleUpdateLeaveCount={handleUpdateLeaveCount}
                        handleAddLeaveType={handleAddLeaveType}
                        handleDeleteLeaveType={handleDeleteLeaveType}
                        publicHolidays={publicHolidays}
                        canEditLeaves={canEditLeaves}
                        onEdit={handleEdit}
                        onSave={handleSaveChanges}
                        isSaving={updateCompanyMutation.isPending}
                        isLoadingHolidays={false}
                        handleAddHoliday={handleAddHoliday}
                        handleEditHoliday={handleEditHoliday}
                        handleDeleteHoliday={handleDeleteHoliday}
                    />
                </div>
                <div className={activeTab === 'working-hours' ? '' : 'hidden'}>
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
                <div className={activeTab === 'access-management' ? '' : 'hidden'}>
                    <AccessManagementTab
                        key={selectedRoleId || 'new'}
                        canEditAccessManagement={isAdmin || !!permissions['EDIT_ACCESS_MANAGEMENT']}
                        rolesData={rolesData}
                        isLoadingRoles={false}
                        selectedRoleId={selectedRoleId}
                        setSelectedRoleId={setSelectedRoleId}
                        setIsRoleModalOpen={setIsRoleModalOpen}
                        setRoleFormName={setRoleFormName}
                        setRoleFormColor={setRoleFormColor}
                        setEditingRole={setEditingRole}
                        rolePermissions={rolePermissions}
                        isLoadingPermissions={isLoadingPermissions}
                        updatePermissionsMutation={updatePermissionsMutation}
                        initialSelectedPermissionIds={useMemo(() => {
                            const initial = new Set<number>();
                            if (rolePermissions?.result) {
                                (rolePermissions.result as { actions: { id: number; assigned: boolean }[] }[]).forEach((mod) => {
                                    mod.actions.forEach((act) => {
                                        if (act.assigned) initial.add(act.id);
                                    });
                                });
                            }
                            return initial;
                        }, [rolePermissions])}
                    />
                </div>
                <div className={activeTab === 'integrations' ? '' : 'hidden'}><IntegrationsTab /></div>
            </div>

            {/* Modals */}
            <Modal open={isHolidayModalOpen} onCancel={() => setIsHolidayModalOpen(false)} footer={null} centered>
                <div className="p-4">
                    <h3 className="text-lg font-bold mb-4">{editingHoliday ? 'Edit' : 'Add'} Holiday</h3>
                    <div className="space-y-4">
                        <Input placeholder="Holiday Name" value={holidayForm.name} onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} />
                        <DatePicker className="w-full" value={holidayForm.date} onChange={date => setHolidayForm({ ...holidayForm, date })} />
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setIsHolidayModalOpen(false)}>Cancel</Button>
                            <Button type="primary" onClick={handleSaveHoliday}>Save</Button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal open={isRoleModalOpen} onCancel={() => setIsRoleModalOpen(false)} footer={null} centered>
                <div className="p-4">
                    <h3 className="text-lg font-bold mb-4">{editingRole ? 'Edit' : 'Add'} Role</h3>
                    <div className="space-y-4">
                        <Input placeholder="Role Name" value={roleFormName} onChange={e => setRoleFormName(e.target.value)} />
                        {/* Simplified color picker for brevity in this refactor */}
                        <Input type="color" value={roleFormColor} onChange={e => setRoleFormColor(e.target.value)} className="h-10 p-0 overflow-hidden" />
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
                            <Button type="primary" onClick={handleSaveRole}>Save</Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
