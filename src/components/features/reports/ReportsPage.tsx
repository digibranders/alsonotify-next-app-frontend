import React, { useState, useMemo, useEffect } from 'react';
import {
  Download, ArrowUp, ArrowDown, Info
} from 'lucide-react';
import { PageLayout } from '../../layout/PageLayout';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { TaskStatusBadge } from '@/components/features/tasks/components/TaskStatusBadge';
import { DateRangeSelector } from '../../common/DateRangeSelector';
import { Tooltip, Button, Avatar } from "antd";
import { Skeleton } from '../../ui/Skeleton';
import dynamic from 'next/dynamic';
const ReportsPdfTemplate = dynamic(() => import('./ReportsPdfGeneration').then(m => m.ReportsPdfTemplate), { ssr: false });
const IndividualEmployeePdfTemplate = dynamic(() => import('./ReportsPdfGeneration').then(m => m.IndividualEmployeePdfTemplate), { ssr: false });
import dayjs from '@/utils/dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useTabSync } from '@/hooks/useTabSync';
import { useQuery } from '@tanstack/react-query';
import { usePartners, useEmployees, useCompanyDepartments } from '@/hooks/useUser';

import { useTimezone } from '@/hooks/useTimezone';
import { getCurrencySymbol } from '@/utils/currencyUtils';
import { getRequirementReports, getTaskReports, getEmployeeReports, getMemberWorklogs, RequirementReport, TaskReport, EmployeeReport, MemberWorklog, RequirementReportsResponse, TaskReportsResponse, EmployeeReportsResponse } from '../../../services/report';
import EmployeeDetailsDrawer from './components/EmployeeDetailsDrawer';
import { PaginationBar } from '../../ui/PaginationBar';
import { getPartnerCompanyId, getPartnerName, isValidPartner } from '@/utils/partnerUtils';

// Initialize dayjs plugins
dayjs.extend(isBetween);



// --- Helper Components ---


function TableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'left',
  tooltip
}: {
  label: string;
  sortKey?: string;
  currentSort?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  align?: 'left' | 'right' | 'center';
  tooltip?: string;
}) {
  const isSorted = currentSort?.key === sortKey;

  return (
    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'} min-w-0`}>
      <button
        className={`flex items-center gap-1 group outline-none p-0 min-w-0 ${sortKey ? 'cursor-pointer' : 'cursor-default'} ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}
        onClick={() => sortKey && onSort?.(sortKey)}
        disabled={!sortKey}
      >
        <span className={`text-xs font-semibold uppercase tracking-wider transition-colors text-left ${isSorted ? 'text-[#111111]' : 'text-[#999999] group-hover:text-[#666666]'} truncate`}>
          {label}
        </span>
        {sortKey && isSorted && currentSort && (
          <span className="flex items-center justify-center transition-all">
            {currentSort.direction === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-[#111111]" />
            ) : (
              <ArrowDown className="w-3 h-3 text-[#111111]" />
            )}
          </span>
        )}
        {sortKey && !isSorted && (
          <span className="flex items-center justify-center opacity-0 group-hover:opacity-50 transition-all">
            <ArrowUp className="w-3 h-3 text-[#999999]" />
          </span>
        )}
      </button>
      {tooltip && (
        <Tooltip title={tooltip} styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
          <Info className="w-3 h-3 text-[#CCCCCC] hover:text-[#999999] cursor-help flex-shrink-0 transition-colors" />
        </Tooltip>
      )}
    </div>
  );
}


// --- Main Component ---

export function ReportsPage() {
  const [activeTab, setActiveTab] = useTabSync<'requirement' | 'task' | 'member'>({
    defaultTab: 'requirement',
    validTabs: ['requirement', 'task', 'member']
  });


  const { companyName, companyId, companyTimezone, companyCurrency, formatWithTimezone, getDayjsInTimezone } = useTimezone();
  const currencySymbol = getCurrencySymbol(companyCurrency);

  // Fetch Dropdown Data
  const { data: partnersData } = usePartners();
  const { data: employeesData } = useEmployees("is_active=true&limit=1000"); // Fetch all active for filters
  const { data: departmentsData } = useCompanyDepartments();

  const partnerOptions = useMemo(() => {
    const options = [
      { label: 'All', value: 'All' },
    ];

    // Add Self Company if ID is available
    if (companyId) {
      options.push({ label: `${companyName} (Self / In-house)`, value: String(companyId) });
    }


    // Add Partners
    const partnerList = (partnersData?.result || [])
      .filter(isValidPartner)
      .map((p) => {
        return {
          label: getPartnerName(p),
          value: String(getPartnerCompanyId(p))
        };
      });

    return [...options, ...partnerList];
  }, [partnersData, companyId, companyName]);

  const employeeOptions = useMemo(() => [
    { label: 'All', value: 'All' },
    ...(employeesData?.result || []).map((e) => ({ label: e.name, value: String(e.id) }))
  ], [employeesData]);

  const departmentOptions = useMemo(() => [
    { label: 'All', value: 'All' },
    ...(departmentsData?.result || []).map((d) => ({ label: d.name, value: String(d.id) }))
  ], [departmentsData]);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingIndividual, setIsDownloadingIndividual] = useState(false);


  // Filters State
  const [filters, setFilters] = useState<Record<string, string>>({
    partner: 'All',
    member: 'All',
    leader: 'All',
    assigned: 'All',
    status: 'All',
    type: 'All',
    priority: 'All',
    department_id: 'All'
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Date Picker State using dayjs for AntD
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>([
    getDayjsInTimezone().startOf('month'),
    getDayjsInTimezone().endOf('month')
  ]);

  // Pagination State
  const [pagination, setPagination] = useState({ limit: 10, skip: 0 });

  useEffect(() => {
    // Reset to first page on filter change
    setPagination(prev => ({ ...prev, skip: 0 }));
  }, [filters, searchQuery, dateRange, activeTab]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key && current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Handle Filters
  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const clearFilters = () => {
    setFilters({
      partner: 'All',
      member: 'All',
      status: 'All',
      leader: 'All',
      assigned: 'All',
      department_id: 'All',
      type: 'All',
      priority: 'All'
    });
    setSearchQuery('');
  };

  // --- Export Logic ---
  const [exportData, setExportData] = useState<{
    requirements: RequirementReport[];
    tasks: TaskReport[];
    employees: EmployeeReport[];
  } | null>(null);

  const fetchAllDataForExport = async () => {
    const limit = 1000; // Safe cap for export
    const skip = 0;

    if (activeTab === 'requirement') {
      const typeMap: Record<string, string> = {
        'In-house': 'inhouse',
        'Outsourced': 'outsourced',
        'Client Work': 'client'
      };

      const res = await getRequirementReports({
        search: searchQuery,
        partner_id: filters.partner,
        status: filters.status,
        type: typeMap[filters.type] || filters.type,
        priority: filters.priority,
        department_id: filters.department_id,
        start_date: dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
        end_date: dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined,
        limit,
        skip
      });
      return { requirements: res.data, tasks: [], employees: [] };
    }
    else if (activeTab === 'task') {
      const res = await getTaskReports({
        search: searchQuery,
        leader_id: filters.leader,
        assigned_id: filters.assigned,
        status: filters.status,
        start_date: dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
        end_date: dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined,
        limit,
        skip
      });
      return { requirements: [], tasks: res.data, employees: [] };
    }
    else {
      const res = await getEmployeeReports({
        search: searchQuery,
        department_id: filters.department_id,
        member_id: filters.member,
        start_date: dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
        end_date: dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined,
        limit,
        skip
      });
      return { requirements: [], tasks: [], employees: res.data };
    }
  };

  // Helper to wait for element to exist in DOM
  const waitForElement = (id: string, timeout = 3000): Promise<HTMLElement | null> => {
    return new Promise((resolve) => {
      if (document.getElementById(id)) {
        return resolve(document.getElementById(id));
      }

      const observer = new MutationObserver(() => {
        if (document.getElementById(id)) {
          observer.disconnect();
          resolve(document.getElementById(id));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(document.getElementById(id));
      }, timeout);
    });
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      // 1. Fetch ALL data
      const allData = await fetchAllDataForExport();

      // 2. Set data to state to render the hidden PDF component
      // We need sort the data same as UI if sortConfig is present
      if (sortConfig) {
        if (activeTab === 'requirement') allData.requirements = sortData(allData.requirements);
        if (activeTab === 'task') allData.tasks = sortData(allData.tasks);
        if (activeTab === 'member') allData.employees = sortData(allData.employees);
      }

      setExportData(allData);

      // 3. Wait for render (using MutationObserver instead of fixed timeout)
      await waitForElement('pdf-report-container');

      const fileName = `alsonotify_${activeTab}_report_${getDayjsInTimezone().format('YYYY-MM-DD')}.pdf`;
      const { generatePdf } = await import('./ReportsPdfGeneration');

      await generatePdf(fileName, 'pdf-report-container');
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
      setExportData(null); // Cleanup
    }
  };

  const handleDownloadIndividualPDF = async () => {
    if (!selectedMember) return;
    setIsDownloadingIndividual(true);
    try {
      // Ensure element is present (it should be since drawer is open, but safe to wait)
      await waitForElement('pdf-individual-report-container');

      const fileName = `alsonotify_employee_${selectedMember.member.replace(/\s+/g, '_')}_${getDayjsInTimezone().format('YYYY-MM-DD')}.pdf`;
      const { generatePdf } = await import('./ReportsPdfGeneration');
      await generatePdf(fileName, 'pdf-individual-report-container');
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert("Failed to generate PDF");
    } finally {
      setIsDownloadingIndividual(false);
    }
  }

  const handleExport = () => {
    handleDownloadPDF();
  };

  // --- Queries ---
  // All queries fetch upfront (no `enabled` flags) to prevent loading states on tab switch
  // staleTime prevents re-fetches when switching tabs
  // placeholderData keeps previous data visible while refetching (prevents flicker)

  // Requirements Query
  const { data: requirementData, isLoading: isLoadingRequirements } = useQuery<RequirementReportsResponse>({
    queryKey: ['requirement-reports', filters, searchQuery, dateRange, pagination],
    queryFn: async () => {
      const typeMap: Record<string, string> = {
        'In-house': 'inhouse',
        'Outsourced': 'outsourced',
        'Client Work': 'client'
      };

      return getRequirementReports({
        search: searchQuery,
        partner_id: filters.partner,
        status: filters.status,
        type: typeMap[filters.type] || filters.type,
        priority: filters.priority,
        department_id: filters.department_id,
        start_date: dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
        end_date: dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined,
        limit: pagination.limit,
        skip: pagination.skip,
      });
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });


  // Tasks Query
  const { data: taskData, isLoading: isLoadingTasks } = useQuery<TaskReportsResponse>({
    queryKey: ['task-reports', filters, searchQuery, dateRange, pagination],
    queryFn: () => getTaskReports({
      search: searchQuery,
      leader_id: filters.leader,
      assigned_id: filters.assigned,
      status: filters.status,
      start_date: dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
      end_date: dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined,
      limit: pagination.limit,
      skip: pagination.skip,
    }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Employees Query
  const { data: employeeData, isLoading: isLoadingEmployees } = useQuery<EmployeeReportsResponse>({
    queryKey: ['employee-reports', filters, searchQuery, dateRange, pagination],
    queryFn: () => getEmployeeReports({
      search: searchQuery,
      department_id: filters.department_id,
      member_id: filters.member,
      start_date: dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
      end_date: dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined,
      limit: pagination.limit,
      skip: pagination.skip,
    }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });



  // Process Data
  const requirements: RequirementReport[] = requirementData?.data || [];
  const kpi = requirementData?.kpi || {
    totalRequirements: 0,
    onTimeCompleted: 0,
    delayedCompleted: 0,
    inProgress: 0,
    delayed: 0,
    totalExtraHrs: 0,
    efficiency: 0
  };

  const tasks: TaskReport[] = taskData?.data || [];
  const taskKPI = taskData?.kpi || {
    totalTasks: 0,
    onTimeCompleted: 0,
    delayedCompleted: 0,
    inProgress: 0,
    delayed: 0,
    totalExtraHrs: 0,
    efficiency: 0
  };

  const employees: EmployeeReport[] = employeeData?.data || [];
  // Backend KPI (Still used for types or potential future comparison, but we override with calculated below)


  // Client-side Sorting
  const sortData = <T,>(data: T[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      // Safe access using the key as keyof T
      // We assume sortConfig.key is a valid key of T based on usage
      const key = sortConfig.key as keyof T;
      const aVal = a[key] as string | number | undefined | null;
      const bVal = b[key] as string | number | undefined | null;

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      return sortConfig.direction === 'asc' ? 1 : -1;
    });
  };

  const filteredRequirements: RequirementReport[] = sortData<RequirementReport>(requirements);
  const filteredTasks: TaskReport[] = sortData<TaskReport>(tasks);
  const filteredEmployees: EmployeeReport[] = sortData<EmployeeReport>(employees);

  // Use backend KPIs directly (no client-side recalculation)
  // This ensures KPIs reflect ALL filtered employees, not just the paginated subset
  const employeeKPI = employeeData?.kpi || {
    totalExpenses: 0,
    totalRevenue: 0,
    netProfit: 0,
    avgRatePerHr: 0,
    avgOccupancy: 0,
    avgEfficiency: 0,
    totalCount: 0
  };

  // Filter Configuration - memoized to prevent unnecessary re-renders
  const filterOptions: FilterOption[] = useMemo(() => {
    if (activeTab === 'requirement') {
      return [
        { id: 'partner', label: 'Contact Person', options: partnerOptions, defaultValue: 'All', placeholder: 'Select Contact Person', multiSelect: true },
        {
          id: 'status', label: 'Status', options: [
            { label: 'All', value: 'All' },
            { label: 'Completed', value: 'Completed' },
            { label: 'In Progress', value: 'In_Progress' },
            { label: 'Review', value: 'Review' },
            { label: 'Revision', value: 'Revision' },
            { label: 'Delayed', value: 'Delayed' },
            { label: 'Assigned', value: 'Assigned' }
          ], defaultValue: 'All'
        },
        {
          id: 'type', label: 'Type', options: [
            { label: 'All', value: 'All' },
            { label: 'In-house', value: 'In-house' },
            { label: 'Outsourced', value: 'Outsourced' },
            { label: 'Client Work', value: 'Client Work' }
          ], defaultValue: 'All', placeholder: 'Select Type'
        },
        { id: 'priority', label: 'Priority', options: ['All', 'High', 'Normal'], defaultValue: 'All', placeholder: 'Select Priority' },
        { id: 'department_id', label: 'Department', options: departmentOptions, defaultValue: 'All', placeholder: 'Select Department' }
      ];
    } else if (activeTab === 'task') {
      return [
        { id: 'leader', label: 'Leader', options: employeeOptions, defaultValue: 'All', placeholder: 'Select Leader', multiSelect: true },
        { id: 'assigned', label: 'Member', options: employeeOptions, defaultValue: 'All', placeholder: 'Select Member', multiSelect: true },
        {
          id: 'status', label: 'Status', options: [
            { label: 'All', value: 'All' },
            { label: 'Assigned', value: 'Assigned' },
            { label: 'Completed', value: 'Completed' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Delayed', value: 'Delayed' },
            { label: 'In Review', value: 'Review' },
          ], defaultValue: 'All'
        },
      ];
    } else {
      return [
        { id: 'member', label: 'Member', options: employeeOptions, defaultValue: 'All', placeholder: 'Select Member', multiSelect: true },
        { id: 'department_id', label: 'Department', options: departmentOptions, defaultValue: 'All', placeholder: 'Select Department' }
      ];
    }
  }, [activeTab, partnerOptions, employeeOptions, departmentOptions]);

  // Selected Member Logic
  // Find member in the fetched employees list
  const selectedMemberData = employees.find(m => String(m.id) === selectedMemberId) || null;

  // Adapt EmployeeReport to the shape expected by the drawer (MemberRow-like)
  const selectedMember = selectedMemberData ? {
    ...selectedMemberData,
    totalWorkingHrs: selectedMemberData.totalWorkingHrs,
    actualEngagedHrs: selectedMemberData.engagedHrs,
    costPerHour: selectedMemberData.hourlyCost,
    billablePerHour: 0,
    efficiency: selectedMemberData.efficiency,
    utilization: selectedMemberData.utilization
  } as any : null;

  // Placeholder task filtering for member drawer - Mock worklogs as we don't have an endpoint for user worklogs yet
  // Query Member Worklogs
  const { data: memberWorklogs } = useQuery<MemberWorklog[]>({
    queryKey: ['member-worklogs', selectedMemberId, dateRange],
    queryFn: () => getMemberWorklogs(
      selectedMemberId!,
      dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
      dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined
    ),
    enabled: !!selectedMemberId
  });

  const selectedMemberWorklogs = memberWorklogs || [];


  return (
    <PageLayout
      title="Reports"
      tabs={[
        { id: 'requirement', label: 'Requirement' },
        { id: 'task', label: 'Tasks' },
        { id: 'member', label: 'Employee' }

      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as 'requirement' | 'task' | 'member')}
      customFilters={
        <div className="flex items-center gap-3">
          <Button
            onClick={handleExport}
            icon={<Download className="w-4 h-4" />}
            className="font-semibold text-xs rounded-full"
            disabled={isDownloading}
          >
            {isDownloading ? 'Generating...' : 'Download'}
          </Button>
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      }
    >
      <div className="flex flex-col h-full relative overflow-hidden">
        {/* Filter Bar - Fixed at top */}
        <div className="mb-6 space-y-4 shrink-0 px-1">
          <FilterBar
            filters={filterOptions}
            selectedFilters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            searchPlaceholder="Search reports..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            showClearButton={true}
          />

          {/* Summary Cards */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${activeTab === 'member' ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
            {/* Requirement KPI Cards */}
            {isLoadingRequirements ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={`req-kpi-skel-${i}`} className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-1 justify-center animate-pulse">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ))
            ) : (
              <>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Total Requirements</span>
                    <Tooltip title="Total active requirements in period. Excludes Draft, Pending, and Archived statuses." styles={{ root: { maxWidth: 260 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#111111]">{kpi.totalRequirements}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">On Time Completed</span>
                    <Tooltip title="Completed on or under budget. Over-budget completions count as Delayed." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#0F9D58]">{kpi.onTimeCompleted}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">In Progress</span>
                    <Tooltip title="Currently active requirements (e.g., Assigned, In Progress, Review)." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-[#111111]">{kpi.inProgress}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Delayed</span>
                    <Tooltip title="Past due or over-budget. +Xh = extra hours logged on over-budget completions." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-[#FF3B3B]">{kpi.delayed}</span>
                    <span className="text-xs font-medium text-[#FF3B3B]">(+{kpi.totalExtraHrs}h)</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Efficiency</span>
                    <Tooltip title="% of requirements completed on time and within budget." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#2196F3]">
                    {kpi.efficiency}%
                  </span>
                </div>
              </>
            )}

            {/* Task KPI Cards */}
            {isLoadingTasks ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={`task-kpi-skel-${i}`} className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-1 justify-center animate-pulse ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ))
            ) : (
              <>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Total Tasks</span>
                    <Tooltip title="Total active tasks in period. Excludes standard sub-tasks and deleted tasks." styles={{ root: { maxWidth: 260 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#111111]">{taskKPI.totalTasks}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">On Time Completed</span>
                    <Tooltip title="Completed within estimated hours. Over-budget completions count as Delayed." styles={{ root: { maxWidth: 260 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#0F9D58]">{taskKPI.onTimeCompleted}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">In Progress</span>
                    <Tooltip title="Currently active tasks (e.g., Assigned, In Progress, Review)." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-[#111111]">{taskKPI.inProgress}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Delayed</span>
                    <Tooltip title="Past due, marked Delayed, or over-budget. +Xh = extra hours logged on over-budget tasks." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-[#FF3B3B]">{taskKPI.delayed}</span>
                    <span className="text-xs font-medium text-[#FF3B3B]">(+{taskKPI.totalExtraHrs}h)</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Efficiency</span>
                    <Tooltip title="% of tasks completed on time and within estimated hours." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#2196F3]">
                    {taskKPI.efficiency}%
                  </span>
                </div>
              </>
            )}

            {/* Member/Employee KPI Cards - 6 columns layout */}
            {isLoadingEmployees ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`member-kpi-skel-${i}`} className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-1 justify-center animate-pulse ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ))
            ) : (
              <>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Total Expenses</span>
                    <Tooltip title="Total cost = Sum of (logged hours × hourly rate) for all employees." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#111111]">{currencySymbol}{employeeKPI.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Total Revenue</span>
                    <Tooltip title="Revenue from client/outsourced work, prorated by each employee's logged hours. In-house = $0." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#0F9D58]">{currencySymbol}{employeeKPI.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Net Profit</span>
                    <Tooltip title="Total Revenue − Total Expenses. Positive = profitable." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className={`text-xl font-bold ${employeeKPI.netProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`}>
                    {currencySymbol}{employeeKPI.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Avg. Rate/Hr</span>
                    <Tooltip title="Average hourly cost rate across filtered employees." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className="text-xl font-bold text-[#2196F3]">
                    {currencySymbol}{employeeKPI.avgRatePerHr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Occupancy</span>
                    <Tooltip title="Workforce utilization: (Logged hours ÷ Available hours) × 100. ≥70% is healthy." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className={`text-xl font-bold ${employeeKPI.avgOccupancy >= 70 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`}>
                    {employeeKPI.avgOccupancy}%
                  </span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-[#666666]">Efficiency</span>
                    <Tooltip title="On-time delivery rate: (Tasks completed on time ÷ Total tasks) × 100. ≥75% is good." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                      <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0" />
                    </Tooltip>
                  </div>
                  <span className={`text-xl font-bold ${employeeKPI.avgEfficiency >= 75 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`}>
                    {employeeKPI.avgEfficiency}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>


        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto w-full relative">
          {/* Requirements Table */}
          <div className={activeTab === 'requirement' ? '' : 'hidden'}>
            {isLoadingRequirements ? (
              <div className="space-y-2 px-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[36px_2fr_0.9fr_0.75fr_1.4fr_0.6fr_1fr_0.6fr] gap-2 px-4 py-4 items-center min-w-[900px]">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-6 rounded-full mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-1 space-y-2">
                {/* Header */}
                <div className="sticky top-0 z-20 min-w-[900px] bg-white border border-transparent grid grid-cols-[36px_2fr_0.9fr_0.75fr_1.4fr_0.6fr_1fr_0.6fr] gap-2 px-4 py-3 mb-2 items-center">
                  <div><TableHeader label="No" /></div>
                  <TableHeader label="Requirement" sortKey="requirement" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Contact Person" sortKey="manager" currentSort={sortConfig} onSort={handleSort} tooltip="Contact Person" />
                  <TableHeader label="Timeline" />
                  <TableHeader label="Hours Utilization" sortKey="efficiency" currentSort={sortConfig} onSort={handleSort} tooltip="Engaged (logged) hours versus Allotted (budget) hours." />
                  <TableHeader label="Revision" sortKey="revision" currentSort={sortConfig} onSort={handleSort} tooltip="Number of revisions (scope changes)." />
                  <TableHeader label="Revenue / P&L" sortKey="revenue" currentSort={sortConfig} onSort={handleSort} tooltip="Quoted Price versus computed Profit/Loss." />
                  <TableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                </div>

                {/* Rows */}
                {filteredRequirements.map((row, idx) => (
                  <div
                    key={row.id}
                    className="group min-w-[900px] bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[36px_2fr_0.9fr_0.75fr_1.4fr_0.6fr_1fr_0.6fr] gap-2 px-4 py-2 items-center hover:border-[#ff3b3b]/20 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="task-row-sub text-[#666666] font-medium self-center">{idx + 1}</div>

                    <div className="flex flex-col justify-center gap-1 min-w-0">
                      <span className="task-row-main text-[#111111] font-bold leading-tight truncate" title={row.requirement}>{row.requirement}</span>
                      <span className="task-row-sub text-[#666666] font-medium truncate" title={row.partner}>
                        {row.partner}
                      </span>
                      {/* Tags Row */}
                      <div className="flex flex-wrap gap-1.5 items-center text-xs font-semibold uppercase tracking-wider mt-0.5">
                         {row.type && <span className="bg-[#F5F5F5] text-[#888888] px-1.5 py-0.5 rounded" title="Type">{row.type}</span>}
                         {row.priority && <span className={`px-1.5 py-0.5 rounded ${row.priority === 'High' ? 'bg-[#FFF0F0] text-[#FF3B3B]' : 'bg-[#F0F8FF] text-[#2196F3]'}`} title="Priority">{row.priority}</span>}
                         {row.department && <span className="bg-[#F0FDF4] text-[#0F9D58] px-1.5 py-0.5 rounded truncate max-w-[80px]" title="Department">{row.department}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-0.5 min-w-0">
                      <span className="task-row-main text-[#111111] font-medium truncate" title={row.manager || 'Unassigned'}>{row.manager || 'Unassigned'}</span>
                    </div>

                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                      <span className="task-row-main text-[#111111] font-medium truncate">{formatWithTimezone(row.startDate, 'MMM DD')}</span>
                      <span className={`task-row-sub truncate ${dayjs().isAfter(dayjs(row.endDate), 'day') && row.status !== 'Completed' ? 'text-[#FF3B3B] font-bold' : 'text-[#666666]'}`}>
                        to {formatWithTimezone(row.endDate, 'MMM DD')}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 justify-center items-start min-w-0">
                      {(() => {
                        const remaining = (row.allottedHrs || 0) - (row.engagedHrs || 0);
                        const isBleeding = row.engagedHrs > (row.allottedHrs || 0);
                        const isWarning = !isBleeding && (row.allottedHrs || 0) > 0 && row.engagedHrs >= ((row.allottedHrs || 0) * 0.8);

                        // Calculate visualization percentages (max 100%)
                        const total = (row.allottedHrs || 0) > 0 ? row.allottedHrs : Math.max(row.engagedHrs || 1, 1);
                        const fillRatio = Math.min((row.engagedHrs || 0) / total, 1);
                        const fillPercent = `${(fillRatio * 100).toFixed(1)}%`;

                        // Determine colors
                        const barColor = isBleeding ? 'bg-[#FF3B3B]' : isWarning ? 'bg-[#EAB308]' : 'bg-[#2F80ED]';
                        const trackColor = 'bg-[#F0F0F0]';

                        return (
                          <>
                            <div className="flex items-center justify-between w-full">
                                <span className="task-row-sub font-medium whitespace-nowrap text-[#111111]">
                                  {row.engagedHrs?.toFixed(1)}h{(row.allottedHrs || 0) > 0 ? `/${row.allottedHrs.toFixed(1)}h` : ''}
                                </span>
                                <span className={`task-row-sub font-medium whitespace-nowrap ${isBleeding ? 'text-[#FF3B3B]' : isWarning ? 'text-[#EAB308]' : 'text-[#666666]'}`}>
                                  {isBleeding ? `+${Math.abs(remaining).toFixed(1)}h over` : `${remaining.toFixed(1)}h left`}
                                </span>
                            </div>
                            {/* Micro-visualization Sparkline */}
                            <div className={`h-[3.5px] w-full rounded-full overflow-hidden ${trackColor}`}>
                                <div 
                                    className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                                    style={{ width: fillPercent }} 
                                />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="task-row-sub font-semibold flex items-center justify-start gap-1 min-w-0 self-center">
                      {row.revision > 0 ? (
                        <span className={`px-2 py-0.5 rounded-md ${row.revision > 1 ? 'bg-[#FFF4EC] text-[#FF8A00]' : 'bg-[#F5F5F5] text-[#666666]'}`}>
                          v{row.revision + 1}
                        </span>
                      ) : (
                        <span className="text-[#CCCCCC]">-</span>
                      )}
                    </div>

                    <div className="flex flex-col items-start min-w-0">
                      <div className="task-row-sub text-[#666666]" title={currencySymbol + (row.revenue || 0).toLocaleString()}>
                        {currencySymbol}{(row.revenue || 0).toLocaleString()}
                      </div>
                      <div className={`task-row-main font-bold flex items-center gap-1 ${row.profit >= 0 ? 'text-[#00A389]' : 'text-[#FF3B3B]'}`} title={currencySymbol + (row.profit || 0).toLocaleString()}>
                        {row.profit >= 0 ? '+' : ''}{currencySymbol}{(row.profit || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex justify-start self-center"><TaskStatusBadge status={row.status} /></div>
                  </div>
                ))}

                {filteredRequirements.length === 0 && (
                  <div className="text-center py-12 text-[#999999] text-xs">No requirements found matching your filters.</div>
                )}

                {/* Pagination moved outside */}
              </div>
            )}
          </div>

          {/* Tasks Table */}
          <div className={activeTab === 'task' ? '' : 'hidden'}>
            {isLoadingTasks ? (
              <div className="space-y-2 px-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[36px_2.4fr_1fr_0.8fr_0.8fr_0.75fr_1.2fr_0.5fr] gap-2 px-4 py-4 items-center min-w-[900px]">
                    <Skeleton className="h-4 w-4" />
                    <div className="flex flex-col gap-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-14" />
                    <div className="flex flex-col gap-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-[3.5px] w-full rounded-full" /></div>
                    <Skeleton className="h-6 w-20 rounded-full mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-1 space-y-2">
                {/* Header */}
                <div className="sticky top-0 z-20 min-w-[900px] bg-white border border-transparent grid grid-cols-[36px_2.4fr_1fr_0.8fr_0.8fr_0.75fr_1.2fr_0.5fr] gap-2 px-4 py-3 mb-2 items-center">
                  <div><TableHeader label="No" /></div>
                  <TableHeader label="Task" sortKey="task" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Requirement" sortKey="requirement" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Leader" sortKey="leader" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Assigned" sortKey="assigned" currentSort={sortConfig} onSort={handleSort} align="center" />
                  <TableHeader label="Due Date" sortKey="dueDate" currentSort={sortConfig} onSort={handleSort} tooltip="Task due date. Red = overdue." />
                  <TableHeader label="Hours Variance" sortKey="engagedHrs" currentSort={sortConfig} onSort={handleSort} tooltip="Engaged (logged) vs. Allotted (estimated) hours." />
                  <TableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} align="center" />
                </div>

                {/* Rows */}
                {filteredTasks.map((row, idx) => {
                  const isOverdue = row.dueDate && dayjs().isAfter(dayjs(row.dueDate), 'day') && row.status !== 'Completed';
                  const remaining = (row.allottedHrs || 0) - (row.engagedHrs || 0);
                  const isBleeding = row.engagedHrs > (row.allottedHrs || 0);
                  const isWarning = !isBleeding && (row.allottedHrs || 0) > 0 && row.engagedHrs >= ((row.allottedHrs || 0) * 0.8);
                  const hasEstimate = (row.allottedHrs || 0) > 0;
                  const total = hasEstimate ? row.allottedHrs : Math.max(row.engagedHrs || 1, 1);
                  const fillRatio = Math.min((row.engagedHrs || 0) / total, 1);
                  const fillPercent = `${(fillRatio * 100).toFixed(1)}%`;
                  const barColor = isBleeding ? 'bg-[#FF3B3B]' : isWarning ? 'bg-[#FF8A00]' : 'bg-[#111111]';

                  return (
                    <div
                      key={row.id}
                      className="group min-w-[900px] bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[36px_2.4fr_1fr_0.8fr_0.8fr_0.75fr_1.2fr_0.5fr] gap-2 px-4 py-2 items-center hover:border-[#ff3b3b]/20 hover:shadow-lg transition-all duration-300"
                    >
                      {/* No */}
                      <div className="task-row-sub text-[#666666] font-medium self-center">{idx + 1}</div>

                      {/* Task + Workspace */}
                      <div className="flex flex-col justify-center gap-0.5 min-w-0">
                        <span className="task-row-main text-[#111111] font-bold leading-tight truncate" title={row.task}>{row.task}</span>
                        {row.workspaceName && (
                          <span className="task-row-sub text-[#666666] font-medium truncate" title={row.workspaceName}>{row.workspaceName}</span>
                        )}
                      </div>

                      {/* Requirement */}
                      <div className="task-row-main text-[#111111] font-medium min-w-0 truncate" title={row.requirement}>{row.requirement}</div>

                      {/* Leader */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar 
                          size={26} 
                          src={row.leaderAvatar}
                          style={{ backgroundColor: '#F0F0F0', color: '#111111', fontSize: '10px', flexShrink: 0 }}
                          className="border border-[#EEEEEE]"
                        >
                          {row.leader ? row.leader.charAt(0).toUpperCase() : 'L'}
                        </Avatar>
                        <span className="task-row-main text-[#111111] font-medium truncate" title={row.leader}>{row.leader}</span>
                      </div>

                      {/* Assigned */}
                      <div className="flex items-center justify-center self-center">
                        <Tooltip title={row.assigned}>
                          <Avatar size={26} style={{ backgroundColor: '#CCCCCC', color: '#111111' }}>
                            {row.assigned ? row.assigned.charAt(0).toUpperCase() : 'U'}
                          </Avatar>
                        </Tooltip>
                      </div>

                      {/* Due Date */}
                      <div className="min-w-0">
                        {row.dueDate ? (
                          <span className={`task-row-main ${isOverdue ? 'font-bold text-[#FF3B3B]' : 'font-medium text-[#111111]'} truncate`}>
                            {formatWithTimezone(row.dueDate, 'MMM DD')}
                          </span>
                        ) : (
                          <span className="task-row-main text-[#CCCCCC]">-</span>
                        )}
                      </div>

                      {/* Hours Variance */}
                      <div className="flex flex-col gap-1.5 justify-center items-start min-w-0">
                        <div className="flex items-center justify-between w-full">
                          <span className="task-row-sub font-medium whitespace-nowrap text-[#111111]">
                            {row.engagedHrs?.toFixed(1)}h{hasEstimate ? `/${row.allottedHrs?.toFixed(1)}h` : ''}
                          </span>
                          {hasEstimate ? (
                            <span className={`task-row-sub font-medium whitespace-nowrap ${isBleeding ? 'text-[#FF3B3B]' : isWarning ? 'text-[#EAB308]' : 'text-[#666666]'}`}>
                              {isBleeding ? `+${Math.abs(remaining).toFixed(1)}h over` : `${remaining.toFixed(1)}h left`}
                            </span>
                          ) : (
                            <span className="task-row-sub text-[#666666] font-medium whitespace-nowrap">No estimate</span>
                          )}
                        </div>
                        <div className="h-[3px] w-full rounded-full overflow-hidden bg-[#F0F0F0]">
                          <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: fillPercent }} />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex justify-center self-center">
                        <TaskStatusBadge status={row.status} showLabel={false} />
                      </div>
                    </div>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-12 text-[#999999] text-xs">No tasks found matching your filters.</div>
                )}
                {/* Pagination moved outside */}
              </div>
            )}
          </div>

          {/* Member/Employee Table */}
          <div className={activeTab === 'member' ? '' : 'hidden'}>
            {isLoadingEmployees ? (
              <div className="space-y-2 px-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[36px_2.5fr_1.8fr_1fr_1fr_1fr_1.2fr] gap-4 px-4 py-4 items-center">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-1 space-y-2">
                {/* Header */}
                <div className="sticky top-0 z-20 min-w-[1000px] bg-white border border-transparent grid grid-cols-[36px_2.5fr_1.8fr_1fr_1fr_1fr_1.2fr] gap-4 px-4 py-3 mb-2 items-center">
                  <div><TableHeader label="No" /></div>
                  <TableHeader label="Member" sortKey="member" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Tasks Performance" tooltip="Breakdown of assigned tasks: Completed (green), In-progress (blue), Delayed (red)." />
                  <TableHeader label="Load" sortKey="utilization" currentSort={sortConfig} onSort={handleSort} tooltip="Occupancy rate. Red bar means logged hours exceed capacity (>100%)." />
                  <TableHeader label="Expenses" sortKey="expenses" currentSort={sortConfig} onSort={handleSort} tooltip="Cost = Logged hours × Hourly rate." />
                  <TableHeader label="Revenue" sortKey="revenue" currentSort={sortConfig} onSort={handleSort} tooltip="Revenue share from client/outsourced work based on hours contributed." />
                  <TableHeader label="Net Profit" sortKey="profit" currentSort={sortConfig} onSort={handleSort} tooltip="Revenue − Expenses. Positive = profitable contributor." />
                </div>

                {/* Rows */}
                {filteredEmployees.map((row, idx) => (
                  <div
                    key={row.id}
                    className="group min-w-[1000px] bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[36px_2.5fr_1.8fr_1fr_1fr_1fr_1.2fr] gap-4 px-4 py-2 items-center hover:border-[#ff3b3b]/20 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedMemberId(String(row.id))}
                  >
                    <div className="task-row-sub text-[#666666] font-medium self-center">{idx + 1}</div>

                    <div className="flex flex-col justify-center min-w-0">
                      <span className="task-row-main text-[#111111] font-bold min-w-0 truncate" title={row.member}>{row.member}</span>
                      <span className="task-row-sub text-[#666666] font-medium min-w-0 truncate" title={`${row.designation} | ${row.department}`}>{row.designation} <span className="text-[#E5E5E5] mx-1">|</span> {row.department}</span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="task-row-main text-[#111111] font-bold truncate">
                        {row.taskStats.assigned} <span className="task-row-sub text-[#666666] font-medium">Assigned</span>
                      </span>
                      <div className="flex gap-3 mt-1 task-row-sub font-medium text-[#666666] overflow-hidden">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0F9D58]"></div>
                          <span>{row.taskStats.completed}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]"></div>
                          <span>{row.taskStats.inProgress}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B3B]"></div>
                          <span>{row.taskStats.delayed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Load / Utilization */}
                    <div className="flex flex-col gap-1.5 justify-center min-w-0">
                      <div className="flex justify-between">
                        <span className="task-row-main font-medium text-[#111111] truncate">{row.utilization}%</span>
                      </div>
                      <div className="w-full h-[3.5px] bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.utilization > 100 ? 'bg-[#FF3B3B]' : 'bg-[#111111]'}`}
                          style={{ width: `${Math.min(row.utilization, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="task-row-main text-[#111111] font-medium text-left min-w-0 truncate self-center" title={currencySymbol + (row.expenses || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}>{currencySymbol}{(row.expenses || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="task-row-main text-[#111111] font-medium text-left min-w-0 truncate self-center" title={currencySymbol + (row.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}>{currencySymbol}{(row.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className={`task-row-main font-bold text-left min-w-0 truncate self-center ${row.profit >= 0 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`} title={(row.profit >= 0 ? '+' : '') + currencySymbol + (row.profit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}>
                      {row.profit >= 0 ? '+' : ''}{currencySymbol}{(row.profit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="text-center py-12 text-[#999999] text-xs">No employees found matching your filters.</div>
                )}

                {/* Pagination moved outside */}
              </div>
            )}
          </div>
        </div>

        {/* Unified Sticky Pagination Bar */}
        {!isLoadingRequirements && !isLoadingTasks && !isLoadingEmployees && (
          <div className="bg-white shrink-0 px-4">
            <PaginationBar
              currentPage={Math.floor(pagination.skip / pagination.limit) + 1}
              totalItems={
                activeTab === 'requirement' ? (kpi?.totalRequirements || 0) :
                  activeTab === 'task' ? (taskKPI?.totalTasks || 0) :
                    (employeeKPI?.totalCount || 0)
              }
              pageSize={pagination.limit}
              onPageChange={(page) => setPagination(prev => ({ ...prev, skip: (page - 1) * pagination.limit }))}
              onPageSizeChange={(limit) => setPagination({ limit, skip: 0 })}
              itemLabel={activeTab === 'requirement' ? 'requirements' : activeTab === 'task' ? 'tasks' : 'members'}
            />
          </div>
        )}

        <EmployeeDetailsDrawer
          isOpen={!!selectedMemberId}
          onClose={() => setSelectedMemberId(null)}
          member={selectedMember}
          worklogs={selectedMemberWorklogs}
          isDownloading={isDownloadingIndividual}
          onDownload={handleDownloadIndividualPDF}
        />

        {/* Hidden PDF Template Component */}
        {(isDownloading && exportData) && (
          <ReportsPdfTemplate
            activeTab={activeTab}
            data={activeTab === 'requirement' ? exportData!.requirements : activeTab === 'task' ? exportData!.tasks : exportData!.employees}
            kpis={(activeTab === 'requirement' ? kpi : activeTab === 'task' ? taskKPI : employeeKPI) as any}
            dateRange={dateRange}
            companyName={companyName}
            timezone={companyTimezone}
            currency={companyCurrency}
          />
        )}

        {/* Hidden Individual Employee PDF Template */}
        {selectedMember && (
          <IndividualEmployeePdfTemplate
            member={selectedMember}
            worklogs={selectedMemberWorklogs}
            dateRange={dateRange}
            companyName={companyName}
            timezone={companyTimezone}
            currency={companyCurrency}
          />
        )}


      </div>
    </PageLayout>
  );
}
