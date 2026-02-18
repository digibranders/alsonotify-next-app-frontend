
import { ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
import { useTasks } from '@/hooks/useTask';
import { useWorkspaces } from '@/hooks/useWorkspace';
import { useUserDetails, useCurrentUserCompany } from '@/hooks/useUser';
import { Task } from '@/types/domain';
import { getRequirementsByWorkspaceId } from '@/services/workspace';
import { DateRangeSelector } from '../common/DateRangeSelector';
import { Skeleton } from '../ui/Skeleton';
import { ApiResponse } from '@/types/api';
import { RequirementDto } from '@/types/dto/requirement.dto';
import { useAccountType } from '@/utils/accountTypeUtils';
import { getWorkingDaysCount } from '@/utils/date';

export function ProgressWidget({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => {
    const now = dayjs();
    return [now.startOf('month'), now.endOf('month')];
  });

  // Check account type to conditionally show Hours Capacity widget
  const { isIndividual } = useAccountType();

  // Fetch company settings for working hours
  const { data: companyData } = useCurrentUserCompany();

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

    tasks.forEach((task) => {
      const status = task.status?.toLowerCase() || '';

      // Calculate strict delay based on due date (matches TasksPage logic)
      let isOverdue = false;
      if (task.end_date) {
        const endDate = dayjs(task.end_date);
        // Check if end date is before today (start of day)
        if (endDate.isValid() && endDate.isBefore(dayjs().startOf('day'))) {
          isOverdue = true;
        }
      }

      // Calculate if time spent exceeds estimated time
      const estTime = Number(task.estimated_time || 0);
      const timeSpent = Number(task.time_spent || 0);
      const isOverEstimate = estTime > 0 && timeSpent > estTime;

      // Check for completion first
      const isCompleted = status.includes('completed') || status === 'done';

      if (isCompleted) {
        completed++;
      } else if (isOverdue || isOverEstimate) {
        // STRICTLY time-based: Delayed (Missed due date OR crossed estimated time)
        // Stuck/Impediment statuses are NOT counted here unless time criteria are met.
        delayed++;
      } else {
        // Default everything else to In Progress
        // Exclude Stuck/Impediment/Blocked from In Progress count as per user request
        const isStuckOrImpediment =
          status.includes('stuck') ||
          status.includes('impediment') ||
          status.includes('blocked');

        if (!isStuckOrImpediment) {
          inProgress++;
        }
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
    const combined: RequirementDto[] = [];
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

    allRequirements.forEach((req) => {
      // Filter by date if range is selected
      if (dateRange && dateRange[0] && dateRange[1]) {
        // Use start_date for filtering requirements
        const reqDate = req.start_date ? dayjs(req.start_date) : null;
        if (!reqDate || reqDate.isBefore(dateRange[0].startOf('day')) || reqDate.isAfter(dateRange[1].endOf('day'))) {
          return;
        }
      }

      // Filter: Exclude archived requirements
      if (req.is_archived) {
        return;
      }

      const status = req.status?.toLowerCase() || '';

      // Filter: Exclude Draft and Pending (Waiting, Submitted, Rejected) requirements from dashboard
      if (status === 'draft' || status === 'waiting' || status === 'submitted' || status === 'rejected') {
        return;
      }

      // Count this requirement in the total
      total++;

      // Calculate strict delay for requirements based on end date
      let isOverdue = false;
      if (req.end_date) {
        const endDate = dayjs(req.end_date);
        // Check if end date is before today (start of day)
        if (endDate.isValid() && endDate.isBefore(dayjs().startOf('day'))) {
          isOverdue = true;
        }
      }

      // Requirement statuses
      const isCompleted = status.includes('completed');

      if (isCompleted) {
        completed++;
      } else if (isOverdue) {
        // STRICTLY time-based: Delayed (Missed due date)
        delayed++;
      } else {
        // Exclude Stuck/Impediment from In Progress count
        const isStuckOrImpediment = status.includes('stuck') || status.includes('impediment');

        if (!isStuckOrImpediment) {
          inProgress++;
        }
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
    // 1. Calculate Allotted Hours (Sum of estimated time of fetched tasks ASSIGNED TO CURRENT USER)
    // Always calculate allotted if tasks exist, regardless of capacity
    const allotted = (!tasksData?.result || isLoadingTasks || !currentUserId)
      ? 0
      : Math.round((tasksData.result as Task[]).reduce((acc: number, task: Task) => {
        // Filter: Check if task is assigned to current user
        let isAssigned = false;

        // Direct assignment check (assigned_to_user is preferred)
        if (task.leader_user?.id === currentUserId || task.member_user?.id === currentUserId) {
          isAssigned = true;
        }

        // Handle assignedTo legacy path
        if (!isAssigned && task.member_user) {
          if (task.member_user.id === currentUserId) isAssigned = true;
        }

        // Member list check
        if (!isAssigned && Array.isArray(task.task_members)) {
          isAssigned = task.task_members.some((m) => (m.user_id === currentUserId || m.user?.id === currentUserId));
        }

        if (isAssigned) {
          // Handle various property casing from API safely
          const estValue = task.estTime ?? task.estimated_time ?? 0;
          const est = Number(estValue);
          return acc + (isNaN(est) ? 0 : est);
        }
        return acc;
      }, 0));

    // 2. Calculate Total Capacity dynamically
    let total = 0;

    // Helper to calculate hours from start/end time strings "HH:mm"
    const calculateDailyHours = (startStr?: string, endStr?: string): number => {
      if (!startStr || !endStr) return 0;
      const start = dayjs(startStr, ['h:mm a', 'h:mm A', 'HH:mm']);
      const end = dayjs(endStr, ['h:mm a', 'h:mm A', 'HH:mm']);
      if (start.isValid() && end.isValid()) {
        return Math.abs(end.diff(start, 'minute')) / 60;
      }
      return 0;
    };

    // --- Configuration Sources ---
    const userProfile = userDetailsData?.result?.user_profile;
    const companySettings = companyData?.result?.working_hours;

    // A. Daily Hours Logic (User > Company > 0)
    let grossDailyHours = 0;

    // Check User Profile
    if (userProfile?.working_hours?.start_time && userProfile?.working_hours?.end_time) {
      grossDailyHours = calculateDailyHours(userProfile.working_hours.start_time, userProfile.working_hours.end_time);
    }

    // Check Company Settings if User Profile is missing/incomplete
    if (grossDailyHours === 0 && companySettings?.start_time && companySettings?.end_time) {
      grossDailyHours = calculateDailyHours(companySettings.start_time, companySettings.end_time);
    }

    // B. Break Time Logic (User > Company > 0)
    let breakTimeMinutes = 0;

    // Check User Profile
    if (userProfile?.working_hours?.break_time !== undefined) {
      breakTimeMinutes = Number(userProfile.working_hours.break_time);
    }
    // Check Company Settings
    else if (companySettings?.break_time !== undefined) {
      breakTimeMinutes = Number(companySettings.break_time);
    }

    // C. Working Days Logic (Company > Default Mon-Fri)
    // Note: User-specific working days aren't standard in profile yet, so we rely on Company Settings.
    let workingDaysConfig: string[] | undefined = undefined;
    if (Array.isArray(companySettings?.working_days) && companySettings.working_days.length > 0) {
      workingDaysConfig = companySettings.working_days;
    }

    // D. Final Calculation
    const netDailyHours = Math.max(0, grossDailyHours - (breakTimeMinutes / 60));

    if (dateRange && dateRange[0] && dateRange[1] && netDailyHours > 0) {
      // Calculate precise working days based on configuration
      const workDays = getWorkingDaysCount(dateRange[0], dateRange[1], workingDaysConfig);
      total = Math.round(workDays * netDailyHours);
    }

    const percentage = total > 0 ? Math.round((allotted / total) * 100) : 0;
    const remaining = Math.max(0, total - allotted);

    return { allotted, total, percentage, remaining };
  }, [tasksData, isLoadingTasks, dateRange, currentUserId, companyData?.result?.working_hours, userDetailsData?.result]);

  const isLoading = isLoadingTasks || isLoadingWorkspaces || isLoadingRequirements;

  return (
    <div className="bg-white rounded-[24px] p-5 w-full h-full flex flex-col overflow-y-auto border border-[#EEEEEE]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="font-semibold text-xl text-[#111111]">Progress</h3>
        {/* Date Range Selector */}
        <div className="relative z-20">
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            defaultRangeType="this_month"
          />
        </div>
      </div>

      {/* Main Content Area - contains cards and hours bar */}
      <div className="flex-1 flex flex-col min-h-0 gap-3">
        {/* Sub-cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-[160px]">
          <ProgressCard
            title="Requirements"
            data={requirementsData}
            isLoading={isLoading}
            dateRangeLabel={getRangeLabel()}
            onClick={() => onNavigate && onNavigate('requirements')}
            onStatusClick={(status: string) => {
              if (onNavigate) {
                let tab = 'active';
                if (status === 'Completed') {
                  tab = 'completed';
                } else if (status === 'In Progress') {
                  tab = 'active';
                } else if (status === 'Delayed') {
                  tab = 'delayed';
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

        {/* Hours Bar - Only show for ORGANIZATION accounts */}
        {!isIndividual && (
          <div className="shrink-0">
            <HoursBar data={hoursData} onClick={() => onNavigate && onNavigate('tasks')} />
          </div>
        )}
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
  const isOverCapacity = data.allotted > data.total && data.total > 0;

  return (
    <div
      className="group bg-[#fafafa] rounded-[14px] border border-gray-100 p-3 hover:shadow-md hover:border-[#ff3b3b]/15 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Label Section */}
        <h4 className="font-semibold text-xs text-[#111111] shrink-0 w-[100px]">Hours Capacity</h4>

        {/* Progress Bar Section */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${isOverCapacity
                ? 'bg-gradient-to-r from-[#ff3b3b] to-[#e02020]'
                : 'bg-gradient-to-r from-[#7ccf00] to-[#6ab800]'
                }`}
              style={{ width: `${Math.min(data.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats Section */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[0.625rem] text-[#888888] font-medium">Balance:</span>
            <span className={`text-xs font-bold ${isOverCapacity ? 'text-[#ff3b3b]' : 'text-[#111111]'}`}>
              {data.remaining}h
            </span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1">
            <span className="text-[0.625rem] text-[#888888] font-medium">Total:</span>
            <span className="text-xs font-bold text-[#111111]">{data.total}h</span>
          </div>
        </div>

        {/* Arrow Icon */}
        <div className="w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:bg-[#ff3b3b] group-hover:border-[#ff3b3b] transition-all duration-300 shrink-0">
          <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors duration-300" />
        </div>
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
      <div className="group relative flex flex-col bg-white rounded-[20px] border border-gray-100 p-4 h-full min-h-[140px] overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-3 z-10 shrink-0">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 flex items-center gap-4 px-1 min-h-0">
          {/* Chart Skeleton - fluid square */}
          <div className="relative aspect-square w-[35%] max-w-[140px] min-w-[90px] shrink-0">
            <Skeleton className="w-full h-full rounded-full" />
          </div>
          {/* Legend Skeleton */}
          <div className="flex-1 flex flex-col justify-center gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <Skeleton className="h-5 w-8 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex flex-col bg-white rounded-[20px] border border-gray-100 p-4 hover:shadow-lg hover:border-[#ff3b3b]/10 transition-all duration-300 cursor-pointer h-full min-h-[140px]"
      onClick={onClick}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3 z-10 shrink-0">
        <h4 className="font-semibold text-base text-[#111111]">{title}</h4>
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#ff3b3b] transition-colors duration-300 shrink-0">
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
        </div>
      </div>

      {/* Content Container - Side by Side Layout */}
      <div className="flex-1 flex items-center gap-4 min-h-0 px-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Chart Section — fluid square, 35% of card width, clamped; also capped by card height */}
        <div className="relative aspect-square w-[35%] max-w-[120px] min-w-[80px] shrink-0 self-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={renderData}
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="90%"
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
                      if (data.total === 0) {
                        const itemType = title.toLowerCase();
                        let periodText = (dateRangeLabel || 'this period').toLowerCase();
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
                              fill="#666666"
                              fontSize="10"
                              fontWeight="500"
                            >
                              No {itemType}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 8}
                              fill="#666666"
                              fontSize="10"
                              fontWeight="500"
                            >
                              {periodText}
                            </tspan>
                          </text>
                        );
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
                            y={(viewBox.cy || 0) - 4}
                            fill="#111111"
                            fontSize="22"
                            fontWeight="800"
                          >
                            {data.total || 0}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 14}
                            fill="#999999"
                            fontSize="9"
                            fontWeight="600"
                            letterSpacing="0.08em"
                          >
                            TOTAL
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

        {/* Legend / Stats Section */}
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
              className={`flex items-center justify-between w-full py-[7px] border-b border-gray-50 last:border-0 group/item transition-colors rounded-lg px-2 -mx-2 ${onStatusClick
                ? 'hover:bg-gray-50/50 cursor-pointer'
                : 'cursor-default'
                } ${item.value === 0 ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white shadow-sm" style={{ backgroundColor: item.color }} />
                <span className={`text-[0.8125rem] font-medium truncate group-hover/item:text-[#111111] transition-colors ${item.value > 0 ? 'text-[#111111]' : 'text-[#666666]'
                  }`}>
                  {item.name}
                </span>
              </div>
              <span className={`text-base font-bold shrink-0 ml-2 ${item.value > 0 ? 'text-[#111111]' : 'text-[#666666]'
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