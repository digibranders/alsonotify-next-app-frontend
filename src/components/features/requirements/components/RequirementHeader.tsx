import { Breadcrumb, Skeleton, Button, App } from 'antd';
import { FileText, ListTodo, BarChart2, Columns, TrendingUp, Paperclip, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabButton } from './TabButton';
import { useState } from 'react';
import { WorkspaceMappingModal } from '@/components/modals/WorkspaceMappingModal';
import { Requirement, Workspace } from '@/types/domain';
import { ApiResponse } from '@/types/api';
import { RequirementCTAConfig, ActionConfig } from '@/lib/workflow';
import { UpdateRequirementRequestDto } from '@/types/dto/requirement.dto';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { RequirementRevisionModal } from '@/components/modals/RequirementRevisionModal';
import { RequirementRejectionModal } from '@/components/modals/RequirementRejectionModal';

export type ReqTabId = 'details' | 'tasks' | 'gantt' | 'kanban' | 'pnl' | 'documents';

interface RequirementHeaderProps {
  workspace?: Workspace | null;
  requirement: Requirement;
  requirementStatus: string;
  assignedTo: (string | { name: string })[];
  router: AppRouterInstance;
  activeTab: ReqTabId;
  setActiveTab: (tab: ReqTabId) => void;
  ctaConfig?: RequirementCTAConfig;
  myWorkspacesData?: ApiResponse<{ workspaces: Workspace[] }>;
  updateRequirement: (data: UpdateRequirementRequestDto) => Promise<any>;
  visibleTabs?: ReqTabId[];
}

export function RequirementHeader({
  workspace,
  requirement,
  requirementStatus,
  assignedTo,
  router,
  activeTab,
  setActiveTab,
  ctaConfig,
  myWorkspacesData,
  updateRequirement,
  visibleTabs = ['details', 'tasks', 'gantt', 'kanban', 'pnl', 'documents']
}: Readonly<RequirementHeaderProps>) {
  const { message } = App.useApp();
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionTitle, setRejectionTitle] = useState("Reject Requirement");

  const handleAction = async (action: ActionConfig | undefined) => {
    if (!action) return;

    // Handle modal triggers
    if (action.modal === 'mapping') {
      setIsMappingModalOpen(true);
      return;
    }

    if (action.apiAction === 'reject_quote' || action.apiAction === 'decline') {
      setRejectionTitle(action.label);
      setIsRejectionModalOpen(true);
      return;
    }

    if (action.apiAction === 'request_revision') {
      setIsRevisionModalOpen(true);
      return;
    }

    // Handle direct API actions
    if (action.apiAction) {
      // Special case: Accept Quote for Client-Work needs Mapping if workspace_id is missing
      if (action.apiAction === 'accept_quote' && !requirement.workspace_id) {
        setIsMappingModalOpen(true);
        return;
      }

      try {
        await updateRequirement({
          id: requirement.id,
          status: getNextStatus(action.apiAction),
          // Add other fields if needed for specific actions
        });
        message.success(`Action "${action.label}" completed successfully`);
      } catch (error: any) {
        message.error(error.message || `Failed to perform action: ${action.label}`);
      }
    }
  };

  const getNextStatus = (apiAction: string) => {
    switch (apiAction) {
      case 'accept_quote': return 'Assigned';
      case 'send_to_partner': return 'Waiting';
      case 'submit_review': return 'Review';
      case 'approve': return 'Completed';
      case 'start_work': return 'In_Progress';
      case 'resume': return 'In_Progress';
      case 'pause': return 'On_Hold';
      case 'reopen': return 'Assigned';
      default: return requirement.status;
    }
  };

  const handleMappingSubmit = async (selectedWorkspaceId: number) => {
    try {
      await updateRequirement({
        id: requirement.id,
        receiver_workspace_id: selectedWorkspaceId,
        status: 'Assigned' // Usually mapping moves it to Assigned
      });
      message.success("Requirement mapped successfully!");
    } catch (error: any) {
      message.error(error.message || "Failed to map requirement");
      throw error;
    }
  };

  const handleRevisionSubmit = async (feedback: string) => {
    try {
      await updateRequirement({
        id: requirement.id,
        status: 'Revision',
        description: `${requirement.description}\n\n[Revision Feedback]: ${feedback}`
      });
      message.success("Revision requested successfully");
    } catch (error: any) {
      message.error(error.message || "Failed to request revision");
      throw error;
    }
  };

  const handleRejectionSubmit = async (reason: string) => {
    try {
      await updateRequirement({
        id: requirement.id,
        status: 'Rejected',
        rejection_reason: reason
      });
      message.success("Requirement rejected successfully");
    } catch (error: any) {
      message.error(error.message || "Failed to reject requirement");
      throw error;
    }
  };

  return (
    <div className="px-6 pt-6 pb-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {workspace ? (
            <Breadcrumb
              separator={<span className="text-[20px] font-['Manrope:SemiBold',sans-serif] text-[#999999]">/</span>}
              items={[
                {
                  title: (
                    <span
                      onClick={() => router.push(`/dashboard/workspace/${workspace.id}/requirements`)}
                      className="cursor-pointer font-['Manrope:SemiBold',sans-serif] text-[20px] text-[#999999] hover:text-[#666666] transition-colors"
                    >
                      {workspace.name}
                    </span>
                  ),
                },
                {
                  title: (
                    <span className="font-['Manrope:SemiBold',sans-serif] text-[20px] text-[#111111] line-clamp-1 max-w-[300px]">
                      {requirement.title || requirement.name || 'Untitled Requirement'}
                    </span>
                  ),
                },
              ]}
            />
          ) : (
            <Skeleton.Input active size="small" style={{ width: 200 }} />
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* CTA Buttons */}
          <div className="flex items-center gap-2 mr-2">
            {ctaConfig?.secondaryAction && (
              <Button
                size="middle"
                className={`rounded-full px-5 font-['Manrope:SemiBold',sans-serif] ${ctaConfig.secondaryAction.type === 'danger' ? 'text-[#ff3b3b] border-[#ff3b3b]' : ''
                  }`}
                onClick={() => handleAction(ctaConfig.secondaryAction)}
              >
                {ctaConfig.secondaryAction.label}
              </Button>
            )}
            {ctaConfig?.primaryAction && (
              <Button
                type="primary"
                size="middle"
                className="bg-[#111111] hover:!bg-[#333333] border-none rounded-full px-6 font-['Manrope:SemiBold',sans-serif] flex items-center gap-2"
                onClick={() => handleAction(ctaConfig.primaryAction)}
              >
                {ctaConfig.primaryAction.label}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          <StatusBadge status={requirementStatus} showLabel />
          {requirement.is_high_priority && (
            <span className="px-3 py-1.5 rounded-full text-[11px] font-['Manrope:SemiBold',sans-serif] uppercase tracking-wide bg-[#FFF5F5] text-[#ff3b3b]">
              HIGH PRIORITY
            </span>
          )}
          <div className="flex -space-x-2">
            {Array.isArray(assignedTo) && assignedTo.slice(0, 3).map((person: { name: string } | string, i: number) => {
              const name = typeof person === 'string' ? person : person?.name || 'U';
              return (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center shadow-sm" title={name}>
                  <span className="text-[10px] text-white font-['Manrope:Bold',sans-serif]">
                    {name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <WorkspaceMappingModal
        open={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        onSubmit={handleMappingSubmit}
        workspaces={myWorkspacesData?.result?.workspaces || []}
      />

      <RequirementRevisionModal
        open={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        onSubmit={handleRevisionSubmit}
        requirementName={requirement.title || requirement.name || 'Untitled'}
      />

      <RequirementRejectionModal
        open={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onSubmit={handleRejectionSubmit}
        title={rejectionTitle}
      />


      {/* Tabs */}
      <div className="border-b border-[#EEEEEE]">
        <div className="flex items-center gap-8">
          {visibleTabs.includes('details') && (
            <TabButton
              active={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
              icon={FileText}
              label="Details"
            />
          )}
          {visibleTabs.includes('tasks') && (
            <TabButton
              active={activeTab === 'tasks'}
              onClick={() => setActiveTab('tasks')}
              icon={ListTodo}
              label="Tasks & Revisions"
            />
          )}
          {visibleTabs.includes('gantt') && (
            <TabButton
              active={activeTab === 'gantt'}
              onClick={() => setActiveTab('gantt')}
              icon={BarChart2}
              label="Gantt Chart"
            />
          )}
          {visibleTabs.includes('kanban') && (
            <TabButton
              active={activeTab === 'kanban'}
              onClick={() => setActiveTab('kanban')}
              icon={Columns}
              label="Kanban Board"
            />
          )}
          {visibleTabs.includes('pnl') && (
            <TabButton
              active={activeTab === 'pnl'}
              onClick={() => setActiveTab('pnl')}
              icon={TrendingUp}
              label="P&L"
            />
          )}
          {visibleTabs.includes('documents') && (
            <TabButton
              active={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
              icon={Paperclip}
              label="Documents"
            />
          )}
        </div>
      </div>
    </div>
  );
}