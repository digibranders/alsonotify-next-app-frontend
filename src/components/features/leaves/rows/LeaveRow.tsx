import { Tooltip, Avatar, Checkbox } from "antd";
import { Calendar, Clock, MessageSquare, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useUserDetails } from "../../../../hooks/useUser";
import { getRoleFromUser } from "../../../../utils/roleUtils";

export interface Leave {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedOn: string;
}

interface LeaveRowProps {
  leave: Leave;
  selected?: boolean;
  onSelect?: () => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  isActionLoading?: boolean;
}

export function LeaveRow({
  leave,
  selected,
  onSelect,
  onApprove,
  onReject,
  isActionLoading
}: LeaveRowProps) {
  const { data: userData } = useUserDetails();
  const userRole = getRoleFromUser(userData?.result);
  const canApprove = ['Admin', 'HR', 'Manager'].includes(userRole);
  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getLeaveTypeConfig = (type: string) => {
    switch (type) {
      case 'sick':
        return { label: 'Sick Leave', color: 'error', bgColor: 'bg-red-50', textColor: 'text-red-600' };
      case 'casual':
        return { label: 'Casual Leave', color: 'warning', bgColor: 'bg-orange-50', textColor: 'text-orange-600' };
      case 'vacation':
        return { label: 'Vacation', color: 'processing', bgColor: 'bg-blue-50', textColor: 'text-blue-600' };
      default:
        return { label: type, color: 'default', bgColor: 'bg-gray-50', textColor: 'text-gray-600' };
    }
  };

  const statusConfig = {
    approved: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Approved' },
    rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Rejected' },
    pending: { icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-50', label: 'Pending' },
  };

  const typeConfig = getLeaveTypeConfig(leave.leaveType);
  const StatusIcon = statusConfig[leave.status].icon;

  return (
    <div
      className={`
        group bg-white border rounded-[16px] px-4 py-3 transition-all duration-300 cursor-pointer relative
        ${selected
          ? 'border-[#ff3b3b] shadow-[0_0_0_1px_#ff3b3b] bg-[#FFF5F5]'
          : 'border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-lg'
        }
      `}
    >
      <div className="grid grid-cols-[40px_48px_1.5fr_1fr_1.5fr_0.8fr_1fr_120px_40px] gap-4 items-center">
        {/* Checkbox */}
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            className="red-checkbox"
          />
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <Avatar
            size={40}
            className="bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] text-sm font-bold"
          >
            {getInitials(leave.employeeName)}
          </Avatar>
        </div>

        {/* Employee */}
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm text-[#111111] truncate group-hover:text-[#ff3b3b] transition-colors">
            {leave.employeeName}
          </span>
          <span className="text-[0.6875rem] text-[#999999] font-normal">
            Applied on {leave.appliedOn}
          </span>
        </div>

        {/* Leave Type */}
        <div className="flex justify-center">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[0.6875rem] font-semibold ${typeConfig.bgColor} ${typeConfig.textColor}`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Duration */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[#111111]">
            <Calendar className="w-3.5 h-3.5 text-[#666666]" />
            <span>{leave.startDate} - {leave.endDate}</span>
          </div>
        </div>

        {/* Days */}
        <div className="flex items-center justify-center gap-1.5 text-center">
          <Clock className="w-3.5 h-3.5 text-[#666666]" />
          <span className="text-[0.8125rem] font-semibold text-[#111111]">
            {leave.days} {leave.days === 1 ? 'Day' : 'Days'}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusConfig[leave.status].bgColor} ${statusConfig[leave.status].color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
              {statusConfig[leave.status].label}
            </span>
          </div>
        </div>

        {/* Actions (Approve/Reject) */}
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {leave.status === 'pending' && canApprove && (
            <>
              <Tooltip title="Approve">
                <button
                  onClick={() => onApprove?.(Number(leave.id))}
                  disabled={isActionLoading}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip title="Reject">
                <button
                  onClick={() => onReject?.(Number(leave.id))}
                  disabled={isActionLoading}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}
        </div>

        {/* Reason Popover/Tooltip */}
        <div className="flex justify-end">
          <Tooltip
            title={leave.reason}
            placement="top"
            classNames={{ root: "max-w-[250px]" }}
            styles={{
              container: {
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                fontFamily: 'inherit'
              }
            }}
          >
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors group/reason">
              <MessageSquare className="w-4 h-4 text-[#666666] group-hover/reason:text-[#ff3b3b]" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
