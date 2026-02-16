
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ArrowUp, ArrowDown, CheckSquare, Trash2 } from 'lucide-react';
import { PageLayout } from '../../layout/PageLayout';
import { PaginationBar } from '../../ui/PaginationBar';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { Modal, Checkbox, App, Tooltip } from "antd";
import { DateRangeSelector } from '../../common/DateRangeSelector';
import { useFloatingMenu } from '../../../context/FloatingMenuContext';
import { TaskForm } from '../../modals/TaskForm';
import { TimerWarningModal } from '../../modals/TimerWarningModal';
import { TaskRow } from './rows/TaskRow';
import { useTimer } from '@/context/TimerContext';

import { useTasks, useCreateTask, useDeleteTask, useUpdateTask, useUpdateTaskStatus } from '@/hooks/useTask';
import { useWorkspaces, useWorkspaceRequirementsDropdown } from '@/hooks/useWorkspace';
import { useEmployeesDropdown, useUserDetails, useCurrentUserCompany } from '@/hooks/useUser';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getTaskStatusUI, TASK_STATUSES } from '@/lib/workflow';
import { getRoleFromUser } from '@/utils/roleUtils';
import { Skeleton } from '../../ui/Skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';

import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { format, differenceInCalendarDays } from 'date-fns';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

import { Task, TaskStatus } from '@/types/domain';
import { CreateTaskRequestDto, UpdateTaskRequestDto } from '@/types/dto/task.dto';
import { toQueryParams } from '@/utils/queryParams';
import { Employee } from '@/types/domain';
import { ApiResponse } from '@/types/api';
import { CompanyProfile } from '@/types/auth';
import { CurrentUser } from '@/hooks/useCurrentUser';
import { getErrorMessage } from '@/types/api-utils';

// Local alias if needed to avoid massive rename, or just use Task
// transforming UITask -> Task in the code
type UITask = Task;
type ITaskStatus = TaskStatus;

type StatusTab = 'all' | 'In_Progress' | 'Completed' | 'Delayed';

// Container component to handle data fetching before rendering main content
export function TasksPage() {
  const { user: currentUser, isLoading: isLoadingCurrentUser } = useCurrentUser();
  const { data: userDetailsData, isLoading: isLoadingUserDetails } = useUserDetails();
  const { data: usersDropdownData, isLoading: isLoadingDropdown } = useEmployeesDropdown();
  const { data: companyData, isLoading: isLoadingCompany } = useCurrentUserCompany();

  // Show skeleton loader while critical user data is loading
  if (isLoadingCurrentUser || isLoadingUserDetails || isLoadingDropdown || isLoadingCompany) {
    return (
      <PageLayout title="Tasks">
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-1/3" />
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] h-20 w-full" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <TasksPageContent
      currentUser={currentUser}
      userDetailsData={userDetailsData}
      usersDropdownData={usersDropdownData}
      companyData={companyData}
    />
  );
}

interface TasksPageContentProps {
  currentUser: CurrentUser | null;
  userDetailsData: ApiResponse<Employee> | undefined;
  usersDropdownData: { id: number; name: string }[] | undefined;
  companyData: ApiResponse<CompanyProfile> | undefined;
}

function TasksPageContent({ currentUser, userDetailsData, usersDropdownData, companyData }: TasksPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message, modal } = App.useApp();
  const messageRef = useRef(message);
  const modalRef = useRef(modal);

  useEffect(() => {
    messageRef.current = message;
    modalRef.current = modal;
  }, [message, modal]);
  const createTaskMutation = useCreateTask();
  const deleteTaskMutation = useDeleteTask();
  const updateTaskMutation = useUpdateTask();
  const updateTaskStatusMutation = useUpdateTaskStatus();
  const { data: workspacesData } = useWorkspaces();

  // Use new centralized hooks for dropdowns (already passed via props but using hook for consistency/updates?)
  // Actually, strictly we should use the props to avoid re-suspend issues, 
  // but react-query handles this fine. To be safe/clean, let's use the props.
  // Transforming props to memoized data:
  const usersDropdown = useMemo(() => usersDropdownData || [], [usersDropdownData]);

  const { data: requirementsDropdownData } = useWorkspaceRequirementsDropdown();
  const requirementsDropdown = useMemo(() => requirementsDropdownData || [], [requirementsDropdownData]);

  // Get current user's company name as fallback for in-house tasks
  const currentUserCompanyName = useMemo(() => {
    // First try the company API endpoint
    if (companyData?.result?.name) {
      return companyData.result.name;
    }
    // Fallback to centralized user hook
    if (currentUser?.company?.name) {
      return currentUser.company.name;
    }
    return null;
  }, [companyData, currentUser]);

  // Get current user name
  const currentUserName = useMemo(() => {
    if (currentUser?.name) {
      return currentUser.name;
    }
    if (currentUser?.user_profile?.first_name) {
      return currentUser.user_profile.first_name;
    }
    return null;
  }, [currentUser]);

  // Use standardized tab sync hook for consistent URL handling
  const [activeTab, setActiveTabInternal] = useTabSync<StatusTab>({
    defaultTab: 'all',
    validTabs: ['all', 'In_Progress', 'Completed', 'Delayed']
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Determine initial filters synchronously
  const apiUser = userDetailsData?.result || {};
  const userRole = getRoleFromUser(apiUser);
  const isAdmin = userRole?.toLowerCase() === 'admin';

  const initialFilters = {
    user: 'All',
    company: 'All',
    workspace: 'All',
    status: 'All',
    requirement: 'All'
  };

  // Only auto-apply user filter for non-admin users
  if (!isAdmin && currentUserName) {
    initialFilters.user = currentUserName;
  }

  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    limit: 10,
    skip: 0,
  });

  // Date Picker State
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showTimerWarning, setShowTimerWarning] = useState(false);
  const [pendingEditTask, setPendingEditTask] = useState<UITask | null>(null);
  const [isPausingTimer, setIsPausingTimer] = useState(false);

  // DELETED: useEffect for initial filter setup - now handled in useState initializer

  // Determine if current user is Admin (re-calculated for usage, already calc above)

  // Build query params for API call
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      limit: pagination.limit,
      skip: pagination.skip,
    };

    // Map Active Tab to Backend Status Filter
    if (activeTab === 'In_Progress') {
      params.status = 'ACTIVE';
    } else if (activeTab === 'Completed') {
      params.status = 'Completed';
    } else if (activeTab === 'Delayed') {
      params.status = 'OVERDUE';
    } else if (filters.status !== 'All') {
      params.status = filters.status;
    }

    // Add filters
    if (filters.user !== 'All') {
      const selectedUser = usersDropdown.find(u => u.name === filters.user);
      if (selectedUser?.id) {
        params.member_id = selectedUser.id;
      }
    }
    if (filters.workspace !== 'All') {
      const selectedWorkspace = workspacesData?.result?.workspaces?.find(
        (p: { name: string; id: number }) => p.name === filters.workspace
      );
      if (selectedWorkspace?.id) {
        params.workspace_id = selectedWorkspace.id;
      }
    }
    if (filters.requirement !== 'All') {
      const selectedReq = requirementsDropdown.find(r => r.name === filters.requirement);
      if (selectedReq?.id) {
        params.requirement_id = selectedReq.id;
      }
    }

    if (searchQuery) {
      params.name = searchQuery;
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      params.start_date = {
        start: dateRange[0].format('YYYY-MM-DD'),
        end: dateRange[1].format('YYYY-MM-DD')
      };
    }

    return toQueryParams(params);
  }, [pagination.limit, pagination.skip, filters, searchQuery, dateRange, workspacesData, usersDropdown, requirementsDropdown, activeTab]);

  // Build query params for STATS (without status filter to get global counts)
  const statsQueryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      limit: 1, // Only need one item to get status_counts
      skip: 0,
    };

    if (filters.user !== 'All') {
      const selectedUser = usersDropdown.find(u => u.name === filters.user);
      if (selectedUser?.id) {
        params.member_id = selectedUser.id;
      }
    }
    if (filters.workspace !== 'All') {
      const selectedWorkspace = workspacesData?.result?.workspaces?.find(
        (p: { name: string; id: number }) => p.name === filters.workspace
      );
      if (selectedWorkspace?.id) {
        params.workspace_id = selectedWorkspace.id;
      }
    }
    if (filters.requirement !== 'All') {
      const selectedReq = requirementsDropdown.find(r => r.name === filters.requirement);
      if (selectedReq?.id) {
        params.requirement_id = selectedReq.id;
      }
    }
    if (searchQuery) {
      params.name = searchQuery;
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.start_date = dateRange[0].format('YYYY-MM-DD');
      params.end_date = dateRange[1].format('YYYY-MM-DD');
    }

    return toQueryParams(params);
  }, [filters.workspace, filters.user, filters.requirement, searchQuery, dateRange, workspacesData, usersDropdown, requirementsDropdown]);

  // Fetch tasks with query params
  const { data: tasksData, isLoading } = useTasks(queryParams);

  // Fetch stats separately (without status filter)
  const { data: statsData } = useTasks(statsQueryParams);



  // Backend returns Prisma TaskStatus enum only. Thin guard for unknown/legacy values.
  const normalizeBackendStatus = (status: string): ITaskStatus => {
    if (!status) return 'Assigned';
    return (TASK_STATUSES as readonly string[]).includes(status) ? (status as ITaskStatus) : 'Assigned';
  };

  // Create a map of requirement IDs to names for quick lookup
  const requirementMap = useMemo(() => {
    const map = new Map<number, string>();
    requirementsDropdown.forEach(req => {
      map.set(req.id, req.name);
    });
    return map;
  }, [requirementsDropdown]);

  const tasks: UITask[] = useMemo(() => {
    if (!tasksData?.result) return [];

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return (tasksData.result as Task[]).map((t: Task) => {
      const startDateObj = t.start_date ? new Date(t.start_date) : null;
      const dueDateObj = t.end_date ? new Date(t.end_date) : null;

      const startDate = startDateObj
        ? startDateObj
          .toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
          .replace(/ /g, '-')
        : 'TBD';

      let dueDate = 'TBD';
      let timelineDate = 'No due date';
      let timelineLabel = 'No due date';
      let isTimeOverdue = false;
      let dueDateValue: number | null = null;

      if (dueDateObj) {
        const dueMidnight = new Date(
          dueDateObj.getFullYear(),
          dueDateObj.getMonth(),
          dueDateObj.getDate()
        );

        dueDateValue = dueMidnight.getTime();

        dueDate = dueDateObj
          .toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
          .replace(/ /g, '-');

        timelineDate = format(dueDateObj, 'MMM d');

        const diffDays = differenceInCalendarDays(todayMidnight, dueMidnight);

        if (diffDays > 0) {
          // Today is after due date
          isTimeOverdue = true;
          timelineLabel = `Overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffDays === 0) {
          timelineLabel = 'Due today';
        } else {
          const daysLeft = Math.abs(diffDays);
          timelineLabel = `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
        }
      }

      const estTime = t.estimated_time || 0;
      const timeSpent = t.time_spent || 0;
      const isOverEstimate = estTime > 0 && timeSpent > estTime;

      const baseStatus = normalizeBackendStatus(t.status || 'Assigned');
      const isDelayedByTime = isTimeOverdue || isOverEstimate;
      // If task is delayed by time but status is not already Delayed/Impediment/Stuck, mark as Delayed
      const uiStatus: ITaskStatus =
        baseStatus === 'Completed'
          ? 'Completed'
          : isDelayedByTime && !['Delayed', 'Impediment', 'Stuck'].includes(baseStatus)
            ? 'Delayed'
            : baseStatus;

      // New logic: Use requirement sender company, fallback to current user's company or In-House

      // 1. Try to get company from the requirement's sender (The company that sent the requirement)
      // This covers both external (Client Co) and internal (My Co) requirements correctly
      const senderCompanyName = t.task_requirement?.sender_company?.name;

      // 2. Fallback to current user's company name (if we are viewing tasks in our own workspace but data is missing)
      const fallbackCompanyName = currentUserCompanyName || 'In-House';

      const displayCompanyName = senderCompanyName || fallbackCompanyName;

      // Get requirement name - check multiple possible paths
      // First try from API response (nested relation)
      let requirementName = t.project || null;

      // If not found in API response, look it up from the requirements dropdown map
      if (!requirementName && t.requirement_id) {
        requirementName = requirementMap.get(t.requirement_id) || null;
      }

      const requirementDisplay = requirementName
        ? requirementName
        : t.requirement_id
          ? `Requirement ${t.requirement_id}`
          : 'General';

      return {
        ...t,
        id: String(t.id),
        name: t.name || '',
        taskId: String(t.id),
        client: displayCompanyName,
        project: requirementDisplay,
        leader:
          t.leader_user?.name ||
          'Unassigned',
        assignedTo:
          t.member_user?.name ||
          'Unassigned',
        startDate,
        dueDate,
        estTime,
        timeSpent,


        activities: t.worklogs?.length || 0,
        status: uiStatus,
        is_high_priority: t.is_high_priority ?? false,
        timelineDate,
        timelineLabel,
        dueDateValue,
        // Store IDs for editing
        workspace_id: t.workspace_id || undefined,
        requirement_id: t.requirement_id || undefined,
        member_id: t.member_user?.id || t.member_id,
        leader_id: t.leader_user?.id || t.leader_id,

        description: t.description || '',
        end_date: t.end_date || '', // endDateIso replacement
        task_members: t.task_members || [],
        total_seconds_spent: t.total_seconds_spent || 0,
        totalSecondsSpent: t.total_seconds_spent || 0,
        execution_mode: t.execution_mode,
      } as UITask;
    });
  }, [tasksData, requirementMap, currentUserCompanyName]);


  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
  };

  const currentUserId = userDetailsData?.result?.id;

  useEffect(() => {
    // side-effects after tasks change (currently none)
  }, [tasks, tasksData]);

  const users = useMemo(() => {
    return ['All', ...usersDropdown.map(u => u.name).sort()];
  }, [usersDropdown]);

  const companies = useMemo(() => {
    const companyNames = tasks.map(t => t.client).filter((name): name is string => typeof name === 'string' && name !== 'In-House');
    return ['All', ...Array.from(new Set(companyNames))];
  }, [tasks]);

  const workspaces = useMemo(() => {
    if (!workspacesData?.result?.workspaces) return ['All'];
    return ['All', ...workspacesData.result.workspaces.map((p: { name: string }) => p.name)];
  }, [workspacesData]);

  const statuses = useMemo(
    () => ['All', ...TASK_STATUSES.map((s) => ({ label: getTaskStatusUI(s).label, value: s }))],
    []
  );

  const requirementsList = useMemo(() => {
    return ['All', ...requirementsDropdown.map(r => r.name).sort()];
  }, [requirementsDropdown]);

  const filterOptions: FilterOption[] = [
    { id: 'user', label: 'User', options: users, defaultValue: 'All' },
    { id: 'company', label: 'Company', options: companies, placeholder: 'Company' },
    { id: 'workspace', label: 'Workspace', options: workspaces, placeholder: 'Workspace' },
    { id: 'requirement', label: 'Requirement', options: requirementsList, placeholder: 'Requirement' },
    { id: 'status', label: 'Status', options: statuses, placeholder: 'Status' }
  ];

  const handleFilterChange = useCallback((filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
    setPagination(prev => ({ ...prev, current: 1, skip: 0 }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, current: 1, skip: 0 }));
  }, []);

  const handleTabChange = useCallback((tabId: StatusTab) => {
    setActiveTabInternal(tabId);
    setPagination(prev => ({ ...prev, current: 1, skip: 0 }));
  }, [setActiveTabInternal]);

  const clearFilters = useCallback(() => {
    setFilters({
      user: 'All',
      company: 'All',
      workspace: 'All',
      status: 'All',
      requirement: 'All'
    });
    setSearchQuery('');
    setPagination(prev => ({ ...prev, current: 1, skip: 0 }));
  }, []);

  // Handle pagination change
  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination({
      current: page,
      pageSize,
      limit: pageSize,
      skip: (page - 1) * pageSize,
    });
  };

  const handleCreateTask = async (data: CreateTaskRequestDto) => {
    // `TaskForm` already validates all required fields, but we keep a
    // defensive check here to avoid sending an incomplete payload.
    if (!data?.start_date) {
      messageRef.current.error("Start Date is required");
      return;
    }

    const payload: CreateTaskRequestDto = {
      name: data.name || '',
      start_date: data.start_date,
      end_date: data.end_date,
      assigned_to: data.assigned_to,
      workspace_id: data.workspace_id,
      requirement_id: data.requirement_id,
      description: data.description,
      is_high_priority: data.is_high_priority,
      estimated_time: data.estimated_time,
      priority: data.is_high_priority ? 'HIGH' : 'NORMAL', // Must match backend enum: HIGH | NORMAL
      status: 'Assigned', // Default status for new task
      leader_id: data.leader_id,
      assigned_members: data.assigned_members,
      execution_mode: data.execution_mode
    };

    return createTaskMutation.mutateAsync(payload, {
      onSuccess: () => {
        messageRef.current.success("Task created successfully!");
        setIsDialogOpen(false);
      },
      onError: (error: Error) => {
        const errorMessage = getErrorMessage(error, "Failed to create task");
        messageRef.current.error(errorMessage);
      },
    });
  };

  // Get timer state
  const { timerState, stopTimer } = useTimer();

  // Handle edit task
  const [editingTask, setEditingTask] = useState<UITask | null>(null);
  const handleEditTask = (task: UITask) => {
    // Check if timer is running for this task
    if (timerState.isRunning && timerState.taskId === Number(task.id)) {
      setPendingEditTask(task);
      setShowTimerWarning(true);
      return;
    }

    // Proceed with edit
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  // Handle pause timer and edit
  const handlePauseAndEdit = async () => {
    setIsPausingTimer(true);
    try {
      await stopTimer('Paused for task editing');
      setShowTimerWarning(false);
      if (pendingEditTask) {
        setEditingTask(pendingEditTask);
        setIsDialogOpen(true);
        setPendingEditTask(null);
      }
    } catch (error) {
      console.error('Failed to pause timer:', error);
      messageRef.current.error('Failed to pause timer. Please try again.');
    } finally {
      setIsPausingTimer(false);
    }
  };

  // Handle edit anyway (keep timer running)
  const handleEditAnyway = () => {
    setShowTimerWarning(false);
    if (pendingEditTask) {
      setEditingTask(pendingEditTask);
      setIsDialogOpen(true);
      setPendingEditTask(null);
    }
  };

  // Handle cancel timer warning
  const handleCancelTimerWarning = () => {
    setShowTimerWarning(false);
    setPendingEditTask(null);
  };

  // Handle delete task
  const handleDeleteTask = (taskId: string) => {
    modalRef.current.confirm({
      title: 'Delete Task',
      content: 'Are you sure you want to delete this task? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteTaskMutation.mutate(parseInt(taskId), {
          onSuccess: () => {
            messageRef.current.success("Task deleted successfully!");
          },
          onError: (error: Error) => {
            messageRef.current.error(getErrorMessage(error, "Failed to delete task"));
          },
        });
      },
    });
  };

  /**
   * Handles bulk deletion of selected tasks.
   * Shows a confirmation modal before proceeding with concurrent deletion requests.
   */
  const handleBulkDelete = useCallback(() => {
    modalRef.current.confirm({
      title: 'Delete Tasks',
      content: `Are you sure you want to delete ${selectedTasks.length} tasks?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await Promise.all(selectedTasks.map(id => deleteTaskMutation.mutateAsync(parseInt(id))));
          messageRef.current.success(`${selectedTasks.length} tasks deleted`);
          setSelectedTasks([]);
        } catch (error) {
          messageRef.current.error('Failed to delete some tasks');
        }
      },
    });
  }, [selectedTasks, deleteTaskMutation]);

  /**
   * Handles bulk completion of selected tasks.
   * Updates status to 'Completed' for all selected items concurrently.
   */
  const handleBulkComplete = useCallback(async () => {
    try {
      await Promise.all(
        selectedTasks.map(id =>
          updateTaskStatusMutation.mutateAsync({ id: Number.parseInt(id), status: 'Completed' })
        )
      );
      messageRef.current.success(`${selectedTasks.length} tasks marked as completed`);
      setSelectedTasks([]);
    } catch (error) {
      messageRef.current.error('Failed to complete some tasks');
    }
  }, [selectedTasks, updateTaskStatusMutation]);

  // Get total count from API response
  const totalTasks = useMemo(() => {
    const firstTask = tasksData?.result?.[0] as Task | undefined;
    return firstTask?.total_count ?? tasks.length ?? 0;
  }, [tasksData, tasks.length]);

  // Apply client-side filters for user/company (since we can't easily map names to IDs)
  // Workspace filtering is now done server-side via query params
  // Client-side filtering is now minimal (mostly for things backend doesn't handle yet)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesCompany = filters.company === 'All' || task.client === filters.company;
      return matchesCompany;
    });
  }, [tasks, filters]);

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];

    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortColumn) {
          case 'name':
            aVal = (a.name || '').toLowerCase();
            bVal = (b.name || '').toLowerCase();
            break;
          case 'project':
            aVal = (a.project || '').toLowerCase();
            bVal = (b.project || '').toLowerCase();
            break;
          case 'timeline':
            aVal = a.dueDateValue || 0;
            bVal = b.dueDateValue || 0;
            break;
          case 'assignedTo': {
            const getAssigneeName = (val: any) => typeof val === 'string' ? val : (val?.name || '');
            aVal = getAssigneeName(a.assignedTo).toLowerCase();
            bVal = getAssigneeName(b.assignedTo).toLowerCase();
            break;
          }
          case 'timeSpent':
            aVal = a.timeSpent || 0;
            bVal = b.timeSpent || 0;
            break;
          case 'status':
            aVal = (a.status || '').toLowerCase();
            bVal = (b.status || '').toLowerCase();
            break;
          default:
            // Sort key not in typed union; narrow when task DTO is extended.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            aVal = (a as any)[sortColumn];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bVal = (b as any)[sortColumn];
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }, [filteredTasks, sortColumn, sortDirection]);

  useEffect(() => {
    // side-effects after filters, search, or date label change (currently none)
  }, [tasks.length, filteredTasks.length, activeTab, searchQuery, filters]);

  // Note: Stats are now fetched separately without status filter for stable tab counts
  // Use statsData (global counts) instead of tasksData (filtered)
  const stats = useMemo(() => {
    // Stats usually come as metadata or first item. Using TaskDto to access potential extra fields
    const firstTask = statsData?.result?.[0] as unknown as { status_counts?: Record<string, number> };
    const backendCounts = firstTask?.status_counts || {};

    // Calculate total from counts if available
    const calculatedTotal = (backendCounts.All) ||
      ((backendCounts.Assigned || 0) + (backendCounts.In_Progress || 0) +
        (backendCounts.Completed || 0) + (backendCounts.Delayed || 0) +
        (backendCounts.Impediment || 0) + (backendCounts.Stuck || 0) +
        (backendCounts.Review || 0));

    return {
      all: backendCounts.All || calculatedTotal || totalTasks,
      // In Progress = all tasks except Assigned and Completed
      'In_Progress': (backendCounts.In_Progress || 0) + (backendCounts.Delayed || 0) +
        (backendCounts.Impediment || 0) + (backendCounts.Stuck || 0) + (backendCounts.Review || 0),
      'Completed': backendCounts.Completed || 0,
      // Use explicit Overdue count from backend if available, fallback to Delayed status + Impediment + Stuck
      'Delayed': backendCounts.Overdue ?? ((backendCounts.Delayed || 0) + (backendCounts.Impediment || 0) + (backendCounts.Stuck || 0)),
    };
  }, [statsData, totalTasks]);

  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id));
    }
  };

  // ✅ FIX BUG #2 Frontend: Permission check for status changes
  const canChangeTaskStatus = useCallback((task: UITask): boolean => {
    if (!currentUserId) return false;

    // Check if user is task leader
    const isLeader = task.leader_id === Number(currentUserId);

    // Check if user is a task member
    const isMember = task.task_members?.some(
      (member) => member.user_id === Number(currentUserId) || member.user?.id === Number(currentUserId)
    );

    return isLeader || (isMember ?? false);
  }, [currentUserId]);

  const { setExpandedContent } = useFloatingMenu();

  // Update floating menu with bulk actions
  useEffect(() => {
    if (selectedTasks.length > 0) {

      setExpandedContent(
        <>
          <div className="flex items-center gap-2 border-r border-white/20 pr-6">
            <div className="bg-[#ff3b3b] text-white text-[12px] font-bold px-2 py-0.5 rounded-full">
              {selectedTasks.length}
            </div>
            <span className="text-[14px] font-['Manrope:SemiBold',sans-serif]">Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip title="Mark as Completed">
              <button
                onClick={handleBulkComplete}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
            </Tooltip>
            {/* Assign To - Future implementation 
              <Tooltip title="Assign To">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Users className="w-4 h-4" />
                </button>
              </Tooltip>
              */}
            <Tooltip title="Delete">
              <button
                onClick={handleBulkDelete}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#ff3b3b]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          <button onClick={() => setSelectedTasks([])} className="ml-2 text-[12px] text-[#999999] hover:text-white transition-colors">
            Cancel
          </button>
        </>
      );
    } else {
      setExpandedContent(null);
    }

    return () => {
      setExpandedContent(null);
    };
  }, [selectedTasks, handleBulkComplete, handleBulkDelete, setExpandedContent]);

  const toggleSelect = useCallback((id: string) => {
    if (selectedTasks.includes(id)) {
      setSelectedTasks(prev => prev.filter(taskId => taskId !== id));
    } else {
      setSelectedTasks(prev => [...prev, id]);
    }
  }, [selectedTasks]);

  const DateFilter = (
    <DateRangeSelector
      value={dateRange}
      onChange={setDateRange}
      availablePresets={['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'this_year', 'all_time', 'custom']}
    />
  );

  return (
    <PageLayout
      title="Tasks"
      titleAction={{
        onClick: () => {
          setEditingTask(null);
          setIsDialogOpen(true);
        },
        label: "Add Task"
      }}
      tabs={[
        { id: 'all', label: 'All Tasks' },
        { id: 'In_Progress', label: 'In Progress' },
        { id: 'Completed', label: 'Completed' },
        { id: 'Delayed', label: 'Delayed', count: stats.Delayed },
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => handleTabChange(tabId as StatusTab)}

      customFilters={DateFilter}
    >
      <Modal
        open={isDialogOpen}
        onCancel={() => {
          setIsDialogOpen(false);
          setEditingTask(null);
        }}
        footer={null}
        width={600}
        centered
        className="rounded-[16px] overflow-hidden"
        styles={{
          body: {
            padding: 0,
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          },
        }}
      >
        <TaskForm
          key={editingTask ? `edit-${editingTask.id}` : `new-task-form`}
          initialData={editingTask ? {
            name: editingTask.name,
            workspace_id: editingTask.workspace_id ? String(editingTask.workspace_id) : '',
            requirement_id: editingTask.requirement_id ? String(editingTask.requirement_id) : '',
            assigned_members: editingTask.task_members?.map(m => m.user?.id || m.user_id) || [],
            execution_mode: editingTask.execution_mode || 'parallel',
            member_id: editingTask.member_id ? String(editingTask.member_id) : '',
            leader_id: editingTask.leader_id ? String(editingTask.leader_id) : '',
            end_date: editingTask.end_date || '',
            estimated_time: (editingTask.estTime || editingTask.estimated_time) ? String(editingTask.estTime || editingTask.estimated_time) : '',
            is_high_priority: editingTask.is_high_priority || false,
            description: editingTask.description || '',
          } : undefined}
          isEditing={!!editingTask}
          onSubmit={(data) => {
            if (editingTask) {
              // Update task
              updateTaskMutation.mutate({
                id: parseInt(editingTask.id),
                ...data,
                // Ensure required fields for update are present
              } as UpdateTaskRequestDto, {
                onSuccess: () => {
                  message.success("Task updated successfully!");
                  setIsDialogOpen(false);
                  setEditingTask(null);
                },
                onError: (error: Error) => {
                  message.error(getErrorMessage(error));
                },
              });
            } else {
              // Create task
              handleCreateTask(data);
              // Switch to 'All Tasks' tab to ensure visibility of the new 'Assigned' task
              setActiveTabInternal('all');
              const params = new URLSearchParams(searchParams.toString());
              params.delete('tab');
              router.push(`?${params.toString()}`);
            }
          }}
          onCancel={() => {
            setIsDialogOpen(false);
            setEditingTask(null);
          }}
          users={usersDropdown}
          requirements={requirementsDropdown}
          workspaces={workspacesData?.result?.workspaces?.map((p) => ({
            id: p.id,
            name: p.name,
            company_name: p.company_name,
            partner_name: p.partner_name,
            in_house: p.in_house
          })) || []}
        />
      </Modal>


      {/* Timer Warning Modal */}
      {showTimerWarning && pendingEditTask && (
        <Modal
          open={showTimerWarning}
          onCancel={handleCancelTimerWarning}
          footer={null}
          closable={false}
          width={560}
          centered
          className="rounded-[16px] overflow-hidden"
        >
          <TimerWarningModal
            open={showTimerWarning}
            taskName={pendingEditTask.name}
            onPauseAndEdit={handlePauseAndEdit}
            onEditAnyway={handleEditAnyway}
            onCancel={handleCancelTimerWarning}
            isLoading={isPausingTimer}
          />
        </Modal>
      )}
      {/* Filters Bar */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <FilterBar
              filters={filterOptions}
              selectedFilters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              searchPlaceholder="Search"
              searchValue={searchQuery}
              onSearchChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Table Header */}
        <div className="sticky top-0 z-20 bg-white grid grid-cols-[40px_2.5fr_1.2fr_1.1fr_1fr_0.8fr_1.5fr_0.6fr_40px] gap-4 px-4 py-3 mb-2 items-center">
          <div className="flex justify-center">
            <Checkbox
              checked={sortedTasks.length > 0 && selectedTasks.length === sortedTasks.length}
              onChange={toggleSelectAll}
              className="red-checkbox"
            />
          </div>

          <button
            className="flex items-center gap-1 group outline-none cursor-pointer"
            onClick={() => handleSort('name')}
          >
            <span className={`text-[11px] font-['Manrope:Bold',sans-serif] uppercase tracking-wide transition-colors ${sortColumn === 'name' ? 'text-[#111111]' : 'text-[#999999] group-hover:text-[#666666]'}`}>
              Task
            </span>
            {getSortIcon('name')}
          </button>

          <button
            className="flex items-center gap-1 group outline-none cursor-pointer"
            onClick={() => handleSort('project')}
          >
            <span className={`text-[11px] font-['Manrope:Bold',sans-serif] uppercase tracking-wide transition-colors ${sortColumn === 'project' ? 'text-[#111111]' : 'text-[#999999] group-hover:text-[#666666]'}`}>
              Requirements
            </span>
            {getSortIcon('project')}
          </button>

          <button
            className="flex items-center gap-1 group outline-none cursor-pointer"
            onClick={() => handleSort('timeline')}
          >
            <span className={`text-[11px] font-['Manrope:Bold',sans-serif] uppercase tracking-wide transition-colors ${sortColumn === 'timeline' ? 'text-[#111111]' : 'text-[#999999] group-hover:text-[#666666]'}`}>
              Due Date
            </span>
            {getSortIcon('timeline')}
          </button>

          <button
            className="flex items-center gap-1 group outline-none cursor-pointer"
            onClick={() => handleSort('assignedTo')}
          >
            <span className={`text-[11px] font-['Manrope:Bold',sans-serif] uppercase tracking-wide transition-colors ${sortColumn === 'assignedTo' ? 'text-[#111111]' : 'text-[#999999] group-hover:text-[#666666]'}`}>
              Assigned
            </span>
            {getSortIcon('assignedTo')}
          </button>

          <button
            className="flex items-center gap-1 group outline-none cursor-pointer justify-center"
            onClick={() => handleSort('timeSpent')}
          >
            <span className={`text-[11px] font-['Manrope:Bold',sans-serif] uppercase tracking-wide transition-colors ${sortColumn === 'timeSpent' ? 'text-[#111111]' : 'text-[#999999] group-hover:text-[#666666]'}`}>
              Duration
            </span>
            {getSortIcon('timeSpent')}
          </button>

          <div className="text-center text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">
            Progress
          </div>

          <button
            className="flex items-center gap-1 group outline-none cursor-pointer"
            onClick={() => handleSort('status')}
          >
            <span className={`text-[11px] font-['Manrope:Bold',sans-serif] uppercase tracking-wide transition-colors ${sortColumn === 'status' ? 'text-[#111111]' : 'text-[#999999] group-hover:text-[#666666]'}`}>
              Status
            </span>
            {getSortIcon('status')}
          </button>

          <div />
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[40px_2.5fr_1.2fr_1.1fr_1fr_0.8fr_1.5fr_0.6fr_40px] gap-4 px-4 py-4 items-center">
                <div className="flex justify-center"><Skeleton className="h-4 w-4 rounded" /></div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <div className="flex justify-center"><Skeleton className="h-8 w-8 rounded-full" /></div>
                <div className="flex justify-center"><Skeleton className="h-4 w-12" /></div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-center"><Skeleton className="h-6 w-16 rounded-full" /></div>
                <div className="flex justify-center"><Skeleton className="h-4 w-4 rounded" /></div>
              </div>
            ))
          ) : sortedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={{
                ...task,
                status: task.status as TaskStatus
              }}
              selected={selectedTasks.includes(task.id)}
              onSelect={() => toggleSelect(task.id)}
              onEdit={() => handleEditTask(task)}
              onDelete={() => handleDeleteTask(task.id)}
              onStatusChange={
                canChangeTaskStatus(task)
                  ? (status) => updateTaskStatusMutation.mutate({ id: Number(task.id), status })
                  : undefined  // ✅ FIX BUG #2: Disable status change if no permission
              }
              currentUserId={currentUserId ? Number(currentUserId) : undefined}
              isAdmin={isAdmin}
            />
          ))}
        </div>

        {!isLoading && filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#999999] font-['Manrope:Regular',sans-serif]">
              No tasks found
            </p>
          </div>
        ) : null}


      </div>

      {/* Pagination - Fixed at bottom */}
      {!isLoading && (
        <PaginationBar
          currentPage={pagination.current}
          totalItems={totalTasks}
          pageSize={pagination.pageSize}
          onPageChange={(page) => handlePaginationChange(page, pagination.pageSize)}
          onPageSizeChange={(size) => handlePaginationChange(1, size)}
          itemLabel="tasks"
        />
      )}
    </PageLayout>
  );
}