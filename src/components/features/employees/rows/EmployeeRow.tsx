
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
      className: "text-[0.8125rem] font-medium"
    },
    ...(onDeactivate ? [{
      key: 'deactivate',
      label: employee.status === 'active' ? 'Deactivate' : 'Activate',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: onDeactivate,
      danger: true,
      className: "text-[0.8125rem] font-medium"
    }] : []),
    ...(onDeactivate && isCurrentUser && employee.status === 'active' ? [{
      key: 'deactivate-self',
      label: 'Deactivate',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      disabled: true,
      title: "You cannot deactivate your own account",
      className: "text-[0.8125rem] font-medium text-gray-400 !cursor-not-allowed hover:!bg-transparent hover:!text-gray-400"
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
      <div className="grid grid-cols-[40px_2fr_1.8fr_1.2fr_1fr_1fr_1.2fr_40px] gap-4 items-center">
        {/* Checkbox */}
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="red-checkbox"
          />
        </div>

        {/* Employee Info - Name, Role & Dept */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#111111] group-hover:text-[#ff3b3b] transition-colors">
              {employee.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.6875rem] font-normal text-[#666666]">
              {employee.role}
            </span>
            <span className="text-[#DDDDDD] text-[0.6875rem]">|</span>
            <span className="text-[0.6875rem] font-normal text-[#666666]">
              {employee.department}
            </span>
          </div>
        </div>

        {/* Email */}
        <div>
          <span className="text-[0.8125rem] text-[#111111] font-normal">
            {employee.email}
          </span>
        </div>

        {/* Access */}
        <div className="flex flex-col items-start">
          <AccessBadge role={employee.access} color={employee.roleColor} />
        </div>


        {/* Employment Type */}
        <div>
          <span className="text-[0.8125rem] font-normal text-[#111111]">
            {employee.employment_type || 'Unknown'}
          </span>
        </div>

        {/* Hourly Rate */}
        <div>
          <span className="text-[0.8125rem] font-normal text-[#111111]">
            {employee.hourly_rates ? `$${employee.hourly_rates}/Hr` : 'N/A'}
          </span>
        </div>

        {/* Joining Date */}
        <div>
          <span className="text-[0.8125rem] text-[#111111] font-normal">
            {employee.formattedDateOfJoining || employee.date_of_joining || 'N/A'}
          </span>
        </div>


        {/* Actions */}
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {items.length > 0 && (
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-4 h-4 text-[#999999]" />
              </button>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
}
