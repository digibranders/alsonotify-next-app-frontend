
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
import { useTimezone } from '@/hooks/useTimezone';
import { usePublicHolidays } from '@/hooks/useHoliday';

export function ProgressWidget({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { getDayjsInTimezone } = useTimezone();

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => {
    const now = getDayjsInTimezone();
    return [now.startOf('month'), now.endOf('month')];
  });

  // Check account type to conditionally show Hours Capacity widget
  const { isIndividual } = useAccountType();

  // Fetch company settings for working hours
  const { data: companyData } = useCurrentUserCompany();

  // Fetch public holidays — used to subtract holidays from capacity (mirrors backend computeUtilization)
  const { data: holidaysData } = usePublicHolidays();

  // Stats query: limit=1 to get status_counts from the backend without pulling all records.
  const taskStatsQueryString = useMemo(() => {
    let query = "limit=1&skip=0";
    if (dateRange && dateRange[0] && dateRange[1]) {
      query += `&start_date_start=${dateRange[0].startOf('day').toISOString()}&start_date_end=${dateRange[1].endOf('day').toISOString()}`;
    }
    return query;
  }, [dateRange]);

  // Hours query: fetches actual task records needed to sum estimated_time for allotted capacity.
  const taskHoursQueryString = useMemo(() => {
    let query = "limit=1000&skip=0";
    if (dateRange && dateRange[0] && dateRange[1]) {
      query += `&start_date_start=${dateRange[0].startOf('day').toISOString()}&start_date_end=${dateRange[1].endOf('day').toISOString()}`;
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


  // Stats query — provides status_counts for the task progress card.
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks(taskStatsQueryString);
  // Hours query — provides all task records for allotted hours calculation.
  const { data: tasksHoursData, isLoading: isLoadingTasksHours } = useTasks(taskHoursQueryString);

  // Fetch all workspaces to get requirements
  const { data: workspacesData, isLoading: isLoadingWorkspaces } = useWorkspaces("");

  // Calculate task statistics using backend status_counts — identical methodology
  // to TasksPage.stats so widget counts always match the tab counts.
  const taskData = useMemo(() => {
    if (isLoadingTasks) {
      return { completed: 0, total: 0, percentage: 0, inProgress: 0, delayed: 0 };
    }

    // status_counts is embedded in the first result by the backend (same pattern as TasksPage)
    const firstTask = tasksData?.result?.[0] as unknown as { status_counts?: Record<string, number> } | undefined;
    const backendCounts = firstTask?.status_counts ?? {};

    // Mirror TasksPage.stats definitions exactly:
    // In Progress: use dedicated 'Active' count if backend supports it (mirrors ACTIVE tab filter:
    // Assigned/In_Progress with end_date >= today). Fall back to raw sum if key is absent (old backend).
    const inProgress = 'Active' in backendCounts
      ? (backendCounts['Active'] ?? 0)
      : (backendCounts['In_Progress'] ?? 0) + (backendCounts['Assigned'] ?? 0);
    // Delayed: tasks past deadline, not Completed or Review (backend Overdue)
    const delayed = backendCounts['Overdue'] ?? 0;
    // Completed: only fully approved tasks (Review is a separate stage, not shown on dashboard)
    const completed = backendCounts['Completed'] ?? 0;
    // Total: all tasks in the current date-range scope
    const total = backendCounts['All'] ?? 0;

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
        // A requirement is included if its start date is before or within the end of the selected range 
        // AND (its end date is after or within the start of the selected range, or it has no end date)
        const reqStartDate = req.start_date ? dayjs(req.start_date) : null;
        const reqEndDate = req.end_date ? dayjs(req.end_date).endOf('day') : null;
        
        const filterStart = dateRange[0].startOf('day');
        const filterEnd = dateRange[1].endOf('day');

        // Check for lack of overlap: starts after filter ends OR ends before filter starts
        if (
          !reqStartDate || 
          reqStartDate.isAfter(filterEnd) || 
          (reqEndDate && reqEndDate.isBefore(filterStart))
        ) {
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
        if (endDate.isValid() && endDate.isBefore(dayjs().startOf('day'))) {
          isOverdue = true;
        }
      }

      const isCompleted = status === 'completed' || status === 'review';

      if (isCompleted) {
        completed++;
      } else if (isOverdue) {
        delayed++;
      } else {
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
    // 1. Calculate Allotted Hours (Sum of estimated time of fetched tasks ASSIGNED TO CURRENT USER)
    // Always calculate allotted if tasks exist, regardless of capacity
    const allotted = (!tasksHoursData?.result || isLoadingTasksHours || !currentUserId)
      ? 0
      : Math.round((tasksHoursData.result as Task[]).reduce((acc: number, task: Task) => {
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

    // C. Working Days Logic — always from company settings (source of truth for the org's work week).
    // Individual user profiles only store start_time/end_time, never working_days.
    // If working_days is missing, total remains 0 — admin must configure company working hours.
    const workingDaysConfig: string[] | undefined =
      Array.isArray(companySettings?.working_days) && companySettings.working_days.length > 0
        ? companySettings.working_days
        : undefined;

    // D. Final Calculation
    const netDailyHours = Math.max(0, grossDailyHours - (breakTimeMinutes / 60));

    if (dateRange && dateRange[0] && dateRange[1] && netDailyHours > 0 && workingDaysConfig) {
      // Calculate precise working days from company config, excluding public holidays
      const holidays = (holidaysData?.result ?? []) as { date: string }[];
      const workDays = getWorkingDaysCount(dateRange[0], dateRange[1], workingDaysConfig, holidays);
      total = Math.round(workDays * netDailyHours);
    }

    const percentage = total > 0 ? Math.round((allotted / total) * 100) : 0;
    const remaining = Math.max(0, total - allotted);

    return { allotted, total, percentage, remaining };
  }, [tasksHoursData, isLoadingTasksHours, dateRange, currentUserId, companyData?.result?.working_hours, userDetailsData?.result, holidaysData]);

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
      className="bg-[#fafafa] rounded-[14px] border border-gray-100 p-3 hover:shadow-md hover:border-[#ff3b3b]/15 transition-all duration-300"
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
        <button
          type="button"
          aria-label="View Tasks capacity details"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
          className="flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b3b] rounded-md px-1"
        >
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
        </button>

        {/* Arrow Icon */}
        <button
          type="button"
          aria-label="Go to Tasks"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
          className="group/arrow w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-[#ff3b3b] hover:border-[#ff3b3b] transition-all duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b3b]"
        >
          <ArrowRight className="w-3 h-3 text-gray-400 group-hover/arrow:text-white transition-colors duration-300" />
        </button>
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
        <div className="flex-1 flex items-center gap-2 sm:gap-4 px-1 min-h-[80px]">
          {/* Chart Skeleton - responsive sizing to fit container heights */}
          <div className="relative shrink-0 w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] lg:w-[112px] lg:h-[112px] max-w-[40%] self-center flex items-center justify-center">
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
      className="relative flex flex-col bg-white rounded-[20px] border border-gray-100 p-4 transition-all duration-300 hover:shadow-md hover:border-[#ff3b3b]/15 h-full min-h-[140px]"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3 z-10 shrink-0">
        <h4 className="font-semibold text-base text-[#111111]">{title}</h4>
        <button
          type="button"
          aria-label={`View ${title} details`}
          title={`View ${title} details`}
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
          className="group/arrow w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-[#ff3b3b] transition-colors duration-300 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b3b]"
        >
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover/arrow:text-white transition-colors duration-300" />
        </button>
      </div>

      {/* Content Container - Side by Side Layout */}
      <div className="flex-1 flex items-center gap-2 sm:gap-4 min-h-[80px] px-1" style={{ minHeight: '80px' }}>
        {/* Chart Section — responsive, fits small cards and stops clipping */}
        <div className="relative flex items-center justify-center shrink-0 w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] lg:w-[112px] lg:h-[112px] max-w-[40%] self-center">
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
                          style={{ cursor: onClick ? 'pointer' : 'default' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onClick) onClick();
                          }}
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 4}
                            fill="#111111"
                            fontSize="18"
                            fontWeight="800"
                          >
                            {data.total || 0}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 12}
                            fill="#999999"
                            fontSize="8"
                            fontWeight="600"
                            letterSpacing="0.05em"
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