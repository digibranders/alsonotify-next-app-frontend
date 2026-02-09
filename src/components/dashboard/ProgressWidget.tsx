
import { ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
import { useTasks } from '@/hooks/useTask';
import { useWorkspaces } from '@/hooks/useWorkspace';
import { useUserDetails } from '@/hooks/useUser';
import { getRequirementsByWorkspaceId } from '@/services/workspace';
import { DateRangeSelector } from '../common/DateRangeSelector';
import { Skeleton } from '../ui/Skeleton';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ApiResponse } from '@/types/api';
import { RequirementDto } from '@/types/dto/requirement.dto';

export function ProgressWidget({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => {
    const now = dayjs();
    return [now.startOf('month'), now.endOf('month')];
  });

  // Construct query string for tasks based on date range
  const taskQueryString = useMemo(() => {
    let query = "limit=1000&skip=0";
    if (dateRange && dateRange[0] && dateRange[1]) {
      query += `&start_date[start]=${dateRange[0].startOf('day').toISOString()}&start_date[end]=${dateRange[1].endOf('day').toISOString()}`;
    }
    return query;
  }, [dateRange]);

  // Helper to get label for ProgressCard
  const getRangeLabel = () => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0];
      const end = dateRange[1];
      const now = dayjs();

      if (start.isSame(now.startOf('day'), 'day') && end.isSame(now.endOf('day'), 'day')) return 'Today';
      if (start.isSame(now.subtract(1, 'day').startOf('day'), 'day') && end.isSame(now.subtract(1, 'day').endOf('day'), 'day')) return 'Yesterday';
      if (start.isSame(now.startOf('isoWeek'), 'day') && end.isSame(now.endOf('isoWeek'), 'day')) return 'This Week';
      if (start.isSame(now.startOf('month'), 'day') && end.isSame(now.endOf('month'), 'day')) return 'This Month';
      if (start.isSame(now.subtract(1, 'month').startOf('month'), 'day') && end.isSame(now.subtract(1, 'month').endOf('month'), 'day')) return 'Last Month';
      if (start.isSame(now.startOf('year'), 'day') && end.isSame(now.endOf('year'), 'day')) return 'This Year';
      if (start.isSame(now.subtract(1, 'year').startOf('year'), 'day') && end.isSame(now.subtract(1, 'year').endOf('year'), 'day')) return 'Last Year';

      return `${start.format('MMM D')} - ${end.format('MMM D')}`;
    }
    return 'All Time';
  };


  // Fetch all tasks
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks(taskQueryString);

  // Fetch all workspaces to get requirements
  const { data: workspacesData, isLoading: isLoadingWorkspaces } = useWorkspaces("");

  // Calculate task statistics
  const taskData = useMemo(() => {
    if (!tasksData?.result || isLoadingTasks) {
      return { completed: 0, total: 0, percentage: 0, inProgress: 0, delayed: 0 };
    }

    const tasks = tasksData.result;
    let completed = 0;
    let inProgress = 0;
    let delayed = 0;

    tasks.forEach((task: { status?: string }) => {
      const status = task.status?.toLowerCase() || '';
      // Task statuses: Assigned, In_Progress, Completed, Delayed, Impediment, Review, Stuck, New Task
      if (status.includes('completed') || status === 'done') {
        completed++;
      } else if (status.includes('delayed') || status.includes('stuck') || status.includes('impediment') || status.includes('blocked')) {
        delayed++;
      } else {
        // Default everything else (In Progress, Assigned, New Task, etc.) to In Progress
        inProgress++;
      }
    });

    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage, inProgress, delayed };
  }, [tasksData, isLoadingTasks]);

  // Get all workspace IDs
  const workspaceIds = useMemo(() => {
    return workspacesData?.result?.workspaces?.map((w: { id: number }) => w.id) || [];
  }, [workspacesData]);

  // Fetch requirements for all workspaces in parallel
  const requirementQueries = useQueries({
    queries: workspaceIds.map((id: number) => ({
      queryKey: ['requirements', id],
      queryFn: () => getRequirementsByWorkspaceId(id),
      enabled: !!id && workspaceIds.length > 0 && !isLoadingWorkspaces,
    })),
  });

  const isLoadingRequirements = requirementQueries.some(q => q.isLoading);

  // Combine all requirements from all workspaces
  const allRequirements = useMemo(() => {
    const combined: Array<{ status?: string; start_date?: string }> = [];
    requirementQueries.forEach((query) => {
      const data = query.data as ApiResponse<RequirementDto[]>;
      if (data?.result && Array.isArray(data.result)) {
        combined.push(...data.result);
      }
    });
    return combined;
  }, [requirementQueries]);

  // Calculate requirements statistics
  const requirementsData = useMemo(() => {
    if (isLoadingRequirements || isLoadingWorkspaces) {
      return { completed: 0, total: 0, percentage: 0, inProgress: 0, delayed: 0 };
    }

    let completed = 0;
    let inProgress = 0;
    let delayed = 0;
    let total = 0;

    allRequirements.forEach((req: { status?: string; start_date?: string }) => {
      // Filter by date if range is selected
      if (dateRange && dateRange[0] && dateRange[1]) {
        // Use start_date for filtering requirements
        const reqDate = req.start_date ? dayjs(req.start_date) : null;
        if (!reqDate || reqDate.isBefore(dateRange[0].startOf('day')) || reqDate.isAfter(dateRange[1].endOf('day'))) {
          return;
        }
      }

      // Count this requirement in the total
      total++;

      const status = req.status?.toLowerCase() || '';
      // Requirement statuses: Assigned, In_Progress, On_Hold, Submitted, Completed, Waiting, Rejected, Review, Revision, Impediment, Stuck
      if (status.includes('completed')) {
        completed++;
      } else if (status.includes('stuck') || status.includes('impediment')) {
        delayed++;
      } else {
        // Default everything else (In Progress, Assigned, etc.) to In Progress
        inProgress++;
      }
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage, inProgress, delayed };
  }, [allRequirements, isLoadingRequirements, isLoadingWorkspaces, dateRange]);

  // Fetch user details for filtering tasks by current user
  const { data: userDetailsData } = useUserDetails();
  const currentUserId = userDetailsData?.result?.id;

  // Calculate Hours Capacity Data
  const hoursData = useMemo(() => {
    // Default zero state
    if (!tasksData?.result || isLoadingTasks || !currentUserId) {
      return { allotted: 0, total: 160, percentage: 0, remaining: 160 };
    }

    // 1. Calculate Allotted Hours (Sum of estimated time of fetched tasks ASSIGNED TO CURRENT USER)
    const allotted = Math.round(tasksData.result.reduce((acc: number, task: any) => {
      // Filter: Check if task is assigned to current user
      // API might return 'assignedTo' as object or string, or 'assignedToUser' object, or 'taskMembers' array
      // We check widely to be safe
      let isAssigned = false;

      // Direct assignment check
      if (task.assignedTo?.id === currentUserId || task.assignedToUser?.id === currentUserId) isAssigned = true;

      // Member list check (if available)
      if (!isAssigned && Array.isArray(task.taskMembers)) {
        isAssigned = task.taskMembers.some((m: any) => m.userId === currentUserId || m.user_id === currentUserId);
      }
      // Fallback: assignedTo might be string name, but we can't reliably match ID. 
      // Assuming object existence for rigorous check as per "lggedin user" requirement.

      if (isAssigned) {
        // Handle various property casing from API
        const est = Number(task.estimatedTime || task.estimated_time || task.estTime || 0);
        return acc + (isNaN(est) ? 0 : est);
      }
      return acc;
    }, 0));

    // 2. Calculate Total Capacity based on Date Range
    let total = 160; // Default fallback
    if (dateRange && dateRange[0] && dateRange[1]) {
      const days = dateRange[1].diff(dateRange[0], 'day') + 1;
      // Use user's working hours or default to 8
      const dailyHours = Number(userDetailsData?.result?.workingHours) || 8;
      // Subtract break time (in minutes) converted to hours
      const breakTimeMinutes = Number(userDetailsData?.result?.breakTime) || 0;
      const netDailyHours = Math.max(0, dailyHours - (breakTimeMinutes / 60));

      // Assume 5 working days per week
      const workDays = Math.max(1, Math.round(days * (5 / 7)));
      total = Math.round(workDays * netDailyHours);
    }

    const percentage = total > 0 ? Math.round((allotted / total) * 100) : 0;
    const remaining = Math.max(0, total - allotted);

    return { allotted, total, percentage, remaining };
  }, [tasksData, isLoadingTasks, dateRange, currentUserId, userDetailsData?.result?.workingHours, userDetailsData?.result?.breakTime]);

  const isLoading = isLoadingTasks || isLoadingWorkspaces || isLoadingRequirements;

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 p-4 w-full min-h-0 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="font-['Manrope:SemiBold',sans-serif] text-base sm:text-[20px] text-[#111111]">Progress</h3>
        <div className="relative z-20">
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            defaultRangeType="this_month"
          />
        </div>
      </div>

      {/* Card group: Requirements, Tasks, Hours Capacity — always contained inside this widget */}
      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden mt-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
          <ProgressCard
          title="Requirements"
          data={requirementsData}
          isLoading={isLoading}
          dateRangeLabel={getRangeLabel()}
          onClick={() => onNavigate && onNavigate('requirements')}
          onStatusClick={(status: string) => {
            if (onNavigate) {
              // Map status to requirements page tab
              let tab = 'active'; // Default to active tab
              if (status === 'Completed') {
                tab = 'completed';
              } else if (status === 'In Progress') {
                tab = 'active';
              } else if (status === 'Delayed') {
                tab = 'delayed'; // Correctly map to delayed tab
              }
              onNavigate(`requirements?tab=${tab}`);
            }
          }}
        />

        <ProgressCard
          title="Tasks"
          data={taskData}
          isLoading={isLoading}
          dateRangeLabel={getRangeLabel()}
          onClick={() => onNavigate && onNavigate('tasks')}
          onStatusClick={(status: string) => {
            if (onNavigate) {
              // Map status to tasks page tab
              let tab = 'all';
              if (status === 'In Progress') {
                tab = 'In_Progress';
              } else if (status === 'Completed') {
                tab = 'Completed';
              } else if (status === 'Delayed') {
                tab = 'Delayed';
              }
              onNavigate(`tasks?tab=${tab}`);
            }
          }}
        />
        </div>
        <div className="shrink-0">
          <HoursBar data={hoursData} onClick={() => onNavigate && onNavigate('tasks')} />
        </div>
      </div>
    </div>
  );
}

interface HoursBarProps {
  data: {
    allotted: number;
    total: number;
    percentage: number;
    remaining: number;
  };
  onClick?: () => void;
}

function HoursBar({ data, onClick }: HoursBarProps) {
  return (
    <div
      className="group relative bg-white rounded-[14px] border border-gray-100 p-2.5 sm:p-3 hover:shadow-lg hover:border-[#ff3b3b]/10 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-y-2 gap-x-3 sm:gap-4 pr-10 sm:pr-0 min-w-0">
        {/* Label Section - Order 1 - min-w-0 allows truncation on very narrow screens */}
        <div className="flex items-center gap-2 sm:min-w-[110px] order-1 min-w-0">
          <h4 className="font-['Manrope',sans-serif] font-semibold text-[11px] sm:text-[12px] text-[#111111] truncate">Hours Capacity</h4>
        </div>

        {/* Stats Section - Order 2 on Mobile, Order 3 on Desktop - min-w-0 allows truncation when needed */}
        <div className="flex items-center gap-3 sm:gap-4 sm:min-w-[170px] order-2 sm:order-3 ml-0 sm:ml-0 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#666666] font-medium font-['Inter',sans-serif]">Balance:</span>
            <span className="text-[11px] sm:text-[12px] font-bold text-[#111111] font-['Manrope',sans-serif]">{data.remaining}h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#666666] font-medium font-['Inter',sans-serif]">Total:</span>
            <span className="text-[11px] sm:text-[12px] font-bold text-[#111111] font-['Manrope',sans-serif]">{data.total}h</span>
          </div>
        </div>

        {/* Progress Bar Section - Order 3 on Mobile (New Line), Order 2 on Desktop */}
        <div className="w-full sm:flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden order-3 sm:order-2 basis-full sm:basis-auto mt-1 sm:mt-0">
          <div
            className="h-full bg-gradient-to-r from-[#7ccf00] to-[#6ab800] transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(data.percentage, 100)}%` }}
          />
        </div>

        {/* Arrow Icon - Desktop Only - Order 4 */}
        <div className="hidden sm:flex w-6 h-6 rounded-full bg-gray-50 items-center justify-center group-hover:bg-[#ff3b3b] transition-colors duration-300 shrink-0 order-4">
          <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors duration-300" />
        </div>
      </div>

      {/* Arrow Icon - Mobile Only (Absolute) */}
      <div className="absolute top-3 right-3 flex sm:hidden w-6 h-6 rounded-full bg-gray-50 items-center justify-center pointer-events-none">
        <ArrowRight className="w-3 h-3 text-gray-400" />
      </div>
    </div>
  );
}

interface ProgressCardProps {
  title: string;
  data: {
    completed: number;
    total: number;
    percentage: number;
    inProgress: number;
    delayed: number;
  };
  isLoading?: boolean;
  dateRangeLabel?: string;
  onClick?: () => void;
  onStatusClick?: (status: string) => void;
}

function ProgressCard({ title, data, isLoading = false, dateRangeLabel = 'this period', onClick, onStatusClick }: ProgressCardProps) {
  const isSm = useBreakpoint('sm');
  const isMd = useBreakpoint('md');
  const chartSize = isMd ? 130 : isSm ? 110 : 88;
  const innerRadius = isMd ? 45 : isSm ? 42 : 34;
  const outerRadius = isMd ? 60 : isSm ? 52 : 40;

  const chartData = [
    { name: 'Completed', value: data.completed, color: '#0F9D58' },   // Green - matches reference
    { name: 'In Progress', value: data.inProgress, color: '#2F80ED' }, // Blue - matches reference
    { name: 'Delayed', value: data.delayed, color: '#ff3b3b' },      // Red - matches reference
  ];

  // Filter out zero values for the chart only
  const activeData = chartData.filter(d => d.value > 0);

  // Data to render: if total is 0, use a placeholder ring
  const renderData = data.total === 0
    ? [{ name: 'Empty', value: 1, color: '#f3f4f6' }]
    : activeData;

  if (isLoading) {
    return (
      <div className="group relative flex flex-col bg-white rounded-[20px] border border-gray-100 p-3 sm:p-4 h-full overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-3 z-10 shrink-0">
          <Skeleton className="h-5 sm:h-6 w-20 sm:w-24 rounded-md" />
          <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 flex items-center gap-3 sm:gap-5 min-h-[100px] sm:min-h-[120px] md:min-h-[140px] px-3 sm:px-4">
          {/* Chart Skeleton - responsive size */}
          <Skeleton className="w-[88px] h-[88px] sm:w-[110px] sm:h-[110px] md:w-[130px] md:h-[130px] rounded-full shrink-0" />
          {/* Legend Skeleton */}
          <div className="flex-1 flex flex-col justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 rounded-md" />
                </div>
                <Skeleton className="h-4 sm:h-5 w-6 sm:w-8 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex flex-col bg-white rounded-[20px] border border-gray-100 p-3 sm:p-4 hover:shadow-lg hover:border-[#ff3b3b]/10 transition-all duration-300 cursor-pointer h-full"
      onClick={onClick}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3 z-10 shrink-0">
        <h4 className="font-['Manrope',sans-serif] font-semibold text-[14px] sm:text-[16px] text-[#111111]">{title}</h4>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#ff3b3b] transition-colors duration-300">
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
        </div>
      </div>

      {/* Content Container - Side by Side Layout; px-3 sm:px-4 for consistent legend spacing from card edge */}
      <div className="flex-1 flex items-center gap-3 sm:gap-5 min-h-[100px] sm:min-h-[120px] md:min-h-[140px] px-3 sm:px-4">
        {/* Chart Section - responsive size */}
        <div className="relative w-[88px] h-[88px] sm:w-[110px] sm:h-[110px] md:w-[130px] md:h-[130px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={renderData}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={data.total === 0 ? 0 : 4}
                cornerRadius={data.total === 0 ? 0 : 4}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {renderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      // If total is 0, show a message instead of "0 Total"
                      if (data.total === 0) {
                        const itemType = title.toLowerCase();
                        // Create a more readable message based on date range
                        let periodText = (dateRangeLabel || 'this period').toLowerCase();
                        // Handle custom date ranges (format: "MMM D - MMM D")
                        if (periodText.includes(' - ')) {
                          periodText = 'this period';
                        }
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 8}
                              className="fill-[#666666] text-[10px] font-medium font-['Manrope',sans-serif]"
                            >
                              No {itemType}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 8}
                              className="fill-[#666666] text-[10px] font-medium font-['Manrope',sans-serif]"
                            >
                              {periodText}
                            </tspan>
                          </text>
                        );
                      }

                      // Otherwise show the total number (responsive: smaller on mobile)
                      const dy = chartSize <= 88 ? 14 : 20;
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-[#111111] text-2xl sm:text-3xl font-extrabold font-['Manrope',sans-serif] tracking-tight"
                          >
                            {data.total || 0}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + dy}
                            className="fill-[#999999] text-[10px] sm:text-[11px] font-semibold font-['Manrope',sans-serif] uppercase tracking-wider"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Stats Section - min-w-0 so legend can shrink; gap between label and number via justify-between */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {chartData.map((item) => (
            <div
              key={item.name}
              onClick={(e) => {
                e.stopPropagation();
                if (onStatusClick) {
                  onStatusClick(item.name);
                }
              }}
              className={`flex items-center justify-between w-full py-2 border-b border-gray-50 last:border-0 group/item transition-colors rounded-lg pl-2 pr-1 ${onStatusClick
                ? 'hover:bg-gray-50/50 cursor-pointer'
                : 'cursor-default'
                } ${item.value === 0 ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white shadow-sm" style={{ backgroundColor: item.color }} />
                <span className={`text-[12px] sm:text-[13px] font-medium font-['Manrope',sans-serif] whitespace-nowrap group-hover/item:text-[#111111] transition-colors ${item.value > 0 ? 'text-[#111111]' : 'text-[#666666]'
                  }`}>
                  {item.name === 'In Progress' ? 'In Progress' : item.name}
                </span>
              </div>
              <span className={`text-[14px] sm:text-[16px] font-bold font-['Manrope',sans-serif] ${item.value > 0 ? 'text-[#111111]' : 'text-[#666666]'
                }`}>
                {item.value || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}