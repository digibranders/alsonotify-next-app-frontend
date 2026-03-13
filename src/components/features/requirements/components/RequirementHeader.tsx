import { Breadcrumb, Skeleton, Button, App, Tooltip } from 'antd';
import { FileText, ListTodo, BarChart2, Columns, TrendingUp, Paperclip, ChevronRight, DollarSign } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabButton } from './TabButton';
import { useState, useCallback } from 'react';
import { WorkspaceMappingModal } from '@/components/modals/WorkspaceMappingModal';
import { Requirement, Workspace } from '@/types/domain';
import { ApiResponse } from '@/types/api';
import { RequirementCTAConfig, ActionConfig } from '@/lib/workflow';
import { UpdateRequirementRequestDto } from '@/types/dto/requirement.dto';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { RequirementRevisionModal } from '@/components/modals/RequirementRevisionModal';
import { RequirementRejectionModal } from '@/components/modals/RequirementRejectionModal';
import { SubmitForApprovalModal } from '@/components/modals/SubmitForApprovalModal';
import { RequirementApprovalModal } from '@/components/modals/RequirementApprovalModal';
import { useSubmitForReview, useApproveRequirement } from '@/hooks/useWorkspace';

export type ReqTabId = 'details' | 'tasks' | 'gantt' | 'kanban' | 'pnl' | 'documents' | 'billing';

interface RequirementHeaderProps {
  workspace?: Workspace | null;
  requirement: Requirement;
  requirementStatus: string;
  assignedTo: (string | { name: string })[];
  router: AppRouterInstance;
  activeTab: ReqTabId;
  setActiveTab: (tab: ReqTabId) => void;
  ctaConfig?: RequirementCTAConfig;
  workspacesData?: ApiResponse<{ workspaces: Workspace[] }>;
  updateRequirement: (data: UpdateRequirementRequestDto) => Promise<unknown>;
  visibleTabs?: ReqTabId[];
  allTasksCompleted?: boolean;
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
  workspacesData,
  updateRequirement,
  visibleTabs = ['details', 'tasks', 'gantt', 'kanban', 'pnl', 'documents'],
  allTasksCompleted = false,
}: Readonly<RequirementHeaderProps>) {
  const { message } = App.useApp();
  const submitForReviewMutation = useSubmitForReview();
  const approveRequirementMutation = useApproveRequirement();

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isSubmitForApprovalOpen, setIsSubmitForApprovalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [rejectionTitle, setRejectionTitle] = useState("Reject Requirement");

  const getNextStatus = useCallback((apiAction: string) => {
    switch (apiAction) {
      case 'accept_quote': return 'Assigned';
      case 'send_to_partner': return 'Waiting';
      case 'start_work': return 'In_Progress';
      case 'resume': return 'In_Progress';
      case 'pause': return 'On_Hold';
      case 'reopen': return 'Assigned';
      case 'resubmit': return 'Review';
      case 'pull_back': return 'In_Progress';
      case 'retract': return 'Waiting';
      case 'restart': return 'Assigned';
      case 'submit_for_work': return 'Assigned';
      case 'client_accept': return 'Assigned';
      default: return requirement.status;
    }
  }, [requirement.status]);

  const handleAction = useCallback(async (action: ActionConfig | undefined) => {
    if (!action) return;

    // Handle modal triggers
    if (action.modal === 'mapping' || action.modal === 'client_accept') {
      setIsMappingModalOpen(true);
      return;
    }

    if (action.modal === 'submit_approval') {
      setIsSubmitForApprovalOpen(true);
      return;
    }

    if (action.modal === 'approval') {
      setIsApprovalModalOpen(true);
      return;
    }

    if (action.modal === 'revision') {
      setIsRevisionModalOpen(true);
      return;
    }

    if (action.modal === 'reject' || action.apiAction === 'reject_quote' || action.apiAction === 'decline') {
      setRejectionTitle(action.label);
      setIsRejectionModalOpen(true);
      return;
    }

    // Handle navigation actions (no API call needed)
    if (action.apiAction === 'create_invoice') {
      const clientId = requirement.sender_company_id ?? requirement.receiver_company_id;
      router.push(`/dashboard/finance/create?clientId=${clientId ?? ''}&reqIds=${requirement.id}`);
      return;
    }

    if (action.apiAction === 'view_billing') {
      setActiveTab('billing');
      return;
    }

    // Handle direct API actions
    if (action.apiAction) {
      if (action.apiAction === 'accept_quote' && !requirement.workspace_id) {
        setIsMappingModalOpen(true);
        return;
      }

      try {
        await updateRequirement({
          id: requirement.id,
          status: getNextStatus(action.apiAction),
        });
        message.success(`Action "${action.label}" completed successfully`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to perform action";
        message.error(errorMessage || `Failed to perform action: ${action.label}`);
      }
    }
  }, [requirement, updateRequirement, message, getNextStatus, router, setActiveTab]);



  const handleMappingSubmit = useCallback(async (selectedWorkspaceId: number) => {
    try {
      const isClientWork = requirement.type === 'client';
      await updateRequirement({
        id: requirement.id,
        ...(isClientWork
          ? { workspace_id: selectedWorkspaceId }
          : { receiver_workspace_id: selectedWorkspaceId }),
        status: 'Assigned',
      });
      message.success("Requirement mapped successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to map requirement";
      message.error(errorMessage || "Failed to map requirement");
      throw error;
    }
  }, [requirement.id, updateRequirement, message]);

  const handleSubmitForApproval = useCallback(async (data: { remark?: string; attachment_ids?: number[] }) => {
    await submitForReviewMutation.mutateAsync({
      requirementId: requirement.id,
      body: data,
    });
    message.success("Requirement submitted for approval successfully!");
  }, [requirement.id, submitForReviewMutation, message]);

  const handleApproval = useCallback(async (data: { rating?: number; remark?: string }) => {
    try {
      await approveRequirementMutation.mutateAsync({
        requirement_id: requirement.id,
        status: 'Completed',
        approval_rating: data.rating ?? null,
        approval_remark: data.remark ?? null,
      });
      message.success("Requirement approved successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to approve requirement";
      message.error(errorMessage || "Failed to approve requirement");
      throw error;
    }
  }, [requirement.id, approveRequirementMutation, message]);

  const handleRevisionSubmit = useCallback(async (data: { feedback?: string; attachment_ids?: number[] }) => {
    try {
      await approveRequirementMutation.mutateAsync({
        requirement_id: requirement.id,
        status: 'Revision',
        revision_remark: data.feedback ?? null,
        revision_attachment_ids: data.attachment_ids,
      });
      message.success("Revision requested successfully");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to request revision";
      message.error(errorMessage || "Failed to request revision");
      throw error;
    }
  }, [requirement.id, approveRequirementMutation, message]);

  const handleRejectionSubmit = useCallback(async (reason: string) => {
    try {
      await updateRequirement({
        id: requirement.id,
        status: 'Rejected',
        rejection_reason: reason
      });
      message.success("Requirement rejected successfully");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reject requirement";
      message.error(errorMessage || "Failed to reject requirement");
      throw error;
    }
  }, [requirement.id, updateRequirement, message]);

  // Determine if Submit for Approval button should be disabled
  const isSubmitApprovalAction = ctaConfig?.primaryAction?.modal === 'submit_approval';
  const submitApprovalDisabled = isSubmitApprovalAction && !allTasksCompleted;

  return (
    <div className="px-6 pt-6 pb-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {workspace ? (
            <Breadcrumb
              separator={<span className="text-xl font-semibold text-[#999999]">/</span>}
              items={[
                {
                  title: (
                    <span
                      onClick={() => router.push(`/dashboard/workspace/${workspace.id}/requirements`)}
                      className="cursor-pointer font-semibold text-xl text-[#999999] hover:text-[#666666] transition-colors"
                    >
                      {workspace.name}
                    </span>
                  ),
                },
                {
                  title: (
                    <span className="font-semibold text-xl text-[#111111] line-clamp-1 max-w-[300px]">
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
                className={`rounded-full px-5 font-semibold ${ctaConfig.secondaryAction.type === 'danger' ? 'text-[#ff3b3b] border-[#ff3b3b]' : ''
                  }`}
                onClick={() => handleAction(ctaConfig.secondaryAction)}
              >
                {ctaConfig.secondaryAction.label}
              </Button>
            )}
            {ctaConfig?.primaryAction && (
              <Tooltip
                title={submitApprovalDisabled ? 'Complete all tasks first' : undefined}
                placement="bottom"
              >
                <Button
                  type="primary"
                  size="middle"
                  disabled={submitApprovalDisabled}
                  className="bg-[#111111] hover:!bg-[#333333] border-none rounded-full px-6 font-semibold flex items-center gap-2 disabled:opacity-50"
                  onClick={() => handleAction(ctaConfig.primaryAction)}
                >
                  {ctaConfig.primaryAction.label}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Tooltip>
            )}
          </div>

          <StatusBadge status={requirementStatus} showLabel />
          {requirement.is_high_priority && (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-[#FFF5F5] text-[#ff3b3b]">
              HIGH PRIORITY
            </span>
          )}
          <div className="flex -space-x-2">
            {Array.isArray(assignedTo) && assignedTo.slice(0, 3).map((person: { name: string } | string, i: number) => {
              const name = typeof person === 'string' ? person : person?.name || 'U';
              return (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center shadow-sm" title={name}>
                  <span className="text-2xs text-white font-bold">
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
        workspaces={workspacesData?.result?.workspaces || []}
      />

      <RequirementRevisionModal
        open={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        onSubmit={handleRevisionSubmit}
        requirementName={requirement.title || requirement.name || 'Untitled'}
        requirementId={requirement.id}
      />

      <RequirementRejectionModal
        open={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onSubmit={handleRejectionSubmit}
        title={rejectionTitle}
      />

      <SubmitForApprovalModal
        open={isSubmitForApprovalOpen}
        onClose={() => setIsSubmitForApprovalOpen(false)}
        onSubmit={handleSubmitForApproval}
        requirement={requirement}
      />

      <RequirementApprovalModal
        open={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onSubmit={handleApproval}
        requirement={requirement}
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
          {visibleTabs.includes('billing') && (
            <TabButton
              active={activeTab === 'billing'}
              onClick={() => setActiveTab('billing')}
              icon={DollarSign}
              label="Billing"
            />
          )}
        </div>
      </div>
    </div>
  );
}