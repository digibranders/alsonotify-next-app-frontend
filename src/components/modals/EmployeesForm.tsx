import { useState, useMemo } from "react";
import { Input, Select, DatePicker, TimePicker, App, Space, Modal } from "antd";
import { ShieldCheck, Briefcase, User, Users, Calendar, User as UserIcon } from "lucide-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import PhoneNumberInput from "@/components/ui/PhoneNumberInput";
import { useCurrentUserCompany, useRoles } from "@/hooks/useUser";
import { currencies, getCurrencySymbol } from "@/utils/currencyUtils";
import { Role } from '@/types/domain';
import { FormLayout } from '@/components/common/FormLayout';

dayjs.extend(customParseFormat);
import { DATE_FORMAT_DISPLAY, formatDateForApi } from "@/utils/date";

const { Option } = Select;

export interface EmployeeFormData {
  firstName: string;
  lastName: string;

  role: string;
  email: string;
  phone: string;
  countryCode: string;
  department: string;
  hourly_rates: string;
  hourlyRate?: string; // limit key usage
  dateOfJoining: string;
  experience: string;
  skillsets: string;
  access: string; // Employee is the default access level
  salary: string;
  currency: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  leaves: string;
  role_id?: number;
  manager_id?: number;
  employment_type?: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Intern'; // deprecated
}

export interface EmployeeFormProps {
  open?: boolean;
  // Backend/invite payload shape varies; narrow when API types are stable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
  onSubmit: (data: EmployeeFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
  departments?: string[];
  roles?: { id: number; name: string }[];
}

const defaultFormData: EmployeeFormData = {
  firstName: "",
  lastName: "",
  role: "",
  email: "",
  phone: "",
  countryCode: "+91",
  department: "",
  hourly_rates: "",
  dateOfJoining: "",
  experience: "",
  skillsets: "",
  access: "Employee",
  salary: "",
  currency: "USD",
  workingHoursStart: "",
  workingHoursEnd: "",
  leaves: "",
  role_id: undefined,
  manager_id: undefined,
  employment_type: undefined,
};

const countryCodes = [
  { code: "+1", country: "US" },
  { code: "+91", country: "IN" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "AU" },
  { code: "+81", country: "JP" },
  { code: "+49", country: "DE" },
];

const formatTimeForState = (time: string) => {
  if (!time) return "";
  let d = dayjs(time, 'HH:mm', true);
  if (!d.isValid()) d = dayjs(time, 'h:mm A', true);
  if (!d.isValid()) d = dayjs(time, 'h:mm a', true);
  return d.isValid() ? d.format('h:mm a') : time;
};

export function EmployeeForm(props: EmployeeFormProps) {
  const { open, onCancel, isEditing, initialData } = props;

  // Use a stable key based on initialData to force a clean remount when changing targets
  const formKey = useMemo(() => {
    if (!open) return 'closed';
    return isEditing && initialData?.id ? `edit-${initialData.id}` : 'new';
  }, [open, isEditing, initialData?.id]);

  if (open !== undefined) {
    return (
      <Modal
        key={formKey}
        open={open}
        onCancel={onCancel}
        footer={null}
        width="min(750px, 95vw)"
        centered
        destroyOnHidden={true}
        className="rounded-[16px] overflow-hidden"
        styles={{
          body: {
            padding: 0,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <EmployeeFormContent {...props} />
      </Modal>
    );
  }

  return <EmployeeFormContent {...props} />;
}

function EmployeeFormContent({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  departments = [],
}: Readonly<EmployeeFormProps>) {
  const { data: companyData } = useCurrentUserCompany();
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles();
  const { message } = App.useApp();

  const fetchedRoles = useMemo((): Role[] => {
    return rolesData?.result || [];
  }, [rolesData]);

  // Initial form data derived once on mount
  const [formData, setFormData] = useState<EmployeeFormData>(() => {
    const defaultData = { ...defaultFormData };

    if (initialData) {
      let start = "";
      let end = "";

      const wh = initialData.working_hours ?? initialData.rawWorkingHours ?? initialData.workingHours;
      if (wh && typeof wh === "object" && !Array.isArray(wh)) {
        start = (wh as { start_time?: string }).start_time ?? start;
        end = (wh as { end_time?: string }).end_time ?? end;
      }
      if (!start && initialData.workingHoursStart) {
        start = initialData.workingHoursStart;
        end = initialData.workingHoursEnd ?? end;
      }

      let phone = initialData.phone || "";
      let countryCode = initialData.countryCode || "+91";

      if (phone && !initialData.countryCode) {
        if (phone.startsWith("+")) {
          const matched = countryCodes.find(c => phone.startsWith(c.code));
          if (matched) {
            countryCode = matched.code;
            phone = phone.slice(matched.code.length).trim();
          } else {
            const parts = phone.split(" ");
            if (parts.length > 1 && parts[0].startsWith("+")) {
              countryCode = parts[0];
              phone = parts.slice(1).join(" ");
            }
          }
        }
      }

      const nameParts = (initialData.name || "").split(" ");

      return {
        ...defaultData,
        ...initialData,
        firstName: initialData.firstName || nameParts[0] || "",
        lastName: initialData.lastName || nameParts.slice(1).join(" ") || "",
        workingHoursStart: formatTimeForState(start),
        workingHoursEnd: formatTimeForState(end),
        phone,
        countryCode,
        salary: String(initialData.salary || ""),
        hourly_rates: String(initialData.hourly_rates ?? initialData.hourlyRate ?? "").replace("/Hr", "").replace("N/A", ""),
        leaves: String(initialData.no_of_leaves ?? initialData.leaves ?? ""),
        experience: String(initialData.experience || ""),
        currency: initialData.currency || "INR",
        access: initialData.access || "Employee",
        manager_id: initialData.manager_id,
        employment_type: initialData.employment_type || initialData.employmentType || undefined,
      };
    }

    return defaultData;
  });

  // Since rolesData/companyData might load AFTER initial state initialization (if not cache-warm),
  // we derive a final version of form data for display/submission if necessary.
  // However, for most fields, we want them to be stable once initialized.
  // We only augment defaults for NEW employees if company data arrives late.
  const resolvedFormData = useMemo(() => {
    const updated = { ...formData };

    if (companyData?.result) {
      const company = companyData.result;

      if (!isEditing) {

        if (updated.currency === defaultFormData.currency && company.currency) {
          updated.currency = company.currency;
        }
        if (updated.leaves === defaultFormData.leaves) {
          const companyLeaves = company.leaves;
          const totalLeaves = Array.isArray(companyLeaves)
            ? companyLeaves.reduce((sum: number, leave: { count?: number | string }) => sum + (Number(leave.count) || 0), 0)
            : 15;
          updated.leaves = totalLeaves.toString();
        }
        if (updated.workingHoursStart === defaultFormData.workingHoursStart) {
          const startTime = company.working_hours?.start_time || "09:00";
          updated.workingHoursStart = formatTimeForState(startTime);
        }
        if (updated.workingHoursEnd === defaultFormData.workingHoursEnd) {
          const endTime = company.working_hours?.end_time || "18:00";
          updated.workingHoursEnd = formatTimeForState(endTime);
        }
      }

      if (isEditing) {
        if (company.currency && !initialData?.currency) {
          updated.currency = company.currency;
        }
        if ((updated.leaves === "" || updated.leaves === "0")) {
          const companyLeaves = company.leaves;
          const totalLeaves = Array.isArray(companyLeaves)
            ? companyLeaves.reduce((sum: number, leave: { count?: number | string }) => sum + (Number(leave.count) || 0), 0)
            : 15;
          updated.leaves = totalLeaves.toString();
        }
        if (updated.workingHoursStart === "" && company.working_hours?.start_time) {
          updated.workingHoursStart = formatTimeForState(company.working_hours.start_time);
        }
        if (updated.workingHoursEnd === "" && company.working_hours?.end_time) {
          updated.workingHoursEnd = formatTimeForState(company.working_hours.end_time);
        }
      }
    }

    // Resolve access name from role_id if available and potentially more accurate
    if (initialData?.role_id && fetchedRoles.length > 0) {
      const role = fetchedRoles.find((r: Role) => r.id === initialData.role_id);
      if (role && updated.access !== role.name) {
        updated.access = role.name;
      }
    }

    return updated;
  }, [formData, companyData, isEditing, fetchedRoles, initialData?.role_id, initialData?.currency]);

  // Derive hourly rate instead of using an effect
  const calculatedHourlyRate = useMemo(() => {
    const salary = Number(resolvedFormData.salary);
    if (!salary || !resolvedFormData.workingHoursStart || !resolvedFormData.workingHoursEnd || !companyData?.result) {
      return "";
    }

    try {
      const company = companyData.result;
      const workingHours = company.working_hours || {};
      const workingDaysCount = Array.isArray(workingHours.working_days) && workingHours.working_days.length > 0
        ? workingHours.working_days.length
        : 5;
      const breakTimeMinutes = Number(workingHours.break_time) || 0;

      const start = dayjs(resolvedFormData.workingHoursStart, 'h:mm a');
      const end = dayjs(resolvedFormData.workingHoursEnd, 'h:mm a');

      if (start.isValid() && end.isValid()) {
        let diffMinutes = end.diff(start, 'minute');
        if (diffMinutes < 0) diffMinutes += 1440;

        const netWorkingMinutesPerDay = Math.max(0, diffMinutes - breakTimeMinutes);
        const hoursPerDay = netWorkingMinutesPerDay / 60;
        const totalHoursPerYear = hoursPerDay * workingDaysCount * 52;

        if (totalHoursPerYear > 0) {
          return Math.round(salary / totalHoursPerYear).toString();
        }
      }
    } catch (e) {
      console.error("Hourly calculation error:", e);
    }
    return "";
  }, [resolvedFormData.salary, resolvedFormData.workingHoursStart, resolvedFormData.workingHoursEnd, companyData]);

  const displayHourlyCost = useMemo(() => {
    if (calculatedHourlyRate) return `${calculatedHourlyRate}/Hr`;
    const existing = (resolvedFormData.hourly_rates || resolvedFormData.hourlyRate || "").trim();
    if (!existing) return "";
    return `${existing}/Hr`;
  }, [calculatedHourlyRate, resolvedFormData.hourly_rates, resolvedFormData.hourlyRate]);

  const handleSubmit = () => {
    if (!resolvedFormData.firstName) {
      message.error("First Name is required");
      return;
    }
    if (!resolvedFormData.email) {
      message.error("Email is required");
      return;
    }
    if (!resolvedFormData.employment_type) {
      message.error("Employment Type is required");
      return;
    }

    const selectedRole = fetchedRoles.find((r: Role) => r.name === resolvedFormData.access);
    const submissionData = {
      ...resolvedFormData,
      hourly_rates: calculatedHourlyRate || resolvedFormData.hourly_rates,
      // Backward compat
      employmentType: resolvedFormData.employment_type,
      hourlyRate: calculatedHourlyRate || resolvedFormData.hourly_rates
    };

    if (selectedRole) {
      submissionData.role_id = selectedRole.id;
    }

    onSubmit(submissionData);
  };

  const getAccessLevelConfig = (access: string) => {
    const normalize = (str: string) => str?.toLowerCase().trim() || "";
    const acc = normalize(access);

    if (acc === "admin") return { icon: ShieldCheck, color: "#ff3b3b", bgColor: "#FFF5F5" };
    if (acc === "manager") return { icon: Briefcase, color: "#2E90FA", bgColor: "#EFF8FF" };
    if (acc === "coordinator") return { icon: Briefcase, color: "#F79009", bgColor: "#FFFAEB" };
    if (acc === "hr") return { icon: ShieldCheck, color: "#0284C7", bgColor: "#F0F9FF" };
    if (acc === "finance") return { icon: Briefcase, color: "#059669", bgColor: "#ECFDF5" };
    if (acc === "leader" || acc === "head") return { icon: Users, color: "#7F56D9", bgColor: "#F9F5FF" };
    return { icon: User, color: "#12B76A", bgColor: "#ECFDF3" };
  };

  const currencySymbol = getCurrencySymbol(resolvedFormData.currency);

  const CurrencySelector = (
    <Select
      value={resolvedFormData.currency}
      onChange={(val) => setFormData({ ...formData, currency: val })}
      className="currency-select-addon"
      variant="borderless"
      popupMatchSelectWidth={false}
      style={{ width: 80 }}
    >
      {currencies.map(c => (
        <Option key={c} value={c}>{c}</Option>
      ))}
    </Select>
  );

  return (
    <FormLayout
      title={isEditing ? 'Edit Employee Details' : 'Add Employee'}
      subtitle={isEditing ? 'Update employee profile, access, and HR details.' : 'Onboard a new employee to the organization.'}
      icon={UserIcon}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Update Profile" : "Create Employee"}
    >
      <div className="grid grid-cols-12 gap-x-4 gap-y-4">
        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">First Name <span className="text-[#ff3b3b]">*</span></span>
          <Input
            placeholder="First name"
            className={`h-11 rounded-lg border border-[#EEEEEE] font-medium ${resolvedFormData.firstName ? 'bg-white' : 'bg-[#F9FAFB]'}`}
            value={resolvedFormData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>
        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Last Name</span>
          <Input
            placeholder="Last name"
            className={`h-11 rounded-lg border border-[#EEEEEE] font-medium ${resolvedFormData.lastName ? 'bg-white' : 'bg-[#F9FAFB]'}`}
            value={resolvedFormData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>

        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Email Address <span className="text-[#ff3b3b]">*</span></span>
          <Input
            placeholder="email@company.com"
            className={`h-11 rounded-lg border border-[#EEEEEE] font-medium ${resolvedFormData.email ? 'bg-white' : 'bg-[#F9FAFB]'}`}
            value={resolvedFormData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Contact Number</span>
          <PhoneNumberInput
            placeholder="123 456 7890"
            value={`${resolvedFormData.countryCode} ${resolvedFormData.phone}`}
            onChange={(val) => {
              const parts = val.split(' ');
              const code = parts[0];
              const num = parts.slice(1).join(' ');
              setFormData({ ...formData, countryCode: code, phone: num });
            }}
            className={`employee-form-phone ${resolvedFormData.phone ? 'bg-white' : 'bg-gray-50'}`}
          />
        </div>

        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Access Level <span className="text-[#ff3b3b]">*</span></span>
          <Select
            className={`w-full h-11 access-level-select employee-form-select ${resolvedFormData.access ? 'employee-form-select-filled' : ''}`}
            classNames={{ popup: { root: 'access-level-popup' } }}
            placeholder={isLoadingRoles ? "Loading roles..." : "Select access"}
            loading={isLoadingRoles}
            value={resolvedFormData.access}
            onChange={(v) => {
              const role = fetchedRoles.find((r: Role) => r.name === v);
              setFormData({ ...formData, access: v as string, role_id: role?.id });
            }}
            suffixIcon={<div className="text-gray-400">⌄</div>}
          >
            {fetchedRoles.map((role: Role) => {
              const config = getAccessLevelConfig(role.name);
              const Icon = config.icon;
              return (
                <Option key={role.id} value={role.name}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                    <span style={{ color: config.color }}>{role.name}</span>
                  </div>
                </Option>
              );
            })}
          </Select>
        </div>
        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Employment Type <span className="text-[#ff3b3b]">*</span></span>
          <Select
            className={`w-full h-11 employee-form-select ${resolvedFormData.employment_type ? 'employee-form-select-filled' : ''}`}
            placeholder="Select type"
            value={resolvedFormData.employment_type}
            onChange={(v) => setFormData({ ...formData, employment_type: v as EmployeeFormData["employment_type"] })}
            suffixIcon={<div className="text-gray-400">⌄</div>}
          >
            <Option value="Full-time">Full Time</Option>
            <Option value="Part-time">Part Time</Option>
            <Option value="Contract">Contract</Option>
            <Option value="Intern">Intern</Option>
          </Select>
        </div>

        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Designation</span>
          <Input
            placeholder="e.g. Senior Developer"
            className={`h-11 rounded-lg border border-[#EEEEEE] font-medium ${resolvedFormData.role ? 'bg-white' : 'bg-[#F9FAFB]'}`}
            value={resolvedFormData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
        </div>
        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Department</span>
          <Select
            showSearch
            className={`w-full h-11 employee-form-select ${resolvedFormData.department ? 'employee-form-select-filled' : ''}`}
            placeholder="Select department"
            value={resolvedFormData.department || undefined}
            onChange={(v) => setFormData({ ...formData, department: String(v) })}
            suffixIcon={<div className="text-gray-400">⌄</div>}
          >
            {departments.length > 0 ? (
              departments.map((dept) => (
                <Option key={dept} value={dept}>{dept}</Option>
              ))
            ) : (
              <Option value="" disabled>No departments found</Option>
            )}
          </Select>
        </div>

        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Experience (Years)</span>
          <Input
            type="number"
            placeholder="e.g. 5"
            className={`h-11 rounded-lg border border-[#EEEEEE] font-medium ${resolvedFormData.experience ? 'bg-white' : 'bg-[#F9FAFB]'}`}
            value={resolvedFormData.experience}
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          />
        </div>
        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Date of Joining</span>
          <DatePicker
            className={`w-full h-11 employee-form-datepicker ${resolvedFormData.dateOfJoining ? 'employee-form-datepicker-filled' : ''}`}
            placeholder={DATE_FORMAT_DISPLAY.toLowerCase()}
            format={DATE_FORMAT_DISPLAY}
            value={resolvedFormData.dateOfJoining ? dayjs(resolvedFormData.dateOfJoining) : null}
            onChange={(date) => setFormData({ ...formData, dateOfJoining: date ? formatDateForApi(date) : '' })}
            suffixIcon={<Calendar className="w-4 h-4 text-[#999999]" />}
          />
        </div>

        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Salary (CTC) <span className="text-[#666666] font-medium text-2xs ml-1">(Annual)</span></span>
          <Space.Compact className="w-full employee-form-salary">
            {CurrencySelector}
            <Input
              type="number"
              placeholder="e.g. 1200000"
              className={`h-11 font-medium ${resolvedFormData.salary ? 'bg-white' : 'bg-gray-50'}`}
              value={resolvedFormData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              prefix={<span className="text-gray-400 mr-1">{currencySymbol}</span>}
            />
          </Space.Compact>
        </div>
        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Total Leaves</span>
          <Input
            type="number"
            placeholder="Days"
            className={`h-11 rounded-lg border border-[#EEEEEE] font-medium ${resolvedFormData.leaves ? 'bg-white' : 'bg-[#F9FAFB]'}`}
            value={resolvedFormData.leaves}
            onChange={(e) => setFormData({ ...formData, leaves: e.target.value })}
          />
        </div>

        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Working Hours</span>
          <div className="grid grid-cols-2 gap-2">
            <TimePicker
              placeholder="Start"
              format="h:mm a"
              className={`w-full h-11 employee-form-datepicker ${resolvedFormData.workingHoursStart ? 'employee-form-datepicker-filled' : ''}`}
              value={resolvedFormData.workingHoursStart ? dayjs(resolvedFormData.workingHoursStart, 'h:mm a') : null}
              onChange={(time) => setFormData({ ...formData, workingHoursStart: time ? time.format('h:mm a') : '' })}
              suffixIcon={<div className="text-gray-400">⌄</div>}
            />
            <TimePicker
              placeholder="End"
              format="h:mm a"
              className={`w-full h-11 employee-form-datepicker ${resolvedFormData.workingHoursEnd ? 'employee-form-datepicker-filled' : ''}`}
              value={resolvedFormData.workingHoursEnd ? dayjs(resolvedFormData.workingHoursEnd, 'h:mm a') : null}
              onChange={(time) => setFormData({ ...formData, workingHoursEnd: time ? time.format('h:mm a') : '' })}
              suffixIcon={<div className="text-gray-400">⌄</div>}
            />
          </div>
        </div>
        <div className="col-span-6 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Hourly Cost <span className="text-[#666666] font-medium text-2xs ml-1">(Calculated)</span></span>
          <Input
            placeholder="e.g. 25/Hr"
            readOnly
            className={`h-11 rounded-lg border border-[#EEEEEE] bg-[#F9FAFB] text-[#666666] font-medium cursor-not-allowed`}
            value={displayHourlyCost}
            prefix={<span className="text-gray-400 mr-1">{currencySymbol}</span>}
          />
        </div>

        <div className="col-span-12 space-y-1">
          <span className="text-xs font-bold text-[#111111]">Professional Skillsets</span>
          <Select
            mode="tags"
            className={`w-full employee-form-select linkedin-skill-select ${resolvedFormData.skillsets ? 'employee-form-select-filled' : ''}`}
            classNames={{ popup: { root: 'linkedin-skill-dropdown' } }}
            placeholder="Type and press enter (e.g. React, UX Design, etc.)"
            value={resolvedFormData.skillsets ? resolvedFormData.skillsets.split(',').filter(s => s.trim()) : []}
            onChange={(v) => setFormData({ ...formData, skillsets: v.join(',') })}
            suffixIcon={null}
            maxTagCount="responsive"
          >
            <Option value="React">React</Option>
            <Option value="Node.js">Node.js</Option>
            <Option value="TypeScript">TypeScript</Option>
            <Option value="UI/UX Design">UI/UX Design</Option>
            <Option value="Product Management">Product Management</Option>
            <Option value="Python">Python</Option>
            <Option value="AWS">AWS</Option>
          </Select>
        </div>
      </div>

      <style jsx global>{`
          :global(.ant-input), 
          :global(.ant-select),
          :global(.ant-select-selector), 
          :global(.ant-picker) {
            height: 44px !important;
          }
          
          :global(.ant-select-selector), 
          :global(.ant-picker) {
            min-height: 44px !important;
            display: flex !important;
            align-items: center !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          
          :global(.ant-select-selection-item), 
          :global(.ant-select-selection-placeholder),
          :global(.ant-select-selection-search-input) {
            display: flex !important;
            align-items: center !important;
          }
          
          :global(.ant-select-selection-placeholder) {
            height: 100% !important;
            top: 0 !important;
            display: flex !important;
            align-items: center !important;
          }
          
          :global(.ant-select-selection-search) {
            height: 100% !important;
            top: 0 !important;
            display: flex !important;
            align-items: center !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          
          :global(.ant-select-selection-overflow) {
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }

          :global(.linkedin-skill-select .ant-select-selection-item) {
            background: #E7F3FF !important;
            border: 1px solid #70B5FF !important;
            border-radius: 4px !important;
            color: #004182 !important;
            font-family: 'Manrope:SemiBold', sans-serif !important;
            font-size: var(--font-size-xs) !important;
            height: 24px !important;
            line-height: 22px !important;
            margin: 0 4px 0 0 !important;
            padding-inline-start: 8px !important;
            display: flex !important;
            align-items: center !important;
            overflow: visible !important;
          }
          :global(.linkedin-skill-select .ant-select-selection-item-remove) {
            color: #004182 !important;
            transition: all 0.2s;
          }
          :global(.linkedin-skill-select .ant-select-selection-item-remove:hover) {
            color: #ff3b3b !important;
          }
          :global(.linkedin-skill-select .ant-select-selection-overflow-item) {
            display: flex !important;
            align-items: center !important;
          }
          :global(.linkedin-skill-select .ant-select-selector) {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            padding-left: 11px !important;
            overflow: hidden !important;
          }
          .employee-form-select .ant-select-selector {
            background-color: #F9FAFB !important;
            border-color: #EEEEEE !important;
          }
          .employee-form-select .ant-select-selector:hover {
            border-color: #EEEEEE !important;
          }
          .employee-form-select.ant-select-focused .ant-select-selector {
            border-color: #EEEEEE !important;
            box-shadow: none !important;
          }
          
          .employee-form-select-filled .ant-select-selector {
            background-color: white !important;
          }
          
          .employee-form-datepicker .ant-picker {
            background-color: #F9FAFB !important;
            border-color: #EEEEEE !important;
          }
          .employee-form-datepicker .ant-picker:hover {
            border-color: #EEEEEE !important;
          }
          .employee-form-datepicker .ant-picker-focused {
            border-color: #EEEEEE !important;
            box-shadow: none !important;
          }
          
          .employee-form-datepicker-filled .ant-picker {
            background-color: white !important;
          }
          
          .ant-input:focus {
            border-color: #EEEEEE !important;
            box-shadow: none !important;
          }

          :global(.employee-form-phone .ant-select-selector),
          :global(.employee-form-salary .currency-select-addon .ant-select-selector) {
            background-color: transparent !important;
            border: 1px solid #EEEEEE !important;
            border-right: 0 !important;
            border-radius: 8px 0 0 8px !important;
            height: 44px !important;
            display: flex !important;
            align-items: center !important;
            box-shadow: none !important;
            font-weight: 500 !important;
          }

          :global(.employee-form-phone .ant-input),
          :global(.employee-form-salary .ant-input) {
             border: 1px solid #EEEEEE !important;
             border-left: 0 !important;
             border-radius: 0 8px 8px 0 !important;
          }
          
          :global(.employee-form-phone:focus-within .ant-select-selector),
          :global(.employee-form-salary:focus-within .currency-select-addon .ant-select-selector) {
             border-color: #111111 !important;
             background-color: white !important;
          }

          :global(.employee-form-phone:focus-within .ant-input),
          :global(.employee-form-salary:focus-within .ant-input) {
             border-color: #111111 !important;
             background-color: white !important;
          }

          :global(.employee-form-phone), :global(.employee-form-salary) {
             display: flex !important;
             border-radius: 8px !important;
             overflow: hidden !important;
          }

          :global(.employee-form-phone.bg-white .ant-select-selector),
          :global(.employee-form-salary .bg-white .ant-select-selector),
          :global(.employee-form-salary .bg-white.ant-input) {
              background-color: white !important;
          }

          :global(.employee-form-phone.bg-gray-50) :global(.ant-select-selector),
          :global(.employee-form-salary) :global(.bg-gray-50) :global(.ant-select-selector),
          :global(.employee-form-salary) :global(.bg-gray-50.ant-input) {
              background-color: #F9FAFB !important;
          }

          :global(.currency-select-addon) {
             display: flex !important;
             align-items: center !important;
          }
          
          :global(.access-level-popup), :global(.linkedin-skill-dropdown) {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
            border: 1px solid #EEEEEE !important;
            border-radius: 8px !important;
            padding: 4px !important;
            background: white !important;
          }
          :global(.access-level-popup .ant-select-item), :global(.linkedin-skill-dropdown .ant-select-item) {
            background: white !important;
            padding: 8px 12px !important;
            border-radius: 6px !important;
            margin-bottom: 2px !important;
          }
          :global(.access-level-popup .ant-select-item:hover), :global(.linkedin-skill-dropdown .ant-select-item:hover) {
            background: #F7F7F7 !important;
            height: auto !important;
          }
          :global(.access-level-popup .ant-select-item-option-selected), :global(.linkedin-skill-dropdown .ant-select-item-option-selected) {
            background: #F9FAFB !important;
            font-weight: 600 !important;
          }
          :global(.access-level-popup .ant-select-item-option-state),
          :global(.linkedin-skill-dropdown .ant-select-item-option-state) {
            display: flex !important;
          }
        `}</style>
    </FormLayout>
  );
}
