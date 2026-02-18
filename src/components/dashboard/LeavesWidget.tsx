import svgPaths from "../../constants/iconPaths";
import { Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Skeleton } from '../ui/Skeleton';
import Image from "next/image";
import dayjs from "dayjs";
import { useCompanyLeaves } from "../../hooks/useLeave";
import { LeaveType } from "../../services/leave";
import { LeaveApplyModal } from "../modals/LeaveApplyModal";

// Helper function to get initials from name
const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Helper function to format date range
const formatDateRange = (startDate: string, endDate: string): string => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (start.isSame(end, "day")) {
    return start.format("MMM D, YYYY");
  }

  // Same month
  if (start.month() === end.month() && start.year() === end.year()) {
    return `${start.format("MMM D")} - ${end.format("D, YYYY")}`;
  }

  // Different months, same year
  if (start.year() === end.year()) {
    return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
  }

  // Different years
  return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
};

// Helper function to format duration
const formatDuration = (days: number): string => {
  if (days === 1) {
    return "1 Day";
  }
  return `${days} Days`;
};


export function LeavesWidget({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const { data, isLoading, error, refetch } = useCompanyLeaves();

  // Process and filter leaves
  const processedLeaves = useMemo(() => {
    if (!data?.result) return [];

    const today = dayjs().startOf("day");

    // Filter to show only approved leaves that are upcoming or current
    const filtered = data.result
      .filter((leave: LeaveType) => {
        const endDate = dayjs(leave.end_date).startOf("day");
        // Show only APPROVED leaves that haven't ended yet
        const isApproved = leave.status.toUpperCase() === 'APPROVED';
        return isApproved && (endDate.isAfter(today) || endDate.isSame(today, "day"));
      })
      .sort((a: LeaveType, b: LeaveType) => {
        // Sort by start date, earliest first
        return dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf();
      });

    return filtered.map((leave: LeaveType) => {
      // Calculate total duration: from start date (inclusive) to end date (inclusive)
      const startDate = dayjs(leave.start_date).startOf("day");
      const endDate = dayjs(leave.end_date).startOf("day");
      
      const totalDuration = Math.max(1, endDate.diff(startDate, "day") + 1);
      
      return {
        id: leave.id,
        name: leave.user?.name || "Unknown Employee",
        dateRange: formatDateRange(leave.start_date, leave.end_date),
        duration: formatDuration(totalDuration),
        avatar: leave.user?.avatar || null,
        initials: getInitials(leave.user?.name),
      };
    });
  }, [data]);

  // Get unique leave types for the form dropdown
  const availableLeaveTypes = useMemo(() => {
    if (!data?.result) return ['Sick Leave', 'Casual Leave', 'Vacation'];
    const types = new Set(data.result.map((leave: LeaveType) => leave.leave_type));
    return Array.from(types).filter(Boolean).length > 0
      ? Array.from(types).filter(Boolean) as string[]
      : ['Sick Leave', 'Casual Leave', 'Vacation'];
  }, [data]);

  return (
    <>
      <div className="bg-white rounded-[24px] p-5 w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xl text-[#111111]">Leaves</h3>
            <button onClick={() => setShowDialog(true)} className="hover:scale-110 active:scale-95 transition-transform">
              <Plus className="size-5 text-[#FF4500]" strokeWidth={2} />
            </button>
          </div>
          <button className="flex items-center gap-1 text-[#666666] text-sm font-semibold hover:text-[#111111] transition-colors" onClick={() => onNavigate && onNavigate('leaves')}>
            <span>View All</span>
            <svg className="size-[17px]" fill="none" viewBox="0 0 17 17">
              <path d={svgPaths.p3ac7a560} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Leaves List */}
        <div className="flex flex-col gap-2.5 flex-1 mt-2 overflow-y-auto scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-[#EEEEEE]">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar Skeleton */}
                    <div className="flex-shrink-0">
                      <Skeleton className="w-[48px] h-[48px] rounded-full" />
                    </div>
                    {/* Leave Details Skeleton */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <Skeleton className="h-4 w-32 rounded-md" />
                          <Skeleton className="h-3 w-24 rounded-md" />
                        </div>
                        {/* Duration Badge Skeleton */}
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm font-normal text-[#666666]">
                Unable to load leaves at the moment. Please try again later.
              </p>
            </div>
          ) : processedLeaves.length === 0 ? (
            <div className="bg-white rounded-[10px] border border-dashed border-[#CCCCCC] py-4 flex items-center justify-center">
              <p className="text-sm font-normal text-[#666666]">No leaves to display at the moment</p>
            </div>
          ) : (
            <>
              {processedLeaves.map((leave) => (
                <LeaveItem key={leave.id} {...leave} />
              ))}
            </>
          )}
        </div>
      </div>

      <LeaveApplyModal
        open={showDialog}
        onCancel={() => setShowDialog(false)}
        onSuccess={async () => {
          await refetch();
        }}
        availableLeaveTypes={availableLeaveTypes}
      />
    </>
  );
}

function LeaveItem({ name, dateRange, duration, avatar, initials }: { name: string; dateRange: string; duration: string; avatar: string | null; initials: string }) {
  return (
    <div className="group p-3 rounded-xl border border-[#EEEEEE] hover:border-[#ff3b3b]/20 transition-all duration-300 hover:shadow-lg cursor-pointer">
      <div className="flex items-center gap-2.5">
        {/* Avatar - Match meeting date badge size */}
        <div className="flex-shrink-0">
          <div className="w-[48px] h-[48px] rounded-full overflow-hidden bg-[#F7F7F7] flex items-center justify-center">
            {avatar ? (
              <Image src={avatar} alt={name} width={48} height={48} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-[#666666]">
                {initials}
              </span>
            )}
          </div>
        </div>

        {/* Leave Details + Duration */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {/* Name + Date stacked on the left */}
            <div className="flex flex-col min-w-0">
              <h4 className="font-semibold text-[0.8125rem] text-[#111111] line-clamp-1">
                {name}
              </h4>
              <span className="text-[#666666] text-[0.6875rem] font-normal mt-0.5">
                {dateRange}
              </span>
            </div>

            {/* Duration Badge vertically centered on the right */}
            <div className="flex-shrink-0 self-center">
              <span className="inline-block px-2.5 py-1 rounded-full bg-[#EEEEEE] text-[0.6875rem] font-normal text-[#333333]">
                {duration}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}