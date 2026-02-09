
import { Dropdown, MenuProps, Checkbox } from "antd";
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import { AccessBadge } from '../../../ui/AccessBadge';
import { Employee } from "@/types/domain";

interface EmployeeRowProps {
  employee: Employee;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDeactivate?: () => void;
  onViewDetails?: () => void;
  currentUserId?: number | null;
  currentUserEmail?: string | null;
}

export function EmployeeRow({
  employee,
  selected,
  onSelect,
  onEdit,
  onDeactivate,
  onViewDetails,
  currentUserId,
  currentUserEmail
}: EmployeeRowProps) {

  // Robust check for current user (ID or Email match)
  const isCurrentUser = (currentUserId && Number(employee.id) === Number(currentUserId)) ||
    (currentUserEmail && employee.email && employee.email.toLowerCase() === currentUserEmail.toLowerCase());

  const items: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Edit Details',
      icon: <Edit className="w-3.5 h-3.5" />,
      onClick: onEdit,
      className: "text-[13px] font-['Manrope:Medium',sans-serif]"
    },
    ...(onDeactivate ? [{
      key: 'deactivate',
      label: employee.status === 'active' ? 'Deactivate' : 'Activate',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: onDeactivate,
      danger: true,
      className: "text-[13px] font-['Manrope:Medium',sans-serif]"
    }] : []),
    ...(onDeactivate && isCurrentUser && employee.status === 'active' ? [{
      key: 'deactivate-self',
      label: 'Deactivate',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      disabled: true,
      title: "You cannot deactivate your own account",
      className: "text-[13px] font-['Manrope:Medium',sans-serif] text-gray-400 !cursor-not-allowed hover:!bg-transparent hover:!text-gray-400"
    }] : [])
  ].filter(item => {
    // If it's the current user and we are showing 'deactivate', we want to show the disabled one instead
    // Check key to avoid filtering out 'deactivate-self'
    if (isCurrentUser && employee.status === 'active' && item.key === 'deactivate') {
      return false;
    }
    return true;
  });

  return (
    <div
      onClick={() => onViewDetails?.()}
      className={`
        group bg-white border rounded-[16px] px-4 py-3 transition-all duration-300 cursor-pointer relative z-10
        ${selected
          ? 'border-[#ff3b3b] shadow-[0_0_0_1px_#ff3b3b] bg-[#FFF5F5]'
          : 'border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-lg'
        }
      `}
    >
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[40px_2fr_1.8fr_1.2fr_1fr_1fr_1.2fr_40px] md:gap-4 md:items-center">

        {/* Mobile Top Row: Checkbox + Name + Actions */}
        <div className="flex items-center justify-between md:contents">
          <div className="flex items-center gap-3">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="red-checkbox"
              />
            </div>
            {/* Mobile Name & Role */}
            <div className="md:hidden">
              <span className="font-['Manrope:Bold',sans-serif] text-[14px] text-[#111111]">
                {employee.name}
              </span>
              <div className="text-[11px] text-[#666666]">
                {employee.role}
              </div>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden" onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
                <MoreVertical className="w-4 h-4 text-[#999999]" />
              </button>
            </Dropdown>
          </div>
        </div>

        {/* Desktop Checkbox Placeholder (Already rendered in mobile row but hidden in grid on desktop? No, we need structure) */}
        {/* We need to restructure. The previous grid structure relied on direct children. 
            Responsive grids with different DOM order are tricky. 
            Better approach: 
            Use the grid structure for desktop, and flexible structure for mobile.
            But we can't easily change DOM order without duplication or sub-grids.
            
            Let's use a conditional layout approach within the generic container or CSS Grid areas (complex).
            Simpler: CSS Grid that changes columns on mobile? No, row requires different items.
            
            Let's keep the Desktop structure as primary and use classes to hide/reshuffle.
         */}

        {/* 1. Checkbox (Desktop only, mobile handles it above? No, let's unify) 
             Actually, let's duplicate the structure slightly for clarity if needed, or use careful classes.
         */}

        <div className="hidden md:flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="red-checkbox"
          />
        </div>

        {/* 2. Employee Info - Name, Role & Dept */}
        {/* Desktop: Name/Role/Dept. Mobile: Hidden (handled in generic header above) or shown? 
            Let's hide this block on mobile and show the mobile-specific one above? 
            Or make this adaptable.
        */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2">
            <span className="font-['Manrope:Bold',sans-serif] text-[14px] text-[#111111] group-hover:text-[#ff3b3b] transition-colors">
              {employee.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-['Manrope:Regular',sans-serif] text-[#666666]">
              {employee.role}
            </span>
            <span className="text-[#DDDDDD] text-[11px]">|</span>
            <span className="text-[11px] font-['Manrope:Regular',sans-serif] text-[#666666]">
              {employee.department}
            </span>
          </div>
        </div>

        {/* 3. Email */}
        <div className="md:block hidden">
          <span className="text-[13px] text-[#111111] font-['Manrope:Regular',sans-serif]">
            {employee.email}
          </span>
        </div>

        {/* Mobile Info Grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 md:hidden pl-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#999999] uppercase">Email</span>
            <span className="text-[12px] truncate">{employee.email}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#999999] uppercase">Department</span>
            <span className="text-[12px] truncate">{employee.department}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#999999] uppercase">Type</span>
            <span className="text-[12px]">{employee.employmentType || '-'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#999999] uppercase">Joined</span>
            <span className="text-[12px]">{employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-'}</span>
          </div>
        </div>

        {/* 4. Access Badge */}
        <div className="flex flex-col items-start md:items-start pl-8 md:pl-0 mt-2 md:mt-0">
          <AccessBadge role={employee.access} color={employee.roleColor} />
        </div>

        {/* 5. Employment Type (Desktop) */}
        <div className="hidden md:block">
          <span className="text-[13px] font-['Manrope:Regular',sans-serif] text-[#111111]">
            {employee.employmentType || 'Unknown'}
          </span>
        </div>

        {/* 6. Hourly Rate (Desktop only for now, maybe hide on mobile to save space) */}
        <div className="hidden md:block">
          <span className="text-[13px] font-['Manrope:Regular',sans-serif] text-[#111111]">
            {employee.hourlyRate}
          </span>
        </div>

        {/* 7. Joining Date (Desktop) */}
        <div className="hidden md:block">
          <span className="text-[13px] text-[#111111] font-['Manrope:Regular',sans-serif]">
            {employee.dateOfJoining}
          </span>
        </div>

        {/* 8. Actions (Desktop) */}
        <div className="hidden md:flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4 text-[#999999]" />
            </button>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
