'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Breadcrumb, Checkbox } from 'antd';
import { TabBar } from '../../layout/TabBar';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { useWorkspace, useRequirements } from '@/hooks/useWorkspace';
import { useUserDetails } from '@/hooks/useUser';
import { getRoleFromUser } from '@/utils/roleUtils';
import { format } from 'date-fns';
import { RequirementRow } from './rows/RequirementRow';

export function WorkspaceRequirementsPage() {
  const params = useParams();
  const workspaceId = Number(params.workspaceId);
  const router = useRouter();

  const { data: workspaceData, isLoading: isLoadingWorkspace } = useWorkspace(workspaceId);
  const { data: requirementsData, isLoading: isLoadingRequirements } = useRequirements(workspaceId);
  const { data: userData } = useUserDetails();
  const userRole = getRoleFromUser(userData?.result);

  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed' | 'delayed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    priority: 'All',
    partner: 'All',
  });
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Map backend status to UI buckets
  const mapRequirementStatus = (status: string): 'in-progress' | 'completed' | 'delayed' => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('completed') || statusLower === 'done') return 'completed';
    if (
      statusLower.includes('delayed') ||
      statusLower.includes('stuck') ||
      statusLower.includes('impediment')
    ) {
      return 'delayed';
    }
    return 'in-progress';
  };

  const workspace = useMemo(() => {
    if (!workspaceData?.result) return null;
    return {
      id: workspaceData.result.id,
      name: workspaceData.result.name || '',
      client:
        workspaceData.result.client_user?.name ||
        workspaceData.result.client_company_name ||
        'N/A',
    };
  }, [workspaceData]);

  const requirements = useMemo(() => {
    if (!requirementsData?.result) return [];

    return requirementsData.result.map((req: any) => {
      const assigned: string[] = [];
      if (req.manager?.name) assigned.push(req.manager.name);
      if (req.leader?.name && !assigned.includes(req.leader.name)) assigned.push(req.leader.name);

      const start = req.start_date ? new Date(req.start_date) : null;
      const end = req.end_date ? new Date(req.end_date) : null;

      let timeline = 'No date';
      if (start && end) {
        timeline = `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
      } else if (start) {
        timeline = `From ${format(start, 'MMM d')}`;
      } else if (end) {
        timeline = `Until ${format(end, 'MMM d')}`;
      }

      const progress = req.progress || 0;
      const totalTasks = req.total_tasks || 0;
      const completedTasks = totalTasks ? Math.floor((totalTasks * progress) / 100) : 0;

      const status = mapRequirementStatus(req.status || '');
      const priority = (req.priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium';
      const department = req.department?.name || null;
      const client =
        req.project?.client?.name || req.client_company_name || workspace?.client || 'In-House';

      // Use real budget/estimate data from backend when available instead of mock values
      const rawBudget = req.estimated_cost ?? req.budget ?? null;
      const budgetValue =
        rawBudget !== null && rawBudget !== undefined ? Number(rawBudget) || 0 : 0;
      const budgetFormatted =
        rawBudget !== null && rawBudget !== undefined
          ? `$${budgetValue.toLocaleString('en-US')}`
          : 'N/A';

      return {
        id: req.id,
        title: req.name || req.title || '',
        description: req.description || '',
        assignedTo: assigned,
        // for sorting
        startDateValue: start ? start.getTime() : 0,
        // displayed
        timeline,
        progress,
        tasksCompleted: completedTasks,
        tasksTotal: totalTasks,
        status,
        priority,
        department,
        client,
        budgetFormatted,
        budgetValue,

        partner_name: req.sender_company?.name || req.receiver_company?.name || null,
      };
    });
  }, [requirementsData, workspace]);

  type RequirementRow = typeof requirements[0];

  const statusCounts = useMemo(
    () => ({
      all: requirements.length,
      inProgress: requirements.filter((r) => r.status === 'in-progress').length,
      completed: requirements.filter((r) => r.status === 'completed').length,
      delayed: requirements.filter((r) => r.status === 'delayed').length,
    }),
    [requirements],
  );

  const filteredAndSortedRequirements = useMemo(() => {
    let filtered = requirements.filter((req) => {
      const matchesTab = activeTab === 'all' || req.status === activeTab;
      const matchesSearch =
        searchQuery === '' ||
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority =
        filters.priority === 'All' ||
        filters.priority.toLowerCase() === req.priority.toLowerCase();

      const matchesPartner =
        filters.partner === 'All' ||
        filters.partner.split(',').map(p => p.trim()).includes(req.partner_name);

      return matchesTab && matchesSearch && matchesPriority && matchesPartner;
    });

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortColumn) {
          case 'timeline':
            aVal = a.startDateValue;
            bVal = b.startDateValue;
            break;
          case 'budget':
            aVal = a.budgetValue;
            bVal = b.budgetValue;
            break;
          case 'progress':
            aVal = a.progress || 0;
            bVal = b.progress || 0;
            break;
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          default: {
            const key = sortColumn as keyof RequirementRow;
            aVal = a[key];
            bVal = b[key];
          }
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [requirements, activeTab, searchQuery, filters, sortColumn, sortDirection]);

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



  const allPartners = useMemo(() => {
    const partners = Array.from(new Set(requirements.map(r => r.partner_name).filter(Boolean)));
    return ['All', ...partners];
  }, [requirements]);

  const filterOptions: FilterOption[] = [
    {
      id: 'priority',
      label: 'Priority',
      options: ['All', 'High', 'Normal'],
      placeholder: 'Priority',
      defaultValue: 'All'
    },
    {
      id: 'partner',
      label: 'Partner',
      options: allPartners,
      placeholder: 'Partner',
      multiSelect: true,
      defaultValue: 'All'
    },
  ];

  if (isLoadingWorkspace || isLoadingRequirements) {
    return <div className="p-8">Loading requirements...</div>;
  }

  if (!workspace) {
    return <div className="p-8">Workspace not found</div>;
  }

  return (
    <div className="w-full h-full bg-white rounded-[24px] border border-[#EEEEEE] p-8 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb
            separator={
              <span className="text-xl font-semibold text-[#999999]">/
              </span>
            }
            items={[
              {
                title: (
                  <span
                    className="cursor-pointer font-semibold text-xl text-[#999999] hover:text-[#666666] transition-colors"
                    onClick={() => router.push('/dashboard/workspace')}
                  >
                    Workspaces
                  </span>
                ),
              },
              {
                title: (
                  <span className="font-semibold text-xl text-[#111111]">
                    {workspace.name}
                  </span>
                ),
              },
            ]}
          />
        </div>

        <div className="mb-2 -mt-2">
          <TabBar
            tabs={[
              { id: 'all', label: 'All Requirements', count: statusCounts.all },
              { id: 'in-progress', label: 'In Progress', count: statusCounts.inProgress },
              { id: 'completed', label: 'Completed', count: statusCounts.completed },
              { id: 'delayed', label: 'Delayed', count: statusCounts.delayed },
            ]}
            activeTab={activeTab}
            onTabChange={(tabId: string) =>
              setActiveTab(tabId as 'all' | 'in-progress' | 'completed' | 'delayed')
            }
          />
        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-6">
        <FilterBar
          filters={filterOptions}
          selectedFilters={filters}
          onFilterChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
          onClearFilters={() => setFilters({ priority: 'All', partner: 'All' })}
          searchPlaceholder="Search requirements..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showClearButton
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {/* Header row */}
        <div className="sticky top-0 z-10 bg-white grid grid-cols-[40px_2.6fr_1.6fr_1.2fr_1.4fr_1.4fr_0.7fr_0.3fr] gap-4 px-4 py-3 mb-2 items-center">
          <div className="flex justify-center">
            <Checkbox />
          </div>
          <button
            onClick={() => handleSort('title')}
            className="text-left text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide hover:text-[#111111] transition-colors flex items-center"
          >
            Requirement {getSortIcon('title')}
          </button>
          <button
            onClick={() => handleSort('timeline')}
            className="text-left text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide hover:text-[#111111] transition-colors flex items-center justify-start"
          >
            Timeline {getSortIcon('timeline')}
          </button>
          <button
            onClick={() => handleSort('budget')}
            className="text-left text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide hover:text-[#111111] transition-colors flex items-center justify-start"
          >
            Budget {getSortIcon('budget')}
          </button>
          <div className="text-center text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">
            Team
          </div>
          <button
            onClick={() => handleSort('progress')}
            className="text-center text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide hover:text-[#111111] transition-colors flex items-center justify-center"
          >
            Progress {getSortIcon('progress')}
          </button>
          <button
            onClick={() => handleSort('status')}
            className="text-center text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide hover:text-[#111111] transition-colors flex items-center justify-center"
          >
            Status {getSortIcon('status')}
          </button>
          <div />
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {filteredAndSortedRequirements.length === 0 ? (
            <div className="text-center py-12 text-[#999999] text-[0.8125rem]">No requirements found</div>
          ) : (
            filteredAndSortedRequirements.map((req: any) => (
              <RequirementRow key={req.id} req={req} workspaceId={workspaceId} userRole={userRole} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
