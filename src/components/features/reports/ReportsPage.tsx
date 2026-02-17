import { useState, useMemo, useEffect } from 'react';
import {
  Download, Clock, CheckCircle, ArrowUp, ArrowDown, Receipt, FilePlus
} from 'lucide-react';
import { PageLayout } from '../../layout/PageLayout';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { DateRangeSelector } from '../../common/DateRangeSelector';
import { Tooltip, Button } from "antd";
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
import { getRequirementReports, getTaskReports, getEmployeeReports, getMemberWorklogs } from '../../../services/report';
import EmployeeDetailsDrawer from './components/EmployeeDetailsDrawer';
import { PaginationBar } from '../../ui/PaginationBar';

// Initialize dayjs plugins
dayjs.extend(isBetween);



// --- Helper Components ---

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: any, color: string, label: string }> = {
    'Completed': { icon: Receipt, color: 'text-[#EF6C00]', label: 'Ready to Bill' },
    'In Progress': { icon: Clock, color: 'text-[#2F80ED]', label: 'In Progress' },
    'Delayed': { icon: Clock, color: 'text-[#EB5757]', label: 'Delayed' },
    'paid': { icon: CheckCircle, color: 'text-[#7ccf00]', label: 'Payment Received' },
    'billed': { icon: CheckCircle, color: 'text-[#2196F3]', label: 'Invoice Sent' },
    'Draft': { icon: FilePlus, color: 'text-[#666666]', label: 'Draft' },
  };

  // Allow case-insensitive lookups or maps
  const lookup = status === 'completed' ? 'Completed' :
    status === 'in-progress' ? 'In Progress' :
      status === 'delayed' ? 'Delayed' :
        status;

  const style = config[lookup] || { icon: Clock, color: 'text-[#6B7280]', label: status };
  const Icon = style.icon;

  return (
    <Tooltip title={style.label}>
      <div className="cursor-help inline-flex items-center justify-center p-1">
        <Icon className={`w-5 h-5 ${style.color} ${lookup === 'In Progress' && status !== 'Delayed' ? '' : ''}`} />
      </div>
    </Tooltip>
  );
}

function TableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'left'
}: {
  label: string;
  sortKey?: string;
  currentSort?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  align?: 'left' | 'right' | 'center';
}) {
  const isSorted = currentSort?.key === sortKey;

  return (
    <button
      className={`flex items-center gap-1 group outline-none ${sortKey ? 'cursor-pointer' : 'cursor-default'} ${align === 'right' ? 'ml-auto' : align === 'center' ? 'mx-auto' : ''}`}
      onClick={() => sortKey && onSort?.(sortKey)}
      disabled={!sortKey}
    >
      <span className={`text-[11px] font-['Manrope:Bold',sans-serif] uppercase tracking-wide transition-colors ${isSorted ? 'text-[#111111]' : 'text-[#999999] group-hover:text-[#666666]'}`}>
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
  );
}


// --- Main Component ---

export function ReportsPage() {
  const [activeTab, setActiveTab] = useTabSync<'requirement' | 'task' | 'member'>({
    defaultTab: 'requirement',
    validTabs: ['requirement', 'task', 'member']
  });


  const { companyName, companyTimezone, formatWithTimezone, getDayjsInTimezone } = useTimezone();

  // Fetch Dropdown Data
  const { data: partnersData } = usePartners();
  const { data: employeesData } = useEmployees("is_active=true&limit=1000"); // Fetch all active for filters
  const { data: departmentsData } = useCompanyDepartments();

  const partnerOptions = useMemo(() => [
    { label: 'All', value: 'All' },
    ...(partnersData?.result || []).map((p) => ({ label: p.name, value: String(p.id) }))
  ], [partnersData]);

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
    department: 'All'
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
      department: 'All',
      type: 'All',
      priority: 'All'
    });
    setSearchQuery('');
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const fileName = `alsonotify_${activeTab}_report_${getDayjsInTimezone().format('YYYY-MM-DD')}.pdf`;
      const { generatePdf } = await import('./ReportsPdfGeneration');
      await generatePdf(fileName, 'pdf-report-container');
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert("Failed to generate PDF. Please check console for details.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadIndividualPDF = async () => {
    if (!selectedMember) return;
    setIsDownloadingIndividual(true);
    try {
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
  const { data: requirementData, isLoading: isLoadingRequirements } = useQuery({
    queryKey: ['requirement-reports', filters, searchQuery, dateRange],
    queryFn: () => getRequirementReports({
      search: searchQuery,
      partner_id: filters.partner,
      status: filters.status,
      type: filters.type,
      priority: filters.priority,
      department_id: filters.department,
      start_date: dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
      end_date: dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined,
      limit: pagination.limit,
      skip: pagination.skip,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents re-fetches on tab switch
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });


  // Tasks Query
  const { data: taskData, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['task-reports', filters, searchQuery, dateRange],
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
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents re-fetches on tab switch
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });

  // Employees Query
  const { data: employeeData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employee-reports', filters, searchQuery, dateRange],
    queryFn: () => getEmployeeReports({
      search: searchQuery,
      department_id: filters.department,
      member_id: filters.member,
      start_date: dateRange && dateRange[0] ? dateRange[0].toISOString() : undefined,
      end_date: dateRange && dateRange[1] ? dateRange[1].toISOString() : undefined,
      limit: pagination.limit,
      skip: pagination.skip,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents re-fetches on tab switch
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });



  // Process Data
  const requirements = requirementData?.data || [];
  const kpi = requirementData?.kpi || {
    totalRequirements: 0,
    onTimeCompleted: 0,
    delayedCompleted: 0,
    inProgress: 0,
    delayed: 0,
    totalExtraHrs: 0,
    efficiency: 0
  };

  const tasks = taskData?.data || [];
  const taskKPI = taskData?.kpi || {
    totalTasks: 0,
    onTimeCompleted: 0,
    delayedCompleted: 0,
    inProgress: 0,
    delayed: 0,
    totalExtraHrs: 0,
    efficiency: 0
  };

  const employees = employeeData?.data || [];
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

  const filteredRequirements = sortData(requirements);
  const filteredTasks = sortData(tasks);
  const filteredEmployees = sortData(employees);

  // Client-side KPI Calculation for Employees
  const employeeKPI = useMemo(() => {
    const totals = filteredEmployees.reduce(
      (acc, employee) => {
        const inv = employee.engagedHrs * employee.hourlyCost;
        const rev = employee.revenue;
        return {
          totalInvestment: acc.totalInvestment + inv,
          totalRevenue: acc.totalRevenue + rev,
          totalEngagedHrs: acc.totalEngagedHrs + employee.engagedHrs,
          totalUtilization: acc.totalUtilization + (employee.utilization || 0)
        };
      },
      { totalInvestment: 0, totalRevenue: 0, totalEngagedHrs: 0, totalUtilization: 0 }
    );

    return {
      totalInvestment: totals.totalInvestment,
      totalRevenue: totals.totalRevenue,
      netProfit: totals.totalRevenue - totals.totalInvestment,
      avgRatePerHr: totals.totalEngagedHrs > 0
        ? totals.totalRevenue / totals.totalEngagedHrs
        : 0,
      avgUtilization: filteredEmployees.length > 0
        ? Math.round(totals.totalUtilization / filteredEmployees.length)
        : 0,
      totalCount: employeeData?.kpi?.totalCount || filteredEmployees.length
    };
  }, [filteredEmployees, employeeData]);

  // Debug Logs


  // Filter Configuration - memoized to prevent unnecessary re-renders
  const filterOptions: FilterOption[] = useMemo(() => {
    if (activeTab === 'requirement') {
      return [
        { id: 'partner', label: 'Partner', options: partnerOptions, defaultValue: 'All', placeholder: 'Select Partner' },
        { id: 'status', label: 'Status', options: ['All', 'Completed', 'In Progress', 'Delayed'], defaultValue: 'All' },
        { id: 'type', label: 'Type', options: ['All', 'Inhouse', 'Outsourced'], defaultValue: 'All', placeholder: 'Select Type' },
        { id: 'priority', label: 'Priority', options: ['All', 'High', 'Normal'], defaultValue: 'All', placeholder: 'Select Priority' },
        { id: 'department', label: 'Department', options: departmentOptions, defaultValue: 'All', placeholder: 'Select Department' }
      ];
    } else if (activeTab === 'task') {
      return [
        { id: 'leader', label: 'Leader', options: employeeOptions, defaultValue: 'All', placeholder: 'Select Leader' },
        { id: 'assigned', label: 'Assigned', options: employeeOptions, defaultValue: 'All', placeholder: 'Select Member' },
        { id: 'status', label: 'Status', options: ['All', 'Completed', 'In Progress', 'Delayed'], defaultValue: 'All' }
      ];
    } else {
      return [
        { id: 'member', label: 'Member', options: employeeOptions, defaultValue: 'All', placeholder: 'Select Member' },
        { id: 'department', label: 'Department', options: departmentOptions, defaultValue: 'All', placeholder: 'Select Department' }
      ];
    }
  }, [activeTab, partnerOptions, employeeOptions, departmentOptions]);

  // Selected Member Logic
  // Find member in the fetched employees list
  const selectedMemberData = employees.find(m => String(m.id) === selectedMemberId) || null;

  // Adapt EmployeeReport to the shape expected by the drawer (MemberRow-like)
  const selectedMember = selectedMemberData ? {
    ...selectedMemberData,
    totalWorkingHrs: selectedMemberData.utilization > 0 ? Math.round(selectedMemberData.engagedHrs / (selectedMemberData.utilization / 100)) : 0,
    actualEngagedHrs: selectedMemberData.engagedHrs,
    costPerHour: selectedMemberData.hourlyCost,
    billablePerHour: 0 // Not in API yet
  } : null;

  // Placeholder task filtering for member drawer - Mock worklogs as we don't have an endpoint for user worklogs yet
  // Query Member Worklogs
  const { data: memberWorklogs } = useQuery({
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
            className="font-['Manrope:SemiBold',sans-serif] text-[13px] rounded-full"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-5">
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
                  <span className="text-[12px] font-medium text-[#666666]">Total Requirements</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#111111]">{kpi.totalRequirements}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">On Time Completed</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#0F9D58]">{kpi.onTimeCompleted}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">In Progress</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#111111]">{kpi.inProgress}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Delayed</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#FF3B3B]">{kpi.delayed}</span>
                    <span className="text-sm font-medium text-[#FF3B3B]">(+{kpi.totalExtraHrs}h)</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'requirement' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Avg. Efficiency</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#2196F3]">
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
                  <span className="text-[12px] font-medium text-[#666666]">Total Tasks</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#111111]">{taskKPI.totalTasks}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">On Time Completed</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#0F9D58]">{taskKPI.onTimeCompleted}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">In Progress</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#111111]">{taskKPI.inProgress}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Delayed</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#FF3B3B]">{taskKPI.delayed}</span>
                    <span className="text-sm font-medium text-[#FF3B3B]">(+{taskKPI.totalExtraHrs}h)</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'task' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Avg. Efficiency</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#2196F3]">
                    {taskKPI.efficiency}%
                  </span>
                </div>
              </>
            )}

            {/* Member/Employee KPI Cards - 5 columns layout */}
            {isLoadingEmployees ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={`member-kpi-skel-${i}`} className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-1 justify-center animate-pulse ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ))
            ) : (
              <>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Total Investment</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#111111]">${employeeKPI.totalInvestment.toLocaleString()}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Total Revenue</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#0F9D58]">${employeeKPI.totalRevenue.toLocaleString()}</span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Net Profit</span>
                  <span className={`text-xl font-['Manrope:Bold',sans-serif] ${employeeKPI.netProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`}>
                    ${employeeKPI.netProfit.toLocaleString()}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Avg. Rate/Hr</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#2196F3]">
                    ${employeeKPI.avgRatePerHr.toLocaleString()}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center ${activeTab === 'member' ? '' : 'hidden'}`}>
                  <span className="text-[12px] font-medium text-[#666666]">Avg. Utilization</span>
                  <span className={`text-xl font-['Manrope:Bold',sans-serif] ${employeeKPI.avgUtilization >= 70 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`}>
                    {employeeKPI.avgUtilization}%
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
                  <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[50px_2fr_1fr_1.2fr_1.5fr_100px_100px] gap-4 px-4 py-4 items-center">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-1 space-y-2">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white grid grid-cols-[50px_2fr_1fr_1.2fr_1.5fr_100px_100px] gap-4 px-4 py-3 mb-2 items-center border-b border-transparent">
                  <div className="pl-2"><TableHeader label="No" /></div>
                  <TableHeader label="Requirement" sortKey="requirement" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Contact Person" sortKey="manager" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Timeline" />
                  <TableHeader label="Hours Utilization" sortKey="efficiency" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Revenue" sortKey="revenue" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                </div>

                {/* Rows */}
                {filteredRequirements.map((row, idx) => (
                  <div
                    key={row.id}
                    className="group bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[50px_2fr_1fr_1.2fr_1.5fr_100px_100px] gap-4 px-4 py-3 items-center hover:border-[#ff3b3b]/20 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="pl-2 text-[13px] text-[#999999] font-['Inter:Medium',sans-serif]">{idx + 1}</div>

                    <div className="flex flex-col justify-center gap-0.5">
                      <span className="text-[14px] text-[#111111] font-['Manrope:Bold',sans-serif] leading-tight truncate" title={row.requirement}>{row.requirement}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[#999999] font-['Manrope:Bold',sans-serif] truncate" title={row.partner}>{row.partner}</span>
                    </div>

                    <div className="text-[13px] text-[#666666] font-['Inter:Regular',sans-serif]">{row.manager || 'Unassigned'}</div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-[#111111] font-medium">{formatWithTimezone(row.startDate, 'MMM DD')}</span>
                      <span className="text-[11px] text-[#999999]">to {formatWithTimezone(row.endDate, 'MMM DD')}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 justify-center h-full">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-[#111111]">{row.engagedHrs}h</span>
                        <span className="text-[#999999]">of {row.allottedHrs}h</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.engagedHrs > row.allottedHrs ? 'bg-[#FF3B3B]' : 'bg-[#111111]'}`}
                          style={{ width: `${Math.min((row.engagedHrs / (row.allottedHrs || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-[13px] text-[#111111] font-['Manrope:Bold',sans-serif]">${row.revenue?.toLocaleString() || 0}</div>

                    <div><StatusBadge status={row.status} /></div>
                  </div>
                ))}

                {/* Pagination moved outside */}
              </div>
            )}
          </div>

          {/* Tasks Table */}
          <div className={activeTab === 'task' ? '' : 'hidden'}>
            {isLoadingTasks ? (
              <div className="space-y-2 px-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_0.8fr_0.8fr_0.8fr_100px] gap-4 px-4 py-4 items-center">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/5" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-1 space-y-2">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_0.8fr_0.8fr_0.8fr_100px] gap-4 px-4 py-3 mb-2 items-center border-b border-transparent">
                  <div className="pl-2"><TableHeader label="No" /></div>
                  <TableHeader label="Task" sortKey="task" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Requirement" sortKey="requirement" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Leader" sortKey="leader" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Assigned" sortKey="assigned" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Allotted" sortKey="allottedHrs" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Engaged" sortKey="engagedHrs" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Extra" sortKey="extraHrs" currentSort={sortConfig} onSort={handleSort} />
                  <div className="text-center"><TableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} align="center" /></div>
                </div>

                {/* Rows */}
                {filteredTasks.map((row, idx) => (
                  <div
                    key={row.id}
                    className="group bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[50px_2fr_1.5fr_1fr_1fr_1fr_0.8fr_0.8fr_0.8fr_100px] gap-4 px-4 py-3 items-center hover:border-[#ff3b3b]/20 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="pl-2 text-[13px] text-[#999999] font-['Inter:Medium',sans-serif]">{idx + 1}</div>
                    <div className="text-[13px] text-[#111111] font-['Manrope:SemiBold',sans-serif]">{row.task}</div>
                    <div className="text-[13px] text-[#666666] font-['Inter:Regular',sans-serif]">{row.requirement}</div>
                    <div className="text-[13px] text-[#666666] font-['Inter:Regular',sans-serif]">{row.leader}</div>
                    <div className="text-[13px] text-[#666666] font-['Inter:Regular',sans-serif]">{row.assigned}</div>
                    <div className="text-[13px] text-[#666666] font-['Inter:Regular',sans-serif]">{row.allottedHrs}h</div>
                    <div className="text-[13px] text-[#111111] font-['Manrope:Bold',sans-serif]">{row.engagedHrs}h</div>
                    <div className="text-[13px] font-['Inter:Medium',sans-serif] text-[#FF3B3B]">{row.extraHrs > 0 ? `+${row.extraHrs}h` : '-'}</div>
                    <div className="flex justify-center"><StatusBadge status={row.status} /></div>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-12 text-[#999999] text-[13px]">No tasks found matching your filters.</div>
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
                  <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[50px_2fr_2fr_0.8fr_1fr_1fr_1fr] gap-4 px-4 py-4 items-center">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-1 space-y-2">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white grid grid-cols-[50px_2fr_2fr_0.8fr_1fr_1fr_1fr] gap-4 px-4 py-3 mb-2 items-center border-b border-transparent">
                  <div className="pl-2"><TableHeader label="No" /></div>
                  <TableHeader label="Member" sortKey="member" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Tasks Performance" />
                  <TableHeader label="Load" sortKey="utilization" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Investment" sortKey="investment" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Revenue" sortKey="revenue" currentSort={sortConfig} onSort={handleSort} />
                  <TableHeader label="Net Profit" sortKey="profit" currentSort={sortConfig} onSort={handleSort} />
                </div>

                {/* Rows */}
                {filteredEmployees.map((row, idx) => (
                  <div
                    key={row.id}
                    className="group bg-white border border-[#EEEEEE] rounded-[16px] grid grid-cols-[50px_2fr_2fr_0.8fr_1fr_1fr_1fr] gap-4 px-4 py-3 items-center hover:border-[#ff3b3b]/20 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedMemberId(String(row.id))}
                  >
                    <div className="pl-2 text-[13px] text-[#999999] font-['Inter:Medium',sans-serif]">{idx + 1}</div>

                    <div className="flex flex-col justify-center">
                      <span className="text-[14px] text-[#111111] font-['Manrope:Bold',sans-serif]">{row.member}</span>
                      <span className="text-[12px] text-[#666666] font-['Inter:Regular',sans-serif]">{row.designation} <span className="text-[#E5E5E5] mx-1">|</span> {row.department}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[14px] text-[#111111] font-['Manrope:Bold',sans-serif]">
                        {row.taskStats.assigned} <span className="text-[#666666] font-['Inter:Regular',sans-serif] text-[13px]">Assigned</span>
                      </span>
                      <div className="flex gap-3 mt-1 text-[11px] font-medium text-[#666666]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0F9D58]"></div>
                          <span>{row.taskStats.completed}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]"></div>
                          <span>{row.taskStats.inProgress}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B3B]"></div>
                          <span>{row.taskStats.delayed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Load / Utilization */}
                    <div className="flex flex-col gap-1.5 justify-center">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-[#111111]">{row.utilization}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.utilization > 100 ? 'bg-[#FF3B3B]' : 'bg-[#111111]'}`}
                          style={{ width: `${Math.min(row.utilization, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-[13px] text-[#111111] font-['Manrope:Bold',sans-serif]">${row.investment?.toLocaleString() || 0}</div>
                    <div className="text-[13px] text-[#111111] font-['Manrope:Bold',sans-serif]">${row.revenue?.toLocaleString() || 0}</div>
                    <div className={`text-[13px] font-['Manrope:Bold',sans-serif] ${row.profit >= 0 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`}>
                      {row.profit >= 0 ? '+' : ''}${row.profit?.toLocaleString() || 0}
                    </div>
                  </div>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="text-center py-12 text-[#999999] text-[13px]">No employees found matching your filters.</div>
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
        <ReportsPdfTemplate
          activeTab={activeTab}
          data={activeTab === 'requirement' ? filteredRequirements : activeTab === 'task' ? filteredTasks : filteredEmployees}
          kpis={activeTab === 'requirement' ? kpi : activeTab === 'task' ? taskKPI : employeeKPI}
          dateRange={dateRange}
          companyName={companyName}
          timezone={companyTimezone}
        />

        {/* Hidden Individual Employee PDF Template */}
        {selectedMember && (
          <IndividualEmployeePdfTemplate
            member={selectedMember}
            worklogs={selectedMemberWorklogs}
            dateRange={dateRange}
            companyName={companyName}
            timezone={companyTimezone}
          />
        )}


      </div>
    </PageLayout>
  );
}
