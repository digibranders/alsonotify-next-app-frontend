'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FolderOpen, Plus, LayoutGrid, List, MoreVertical, Edit, Trash2, RotateCcw } from 'lucide-react';
import { PaginationBar } from '../../ui/PaginationBar';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { Modal, Dropdown, MenuProps, Checkbox, App } from "antd";
import { Skeleton } from '../../ui/Skeleton';
import { WorkspaceForm } from '@/components/modals/WorkspaceForm';

import { useWorkspaces, useDeleteWorkspace, useReactivateWorkspace } from '@/hooks/useWorkspace';
import { usePartners, useCurrentUserCompany, useUserDetails } from '@/hooks/useUser';
import { useQueries } from '@tanstack/react-query';


import { getRequirementsByWorkspaceId } from '@/services/workspace';
import { WorkspaceDto } from '@/types/dto/workspace.dto';

import { Workspace, Partner } from '@/types/domain';
import { getRoleFromUser } from '@/utils/roleUtils';

export function WorkspacePage() {
  const { data: userData } = useUserDetails();
  const userRole = getRoleFromUser(userData?.result);

  const { data: partnersData } = usePartners();
  const { data: companyData } = useCurrentUserCompany();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get('tab') as 'active' | 'archived') || 'active';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<number[]>([]);

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkspaceForEdit, setSelectedWorkspaceForEdit] = useState<Workspace | null>(null);

  const [pageSize, setPageSize] = useState(12);

  const handleTabChange = (tab: 'active' | 'archived') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    setCurrentPage(1);
    router.push(`?${params.toString()}`);
  };

  // Build query string for API
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    // Pagination (Backend expects skip/limit, frontend uses page/pageSize)
    const skip = (currentPage - 1) * pageSize;
    params.append('skip', skip.toString());
    params.append('limit', pageSize.toString());

    // Status / Tab
    if (activeTab === 'active') {
      params.append('is_active', 'true');
    } else {
      params.append('is_active', 'false');
    }

    // Search
    if (searchQuery) {
      params.append('name', searchQuery);
    }

    // Filters
    if (filters.organization && filters.organization !== 'All') {
      const selectedOrgs = filters.organization.split(',');
      const selfLabel = `${companyData?.result?.name || 'Current Company'} (Self)`;
      const partnerIds: number[] = [];

      selectedOrgs.forEach(orgName => {
        const trimmedName = orgName.trim();
        if (trimmedName === selfLabel || trimmedName === 'Self') {
          params.append('in_house', 'true');
        } else {
          const partner = partnersData?.result?.find((p: { id: number; name?: string; partner_company?: { name?: string }; email?: string }) =>
            (p.name || p.partner_company?.name || p.email) === trimmedName
          );
          if (partner) {
            partnerIds.push(partner.id);
          }
        }
      });

      if (partnerIds.length > 0) {
        params.append('partner_id', partnerIds.join(','));
      }
    }


    return params.toString();
  }, [activeTab, currentPage, pageSize, searchQuery, filters, partnersData, companyData?.result?.name]);


  const { data: workspacesData, isLoading, refetch } = useWorkspaces(queryParams);

  useEffect(() => {
    refetch();
  }, [queryParams, refetch]);


  // Get all workspace IDs
  const workspaceIds = useMemo(() => {
    return workspacesData?.result?.workspaces?.map((w) => w.id) || [];
  }, [workspacesData]);

  const totalItems = (workspacesData?.result as { total_count?: number })?.total_count || 0;

  // Fetch requirements for all workspaces
  const requirementQueries = useQueries({
    queries: workspaceIds.map((id: number) => ({
      queryKey: ['requirements', id],
      queryFn: () => getRequirementsByWorkspaceId(id),
      enabled: !!id && workspaceIds.length > 0,
    })),
  });

  // Transform backend data to frontend format with requirements counts
  const workspaces = useMemo((): Workspace[] => {
    if (!workspacesData?.result?.workspaces) return [];
    return workspacesData.result.workspaces.map((w: WorkspaceDto) => {
      // Find requirements for this workspace
      const reqQuery = requirementQueries.find((q, idx) => workspaceIds[idx] === w.id);
      const requirements = reqQuery?.data?.result || [];

      // Calculate requirement counts
      const totalRequirements = requirements.length;
      let inProgressRequirements = 0;
      let delayedRequirements = 0;

      requirements.forEach((req: { status?: string }) => {
        const status = (req.status || '').toLowerCase();
        if (status.includes('completed') || status === 'done') {
          // Completed - don't count in progress or delayed
        } else if (status.includes('delayed') || status.includes('stuck') || status.includes('impediment')) {
          delayedRequirements++;
        } else {
          // In progress, assigned, etc.
          inProgressRequirements++;
        }
      });

      return {
        id: w.id,
        name: w.name,
        task_count: w.total_task || 0,
        in_progress_count: w.total_task_in_progress || 0,
        delayed_count: w.total_task_delayed || 0,
        completed_count: w.total_task_completed || 0,
        // Requirements data
        total_requirements: totalRequirements,
        in_progress_requirements: inProgressRequirements,
        delayed_requirements: delayedRequirements,
        // Use exact status from backend
        status: w.status || 'Assigned',
        is_active: w.is_active ?? true,
        description: w.description || '',
        partner_id: w.partner_id,
        in_house: w.in_house,
        partner_name: w.partner_name,
        company_name: w.company_name
      };
    });
  }, [workspacesData, requirementQueries, workspaceIds]);



  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    setSelectedWorkspaces([]);
  };

  const filterOptions: FilterOption[] = [
    {
      id: 'organization',
      label: 'Organization',
      options: ['All', `${companyData?.result?.name || 'Current Company'} (Self)`, ...((partnersData?.result as unknown as Partner[])?.map((p) => {
        const companyName = typeof p.company === 'string' ? p.company : (p as any).company?.name;
        return companyName || (p as any).partner_company?.name || p.email || p.name || 'Unknown';
      }) || [])],
      multiSelect: true,
      defaultValue: 'All'
    }
  ];

  // No client-side filtering needed anymore as it's handled by API

  const toggleSelectAllWorkspaces = () => {
    if (workspaces.length === 0) return;
    const currentIds = workspaces.map((w) => w.id);
    const allSelected = currentIds.every((id) => selectedWorkspaces.includes(id));

    if (allSelected) {
      // Deselect only the ones on this page
      setSelectedWorkspaces((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      // Add all current page ids
      setSelectedWorkspaces((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const toggleSelectWorkspaceRow = (id: number) => {
    setSelectedWorkspaces((prev) =>
      prev.includes(id) ? prev.filter((wId) => wId !== id) : [...prev, id]
    );
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    router.push(`/dashboard/workspace/${workspace.id}/requirements`);
  };

  return (
    <div className="w-full h-full bg-white rounded-[24px] border border-[#EEEEEE] p-8 flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-xl text-[#111111]">Workspace</h2>
            {userRole !== 'Employee' && (
              <button onClick={() => { setSelectedWorkspaceForEdit(null); setIsDialogOpen(true); }} className="hover:scale-110 active:scale-95 transition-transform">
                <Plus className="size-5 text-[#ff3b3b]" strokeWidth={2} />
              </button>
            )}
            <WorkspaceForm
              open={isDialogOpen}
              initialData={selectedWorkspaceForEdit || undefined}
              onCancel={() => { setIsDialogOpen(false); setSelectedWorkspaceForEdit(null); }}
              onSuccess={() => {
                setIsDialogOpen(false);
                setSelectedWorkspaceForEdit(null);
                refetch();
              }}
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-[#F7F7F7] p-1 rounded-lg border border-[#EEEEEE]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#ff3b3b] shadow-sm' : 'text-[#999999] hover:text-[#111111]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#ff3b3b] shadow-sm' : 'text-[#999999] hover:text-[#111111]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center">
          <div className="flex items-center gap-8 border-b border-[#EEEEEE]">
            <button
              onClick={() => handleTabChange('active')}
              className={`pb-3 px-1 relative font-semibold text-sm transition-colors ${activeTab === 'active'
                ? 'text-[#ff3b3b]'
                : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              Active
              {activeTab === 'active' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('archived')}
              className={`pb-3 px-1 relative font-semibold text-sm transition-colors ${activeTab === 'archived'
                ? 'text-[#ff3b3b]'
                : 'text-[#666666] hover:text-[#111111]'
                }`}
            >
              Archived
              {activeTab === 'archived' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6">
        <FilterBar
          filters={filterOptions}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          searchPlaceholder="Search workspace..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Workspace Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] p-5 h-[180px] animate-pulse flex flex-col justify-between">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-[14px]" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="border-t border-[#EEEEEE] pt-4 grid grid-cols-3 gap-4">
                    <div className="space-y-1 text-center"><Skeleton className="h-3 w-8 mx-auto" /><Skeleton className="h-4 w-4 mx-auto" /></div>
                    <div className="space-y-1 text-center"><Skeleton className="h-3 w-8 mx-auto" /><Skeleton className="h-4 w-4 mx-auto" /></div>
                    <div className="space-y-1 text-center"><Skeleton className="h-3 w-8 mx-auto" /><Skeleton className="h-4 w-4 mx-auto" /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[40px_1.5fr_1.8fr_0.8fr_0.5fr_40px] gap-4 px-4 py-3 items-center bg-white">
                <div className="flex justify-center"><Checkbox disabled className="red-checkbox" /></div>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">Workspace Name</p>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">Requirements</p>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">Organization</p>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">Status</p>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide" />
              </div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#F3F4F6] rounded-[12px] px-4 py-3 flex items-center animate-pulse">
                  <div className="grid grid-cols-[40px_1.5fr_1.8fr_0.8fr_0.5fr_40px] items-center gap-4 w-full">
                    <div className="flex justify-center"><Skeleton className="h-5 w-5 rounded" /></div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-[10px]" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="space-y-1"><Skeleton className="h-2 w-8" /><Skeleton className="h-3 w-4" /></div>
                      <div className="space-y-1"><Skeleton className="h-2 w-8" /><Skeleton className="h-3 w-4" /></div>
                      <div className="space-y-1"><Skeleton className="h-2 w-8" /><Skeleton className="h-3 w-4" /></div>
                    </div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {workspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  userRole={userRole}
                  onClick={() => handleSelectWorkspace(workspace)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* List header – aligned with rows, matches dashboard style */}
              <div className="grid grid-cols-[40px_1.5fr_1.8fr_0.8fr_0.5fr_40px] gap-4 px-4 py-3 items-center bg-white">
                <div className="flex justify-center">
                  <Checkbox
                    className="red-checkbox"
                    checked={
                      workspaces.length > 0 &&
                      workspaces.every((w) => selectedWorkspaces.includes(w.id))
                    }
                    indeterminate={
                      workspaces.some((w) => selectedWorkspaces.includes(w.id)) &&
                      !workspaces.every((w) => selectedWorkspaces.includes(w.id))
                    }
                    onChange={toggleSelectAllWorkspaces}
                  />
                </div>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">
                  Workspace Name
                </p>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">
                  Requirements
                </p>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">
                  Organization
                </p>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">
                  Status
                </p>
                <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide" />
              </div>

              {workspaces.map((workspace) => (
                <WorkspaceListItem
                  key={workspace.id}
                  workspace={workspace}
                  userRole={userRole}
                  selected={selectedWorkspaces.includes(workspace.id)}
                  onToggleSelect={() => toggleSelectWorkspaceRow(workspace.id)}
                  onClick={() => handleSelectWorkspace(workspace)}
                />
              ))}
            </div>
          )
        )}

        {!isLoading && workspaces.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-[#DDDDDD] mx-auto mb-3" />
            <p className="text-[#999999] font-normal">
              No workspaces found
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel="workspaces"
        />
      )}
    </div>
  );
}

function WorkspaceRequirementsSummary({
  total,
  inProgress,
  delayed
}: {
  total: number;
  inProgress: number;
  delayed: number;
}) {
  return (
    <div>
      <p className="text-[0.625rem] text-[#999999] font-bold uppercase tracking-wider text-center mb-3">Requirements</p>
      <div className="grid grid-cols-3 divide-x divide-[#EEEEEE]">
        <div className="flex flex-col items-center px-1">
          <span className="text-[0.625rem] text-[#999999] font-medium uppercase tracking-wider mb-0.5">Total</span>
          <span className="text-[0.8125rem] text-[#111111] font-bold">{total}</span>
        </div>
        <div className="flex flex-col items-center px-1">
          <span className="text-[0.625rem] text-[#999999] font-medium uppercase tracking-wider mb-0.5">Progress</span>
          <span className="text-[0.8125rem] text-[#0284C7] font-bold">{inProgress}</span>
        </div>
        <div className="flex flex-col items-center px-1">
          <span className="text-[0.625rem] text-[#999999] font-medium uppercase tracking-wider mb-0.5">Delayed</span>
          <span className="text-[0.8125rem] text-[#DC2626] font-bold">{delayed}</span>
        </div>
      </div>
    </div>
  );
}

function WorkspaceCard({ workspace, userRole, onClick }: { workspace: Workspace; userRole: string; onClick?: () => void }) {
  const { message } = App.useApp();
  const [modal, contextHolder] = Modal.useModal();
  const deleteMutation = useDeleteWorkspace();
  const reactivateMutation = useReactivateWorkspace();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleAction = async (key: string) => {
    if (key === 'delete') {
      const reqCount = workspace.total_requirements || 0;
      if (reqCount === 0) {
        modal.confirm({
          title: 'Delete Workspace',
          content: `You are about to delete "${workspace.name}". This action is permanent.`,
          okText: 'Delete',
          okType: 'danger',
          cancelText: 'Cancel',
          onOk: () => {
            deleteMutation.mutate(workspace.id, {
              onSuccess: () => message.success('Workspace deleted successfully'),
            });
          },
        });
      } else {
        modal.confirm({
          title: 'Cannot Delete Workspace',
          content: `This workspace has ${reqCount} requirements. You cannot delete it, but you can archive it instead.`,
          okText: 'Archive',
          cancelText: 'Cancel',
          onOk: () => {
            deleteMutation.mutate(workspace.id, {
              onSuccess: () => message.success('Workspace archived successfully'),
            });
          },
        });
      }
    } else if (key === 'restore') {
      reactivateMutation.mutate(workspace.id, {
        onSuccess: () => message.success('Workspace restored successfully'),
      });
    } else if (key === 'edit') {
      setIsEditOpen(true);
    }
  };

  const items: MenuProps['items'] = workspace.is_active
    ? [
      { key: 'edit', label: 'Edit Details', icon: <Edit className="w-4 h-4" /> },
      { key: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, danger: true }
    ]
    : [
      { key: 'edit', label: 'Edit Details', icon: <Edit className="w-4 h-4" /> },
      { key: 'restore', label: 'Restore', icon: <RotateCcw className="w-4 h-4" /> }
    ];

  return (
    <>
      {contextHolder}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className="group relative bg-white border border-[#EEEEEE] rounded-[16px] p-5 hover:border-[#ff3b3b] hover:shadow-lg hover:shadow-[#ff3b3b]/10 transition-all cursor-pointer overflow-hidden flex flex-col h-[180px]"
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff3b3b] to-[#ff6b6b] opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Action Menu - Absolute Positioned */}
        {userRole !== 'Employee' && (
          <div className="absolute top-3 right-3 z-20" onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items, onClick: ({ key }) => handleAction(key) }} trigger={['click']} placement="bottomRight">
              <button className="w-8 h-8 rounded-lg hover:bg-[#F7F7F7] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-5 h-5 text-[#666666]" />
              </button>
            </Dropdown>
          </div>
        )}

        <div className="flex flex-col h-full">
          {/* Header: Icon + Details Side-by-Side */}
          <div className="flex items-start gap-4 mb-auto pr-8">
            {/* Folder Icon */}
            <div className="shrink-0 w-12 h-12 rounded-[14px] bg-[#FEF3F2] border border-[#ff3b3b]/10 flex items-center justify-center group-hover:bg-[#ff3b3b] transition-all duration-300">
              <FolderOpen className="w-6 h-6 text-[#ff3b3b] group-hover:text-white transition-colors" />
            </div>

            {/* Text Details */}
            <div className="flex flex-col pt-0.5 min-w-0">
              <h3 className="font-bold text-base text-[#111111] leading-snug mb-0.5 truncate w-full">
                {workspace.name}
              </h3>
              <p className="text-[0.8125rem] text-[#666666] font-medium truncate">
                {workspace.in_house ? workspace.company_name : workspace.partner_name || 'Organization'}
              </p>
            </div>
          </div>

          {/* Footer: Stats */}
          <div className="border-t border-[#EEEEEE] pt-4 mt-auto">
            <WorkspaceRequirementsSummary
              total={workspace.total_requirements || 0}
              inProgress={workspace.in_progress_requirements || 0}
              delayed={workspace.delayed_requirements || 0}
            />
          </div>
        </div>
      </div>
      <WorkspaceForm
        open={isEditOpen}
        initialData={workspace}
        onCancel={() => setIsEditOpen(false)}
        onSuccess={() => setIsEditOpen(false)}
      />
    </>
  );
}

function WorkspaceListItem({
  workspace,
  userRole,
  selected,
  onToggleSelect,
  onClick,
}: {
  workspace: Workspace;
  userRole: string;
  selected: boolean;
  onToggleSelect: () => void;
  onClick?: () => void;
}) {
  const deleteMutation = useDeleteWorkspace();
  const reactivateMutation = useReactivateWorkspace();
  const { message } = App.useApp();
  const [modal, contextHolder] = Modal.useModal();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleAction = async (key: string) => {
    if (key === 'delete') {
      const reqCount = workspace.total_requirements || 0;
      if (reqCount === 0) {
        modal.confirm({
          title: 'Delete Workspace',
          content: `You are about to delete "${workspace.name}". This action is permanent.`,
          okText: 'Delete',
          okType: 'danger',
          cancelText: 'Cancel',
          onOk: () => {
            deleteMutation.mutate(workspace.id, {
              onSuccess: () => message.success('Workspace deleted successfully'),
            });
          },
        });
      } else {
        modal.confirm({
          title: 'Cannot Delete Workspace',
          content: `This workspace has ${reqCount} requirements. You cannot delete it, but you can archive it instead.`,
          okText: 'Archive',
          cancelText: 'Cancel',
          onOk: () => {
            deleteMutation.mutate(workspace.id, {
              onSuccess: () => message.success('Workspace archived successfully'),
            });
          },
        });
      }
    } else if (key === 'restore') {
      reactivateMutation.mutate(workspace.id, {
        onSuccess: () => message.success('Workspace restored successfully'),
      });
    } else if (key === 'edit') {
      setIsEditOpen(true);
    }
  };

  const items: MenuProps['items'] = workspace.is_active
    ? [
      { key: 'edit', label: 'Edit Details', icon: <Edit className="w-4 h-4" /> },
      { key: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, danger: true }
    ]
    : [
      { key: 'edit', label: 'Edit Details', icon: <Edit className="w-4 h-4" /> },
      { key: 'restore', label: 'Restore', icon: <RotateCcw className="w-4 h-4" /> }
    ];



  return (
    <>
      {contextHolder}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className="group bg-white border border-[#F3F4F6] rounded-[12px] px-4 py-3 hover:border-[#ff3b3b] hover:shadow-md transition-all cursor-pointer"
      >
        <div className="grid grid-cols-[40px_1.5fr_1.8fr_0.8fr_0.5fr_40px] items-center gap-4">
          {/* Checkbox */}
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              className="red-checkbox"
              checked={selected}
              onChange={onToggleSelect}
            />
          </div>

          {/* Workspace name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#FEF3F2] border border-[#ff3b3b]/20 flex items-center justify-center shrink-0 group-hover:bg-[#ff3b3b] transition-colors">
              <FolderOpen className="w-5 h-5 text-[#ff3b3b] group-hover:text-white transition-colors" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm text-[#111111] line-clamp-1">
                {workspace.name}
              </h3>
            </div>
          </div>

          {/* Requirements Stats */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[0.6875rem] text-[#999999] font-normal mb-0.5">
                Total
              </span>
              <span className="text-[0.8125rem] font-bold text-[#111111]">
                {workspace.total_requirements || 0}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.6875rem] text-[#999999] font-normal mb-0.5">
                Progress
              </span>
              <span className="text-[0.8125rem] font-bold text-[#2F80ED]">
                {workspace.in_progress_requirements || 0}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.6875rem] text-[#999999] font-normal mb-0.5">
                Delayed
              </span>
              <span className="text-[0.8125rem] font-bold text-[#ff3b3b]">
                {workspace.delayed_requirements || 0}
              </span>
            </div>
          </div>

          {/* Organization */}
          <div className="flex items-center">
            <p className="text-[0.8125rem] text-[#666666] font-medium truncate">
              {workspace.in_house ? workspace.company_name : workspace.partner_name || 'Organization'}
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${workspace.is_active
                ? 'bg-[#ECFDF3] text-[#16A34A]'
                : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}
            >
              {(workspace.status || 'Assigned').replace(/_/g, ' ')}
            </span>
          </div>

          {/* Action */}
          <div className="flex justify-end">
            {userRole !== 'Employee' && (
              <Dropdown menu={{ items, onClick: ({ key }) => handleAction(key) }} trigger={['click']} placement="bottomRight">
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg hover:bg-[#F7F7F7] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-5 h-5 text-[#666666]" />
                </button>
              </Dropdown>
            )}
          </div>
        </div>
        <WorkspaceForm
          open={isEditOpen}
          initialData={workspace}
          onCancel={() => setIsEditOpen(false)}
          onSuccess={() => setIsEditOpen(false)}
        />

      </div>
    </>
  );
}