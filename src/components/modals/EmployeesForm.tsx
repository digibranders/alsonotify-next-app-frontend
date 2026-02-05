import { useState, useEffect, useMemo } from "react";
import { Input, Select, DatePicker, TimePicker, App, Space } from "antd";
import { ShieldCheck, Briefcase, User, Users, Calendar, User as UserIcon } from "lucide-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import PhoneNumberInput from "@/components/ui/PhoneNumberInput";
import { useCurrentUserCompany, useRoles } from "@/hooks/useUser";
import { currencies, getCurrencySymbol } from "@/utils/currencyUtils";
import { Role } from '@/types/domain';
import { FormLayout } from '@/components/common/FormLayout';

dayjs.extend(customParseFormat);

const { Option } = Select;

export interface EmployeeFormData {
  firstName: string;
  lastName: string;

  role: string;
  email: string;  
  phone: string;
  countryCode: string;
  department: string;
  hourlyRate: string;
  dateOfJoining: string;
  experience: string;
  skillsets: string;
  access: string;
  salary: string;
  currency: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  leaves: string;
  role_id?: number;
  manager_id?: number;
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
}

interface EmployeeFormProps {
  initialData?: any; // Allow loose typing for mapping input data
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
  hourlyRate: "",
  dateOfJoining: "",
  experience: "",
  skillsets: "",
  access: "Admin", // Will default to first available or empty
  salary: "",
  currency: "INR",
  workingHoursStart: "",
  workingHoursEnd: "",
  leaves: "",
  role_id: undefined,
  manager_id: undefined,
  employmentType: undefined,
};

const countryCodes = [
  { code: "+1", country: "US" },
  { code: "+91", country: "IN" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "AU" },
  { code: "+81", country: "JP" },
  { code: "+49", country: "DE" },
];

export function EmployeeForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  departments = [],
}: Readonly<EmployeeFormProps>) {
  const [formData, setFormData] = useState<EmployeeFormData>(defaultFormData);
  const { data: companyData } = useCurrentUserCompany();
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles();
  const { message } = App.useApp();

  const fetchedRoles = useMemo((): Role[] => {
    return rolesData?.result || [];
  }, [rolesData]);

  // Helper to calculate hourly rate from salary and company settings

  const formatTimeForState = (time: string) => {
    if (!time) return "";
    let d = dayjs(time, 'HH:mm', true);
    if (!d.isValid()) d = dayjs(time, 'h:mm A', true);
    if (!d.isValid()) d = dayjs(time, 'h:mm a', true);
    return d.isValid() ? d.format('h:mm a') : time;
  };

  // Handle form data initialization (Edit mode or Company defaults for new employee)
  useEffect(() => {
    if (initialData) {
      // Parse initial data to fit new form structure
      let start = "";
      let end = "";

      // Handle working hours if it comes as an object or string
      if (initialData.workingHours && typeof initialData.workingHours === 'object') {
        start = (initialData.workingHours as any).start_time || "";
        end = (initialData.workingHours as any).end_time || "";
      } else if (initialData.workingHoursStart) {
        start = initialData.workingHoursStart;
        end = initialData.workingHoursEnd;
      }

      // Handle phone number splitting if needed
      let phone = initialData.phone || "";
      let countryCode = initialData.countryCode || "+91";

      // Improved logic to extract country code
      if (phone && !initialData.countryCode) {
        // If it starts with +, try to match known codes first
        if (phone.startsWith("+")) {
           const matched = countryCodes.find(c => phone.startsWith(c.code));
           if (matched) {
             countryCode = matched.code;
             phone = phone.slice(matched.code.length).trim();
           } else {
             // If + but no match from our limited list, take the first chunk as code if space exists
             const parts = phone.split(" ");
             if (parts.length > 1 && parts[0].startsWith("+")) {
                countryCode = parts[0];
                phone = parts.slice(1).join(" ");
             }
           }
        } 
      }

      const nameParts = (initialData.name || "").split(" ");

      setFormData({
        ...defaultFormData,
        ...initialData,
        firstName: initialData.firstName || nameParts[0] || "",
        lastName: initialData.lastName || nameParts.slice(1).join(" ") || "",
        workingHoursStart: formatTimeForState(start),
        workingHoursEnd: formatTimeForState(end),
        phone,
        countryCode,
        salary: String(initialData.salary || ""),
        hourlyRate: String(initialData.hourlyRate || "").replace("/Hr", "").replace("N/A", ""),
        leaves: String(initialData.leaves || ""),
        experience: String(initialData.experience || ""),
        currency: initialData.currency || "INR",
        // Map access string to role if available, or keep as is
        // Prioritize resolving name from role_id if available, as 'access' string might be stale
        access: (initialData.role_id ? fetchedRoles.find((r: Role) => r.id === initialData.role_id)?.name : undefined) || initialData.access || "Employee",
        manager_id: initialData.manager_id,
      });
    } else if (companyData?.result && !isEditing) {
      // New employee initialization from company settings
      const company = companyData.result;
      const { working_hours, leaves: companyLeaves, currency } = company;
      
      const totalLeaves = Array.isArray(companyLeaves) && companyLeaves.length > 0
        ? companyLeaves.reduce((sum: number, leave: any) => sum + (Number(leave.count) || 0), 0)
        : 15; // Match SettingsPage default

      const stateStart = working_hours?.start_time ? formatTimeForState(working_hours.start_time) : "";
      const stateEnd = working_hours?.end_time ? formatTimeForState(working_hours.end_time) : "";

      setFormData({
        ...defaultFormData,
        currency: currency || "INR",
        workingHoursStart: stateStart || "9:00 am",
        workingHoursEnd: stateEnd || "6:00 pm",
        leaves: totalLeaves.toString(),
        access: "Admin" // Default to Admin as requested
      });
    } else if (!isEditing) {
      setFormData(defaultFormData);
    }
  }, [initialData, companyData, isEditing, fetchedRoles]);

  // Handle Hourly Cost Auto-calculation
  useEffect(() => {
    const salary = Number(formData.salary);
    if (!salary || !formData.workingHoursStart || !formData.workingHoursEnd || !companyData?.result) {
      if (formData.hourlyRate !== "") {
        setFormData(prev => ({ ...prev, hourlyRate: "" }));
      }
      return;
    }

    try {
      const company = companyData.result;
      const workingHours = company.working_hours || {};
      // Default to 5 days if settings missing
      const workingDaysCount = Array.isArray(workingHours.working_days) && workingHours.working_days.length > 0
        ? workingHours.working_days.length 
        : 5;
      const breakTimeMinutes = Number(workingHours.break_time) || 0;

      const start = dayjs(formData.workingHoursStart, 'h:mm a');
      const end = dayjs(formData.workingHoursEnd, 'h:mm a');

      if (start.isValid() && end.isValid()) {
        let diffMinutes = end.diff(start, 'minute');
        // Handle case where end time is cross-day (standardized shift)
        if (diffMinutes < 0) diffMinutes += 1440; 
        
        const netWorkingMinutesPerDay = Math.max(0, diffMinutes - breakTimeMinutes);
        const hoursPerDay = netWorkingMinutesPerDay / 60;
        
        // Calculate annual working hours: hours/day * days/week * 52 weeks
        const totalHoursPerYear = hoursPerDay * workingDaysCount * 52;
        
        if (totalHoursPerYear > 0) {
          const calculatedHourlyRate = Math.round(salary / totalHoursPerYear).toString();
          if (formData.hourlyRate !== calculatedHourlyRate) {
            setFormData(prev => ({ ...prev, hourlyRate: calculatedHourlyRate }));
          }
        }
      }
    } catch (e) {
      console.error("Hourly calculation error:", e);
    }
  }, [formData.salary, formData.workingHoursStart, formData.workingHoursEnd, companyData]);


  const handleSubmit = () => {
    if (!formData.firstName) {
      message.error("First Name is required");
      return;
    }
    if (!formData.email) {
      message.error("Email is required");
      return;
    }
    if (!formData.employmentType) {
      message.error("Employment Type is required");
      return;
    }
    // Set role_id based on selected access name if needed
    const selectedRole = fetchedRoles.find((r: Role) => r.name === formData.access);
    if (selectedRole) {
      formData.role_id = selectedRole.id;
    }

    onSubmit(formData);
  };

  // Helper function to get access level icon and color
  const getAccessLevelConfig = (access: string) => {
    const normalize = (str: string) => str?.toLowerCase().trim() || "";
    const acc = normalize(access);
    
    if (acc === "admin") return { icon: ShieldCheck, color: "#ff3b3b", bgColor: "#FFF5F5" };
    if (acc === "manager") return { icon: Briefcase, color: "#2E90FA", bgColor: "#EFF8FF" };
    if (acc === "leader") return { icon: Users, color: "#7F56D9", bgColor: "#F9F5FF" };
    // Default or Employee
    return { icon: User, color: "#12B76A", bgColor: "#ECFDF3" };
  };


  const currencySymbol = getCurrencySymbol(formData.currency);

  const CurrencySelector = (
    <Select
      value={formData.currency}
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
          {/* Row 1: First Name & Last Name */}
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">First Name <span className="text-[#ff3b3b]">*</span></span>
            <Input
              placeholder="First name"
              className={`h-11 rounded-lg border border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${formData.firstName ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Last Name</span>
            <Input
              placeholder="Last name"
              className={`h-11 rounded-lg border border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${formData.lastName ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          {/* Row 2: Email & Contact */}
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Email Address <span className="text-[#ff3b3b]">*</span></span>
            <Input
              placeholder="email@company.com"
              className={`h-11 rounded-lg border border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${formData.email ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Contact Number</span>
            <PhoneNumberInput
              placeholder="123 456 7890"
              value={`${formData.countryCode} ${formData.phone}`}
              onChange={(val) => {
                const parts = val.split(' ');
                const code = parts[0];
                const num = parts.slice(1).join(' ');
                setFormData({ ...formData, countryCode: code, phone: num });
              }}
              className={`w-full h-11 rounded-lg border border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${formData.phone ? 'bg-white' : 'bg-[#F9FAFB]'} focus-within:border-[#111111] focus-within:bg-white focus-within:shadow-none transition-all`}
            />
          </div>

          {/* Row 3: Access Level & Employment Type */}
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Access Level <span className="text-[#ff3b3b]">*</span></span>
            <Select
              className={`w-full h-11 access-level-select employee-form-select ${formData.access ? 'employee-form-select-filled' : ''}`}
              classNames={{ popup: { root: 'access-level-popup' } }}
              placeholder={isLoadingRoles ? "Loading roles..." : "Select access"}
              loading={isLoadingRoles}
              value={formData.access}
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
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Employment Type <span className="text-[#ff3b3b]">*</span></span>
            <Select
              className={`w-full h-11 employee-form-select ${formData.employmentType ? 'employee-form-select-filled' : ''}`}
              placeholder="Select type"
              value={formData.employmentType}
              onChange={(v) => setFormData({ ...formData, employmentType: v as any })}
              suffixIcon={<div className="text-gray-400">⌄</div>}
            >
              <Option value="Full-time">Full Time</Option>
              <Option value="Part-time">Part Time</Option>
              <Option value="Contract">Contract</Option>
              <Option value="Intern">Intern</Option>
            </Select>
          </div>

          {/* Row 4: Designation & Department */}
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Designation</span>
            <Input
              placeholder="e.g. Senior Developer"
              className={`h-11 rounded-lg border border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${formData.role ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
          </div>
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Department</span>
            <Select
              showSearch
              className={`w-full h-11 employee-form-select ${formData.department ? 'employee-form-select-filled' : ''}`}
              placeholder="Select department"
              value={formData.department || undefined}
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


          {/* Row 5: Manager & Experience */}
          {/* <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Manager</span>
            <Select
              showSearch
              className={`w-full h-11 employee-form-select ${formData.manager_id ? 'employee-form-select-filled' : ''}`}
              placeholder="Select manager"
              optionFilterProp="children"
              filterOption={(input: string, option: any) => 
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              value={formData.manager_id || undefined}
              onChange={(v) => setFormData({ ...formData, manager_id: v })}
              suffixIcon={<div className="text-gray-400">⌄</div>}
          {/* Row 5: Experience & Date of Joining */}
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Experience (Years)</span>
            <Input
              type="number"
              placeholder="e.g. 5"
              className={`h-11 rounded-lg border border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${formData.experience ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            />
          </div>
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Date of Joining</span>
            <DatePicker
              className={`w-full h-11 employee-form-datepicker ${formData.dateOfJoining ? 'employee-form-datepicker-filled' : ''}`}
              placeholder="dd/mm/yyyy"
              format="DD/MM/YYYY"
              value={formData.dateOfJoining ? dayjs(formData.dateOfJoining) : null}
              onChange={(date) => setFormData({ ...formData, dateOfJoining: date ? date.format('YYYY-MM-DD') : '' })}
              suffixIcon={<Calendar className="w-4 h-4 text-[#999999]" />}
            />
          </div>

          {/* Row 6: Salary & Total Leaves */}
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Salary (CTC) <span className="text-[#666666] font-normal text-[11px] ml-1">(Annual)</span></span>
            <Space.Compact className="w-full">
              {CurrencySelector}
              <Input
                type="number"
                placeholder="e.g. 1200000"
                className={`h-11 rounded-r-lg border border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${formData.salary ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                style={{ borderLeft: 0 }}
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                prefix={<span className="text-gray-400 mr-1">{currencySymbol}</span>}
              />
            </Space.Compact>
          </div>
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Total Leaves</span>
            <Input
              type="number"
              placeholder="Days"
              className={`h-11 rounded-lg border border-[#EEEEEE] font-['Manrope:Medium',sans-serif] ${formData.leaves ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              value={formData.leaves}
              onChange={(e) => setFormData({ ...formData, leaves: e.target.value })}
            />
          </div>

          {/* Row 7: Working Hours & Hourly Cost */}
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Working Hours</span>
            <div className="grid grid-cols-2 gap-2">
              <TimePicker
                placeholder="Start"
                format="h:mm a"
                className={`w-full h-11 employee-form-datepicker ${formData.workingHoursStart ? 'employee-form-datepicker-filled' : ''}`}
                value={formData.workingHoursStart ? dayjs(formData.workingHoursStart, 'h:mm a') : null}
                onChange={(time) => setFormData({ ...formData, workingHoursStart: time ? time.format('h:mm a') : '' })}
                suffixIcon={<div className="text-gray-400">⌄</div>}
              />
              <TimePicker
                placeholder="End"
                format="h:mm a"
                className={`w-full h-11 employee-form-datepicker ${formData.workingHoursEnd ? 'employee-form-datepicker-filled' : ''}`}
                value={formData.workingHoursEnd ? dayjs(formData.workingHoursEnd, 'h:mm a') : null}
                onChange={(time) => setFormData({ ...formData, workingHoursEnd: time ? time.format('h:mm a') : '' })}
                suffixIcon={<div className="text-gray-400">⌄</div>}
              />
            </div>
          </div>
          <div className="col-span-6 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Hourly Cost <span className="text-[#666666] font-normal text-[11px] ml-1">(Calculated)</span></span>
            <Input
              placeholder="e.g. 25/Hr"
              readOnly
              className={`h-11 rounded-lg border border-[#EEEEEE] bg-[#F9FAFB] text-[#666666] font-['Manrope:Medium',sans-serif] cursor-not-allowed`}
              value={formData.hourlyRate ? `${formData.hourlyRate}/Hr` : ""}
              prefix={<span className="text-gray-400 mr-1">{currencySymbol}</span>}
            />
          </div>
          <div className="col-span-6 space-y-1">
            {/* Empty or Spacer if needed? For now, we need to place Skillsets at the end. 
                If Skillsets is full width, it should be in a new row. 
                If 'Hourly Cost' is left alone, we can leave an empty space or put Skillsets next to it? 
                Skillsets is typically long (tags). 
                Let's put Skillsets in full width at bottom as requested "to the last", 
                Leaving a blank space next to Hourly Cost, or making Hourly Cost full width?
                Let's make Hourly Cost 6, and leave 6 empty. Or maybe put something else there? 
                Actually, currency selector can be separate? No.
                Let's leave it as is -> Hourly Cost (6) + Empty (6)
                Then Skillsets (12)
            */}
          </div>

          {/* Row 9: Professional Skillsets */}
          <div className="col-span-12 space-y-1">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Professional Skillsets</span>
            <Select
              mode="tags"
              className={`w-full employee-form-select linkedin-skill-select ${formData.skillsets ? 'employee-form-select-filled' : ''}`}
              classNames={{ popup: { root: 'linkedin-skill-dropdown' } }}
              placeholder="Type and press enter (e.g. React, UX Design, etc.)"
              value={formData.skillsets ? formData.skillsets.split(',').filter(s => s.trim()) : []}
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
          /* Force standard 44px height for all form elements */
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
          
          /* Ensure content inside Select is centered */
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
          
          /* Tags should stay centered */
          :global(.ant-select-selection-overflow) {
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }

          /* LinkedIn Style Skills Tags */
          :global(.linkedin-skill-select .ant-select-selection-item) {
            background: #E7F3FF !important;
            border: 1px solid #70B5FF !important;
            border-radius: 4px !important;
            color: #004182 !important;
            font-family: 'Manrope:SemiBold', sans-serif !important;
            font-size: 12px !important;
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
          /* Gray background for all Select dropdowns (default) */
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
          
          /* White background for filled Select dropdowns */
          .employee-form-select-filled .ant-select-selector {
            background-color: white !important;
          }
          
          /* Gray background for DatePicker (default) */
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
          
          /* White background for filled DatePicker */
          .employee-form-datepicker-filled .ant-picker {
            background-color: white !important;
          }
          
          /* Remove extra borders on Input focus */
          .ant-input:focus {
            border-color: #EEEEEE !important;
            box-shadow: none !important;
          }

          /* Currency Select styling */
          :global(.currency-select-addon .ant-select-selector) {
            background-color: transparent !important;
            border: none !important;
            padding: 0 4px !important;
            height: 42px !important; /* Match input height */
            display: flex !important;
            align-items: center !important;
            box-shadow: none !important;
          }
          
          :global(.currency-select-addon) {
             display: flex !important;
             align-items: center !important;
          }
          
          /* Access Level dropdown styling - remove extra background and checkboxes */
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
          /* Show exactly one checkmark - standard antd checkmark is in .ant-select-item-option-state */
          :global(.access-level-popup .ant-select-item-option-state),
          :global(.linkedin-skill-dropdown .ant-select-item-option-state) {
            display: flex !important;
          }
        `}</style>
    </FormLayout>
  );
}
