import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import {
  ListTodo,
  Plus, RotateCcw,
} from 'lucide-react';
import { Checkbox, Button, App, Input, Modal } from 'antd';
import { Skeleton } from '../../ui/Skeleton';
import { useWorkspace, useRequirements, useUpdateRequirement, useWorkspaces } from '@/hooks/useWorkspace';
import { useTasks, useRequestRevision, useCreateTask, useUpdateTask, useUpdateTaskStatus } from '@/hooks/useTask';
import { TaskForm } from '../../modals/TaskForm';
import { CreateTaskRequestDto, UpdateTaskRequestDto } from '@/types/dto/task.dto';
import { getErrorMessage } from '@/types/api-utils';
import { useEmployees, useEmployeesDropdown, usePartners, useCurrentUserCompany } from '@/hooks/useUser';
import { useRequirementActivities } from '@/hooks/useRequirementActivity';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useAutoDelayOverdue } from '@/hooks/useAutoDelayOverdue';
import { getTodayForApi } from '@/utils/date/date';
import { TaskRow } from '@/components/features/tasks/rows/TaskRow';
import { Requirement, Task } from '@/types/domain';
import {
  getRequirementCTAConfig,
  type RequirementStatus,
  type UserRole,
} from '@/lib/workflow';
import {
  mapRequirementToStatus,
  mapRequirementToContext,
  mapRequirementToType,
} from './utils/requirementState.utils';
import { getRoleFromUser } from '@/utils/roleUtils';
import { ReqTabId, RequirementHeader } from './components/RequirementHeader';
// Extracted components
import { GanttChartTab, PnLTab, DocumentsTab, KanbanBoardTab } from './components';
import { BillingTab } from './components/BillingTab';
import { RequirementInfoCard } from './components/RequirementInfoCard';
import { ActivitySidebar } from './components/ActivitySidebar';
import { SubTaskRow } from './components/SubTaskRow';



export function RequirementDetailsPage() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const workspaceId = Number(params.workspaceId);
  const reqId = Number(params.reqId);

  const { data: workspaceData, isLoading: isLoadingWorkspace } = useWorkspace(workspaceId);
  const { data: requirementsData, isLoading: isLoadingRequirements } = useRequirements(workspaceId);
  const { data: tasksData } = useTasks(`workspace_id=${workspaceId}`);
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const updateTaskStatusMutation = useUpdateTaskStatus();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);


  const { data: employeesData } = useEmployees();
  const { data: employeesDropdownData } = useEmployeesDropdown();
  const { data: companyData } = useCurrentUserCompany();
  const { user } = useAuth();

  const timezone = useMemo(() => companyData?.result?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata', [companyData]);



  // Use standardized tab sync hook for consistent URL handling
  type ReqDetailsTab = 'details' | 'tasks' | 'gantt' | 'kanban' | 'pnl' | 'documents' | 'billing';
  const [activeTab, setActiveTab] = useTabSync<ReqDetailsTab>({
    defaultTab: 'details',
    validTabs: ['details', 'tasks', 'gantt', 'kanban', 'pnl', 'documents', 'billing']
  });
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const { mutateAsync: updateRequirement } = useUpdateRequirement();
  const { data: workspacesData } = useWorkspaces('limit=1000');
  const { data: partnersData } = usePartners();
  const { mutate: requestRevision } = useRequestRevision();

  const { data: activityResponse } = useRequirementActivities(reqId);
  const documentsActivityData = useMemo(() => {
    if (!activityResponse?.result) return [];
    return (activityResponse.result).map((act) => ({
      id: act.id,
      type: act.type,
      user: act.user?.name || 'Unknown',
      avatar: '',
      date: format(new Date(act.created_at), 'MMM d, h:mm a'),
      message: act.message,
      isSystem: false,
      attachments: act.attachments || [], // Pass full attachment objects
    }));
  }, [activityResponse]);

  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [targetTaskId, setTargetTaskId] = useState<number | null>(null);

  const workspace = useMemo(() => {
    if (!workspaceData?.result) return null;
    return workspaceData.result;
  }, [workspaceData]);

  const requirement = useMemo((): Requirement | undefined => {
    if (!requirementsData?.result) return undefined;
    return requirementsData.result.find((r: Requirement) => r.id === reqId);
  }, [requirementsData, reqId]);

  // Auto-delay overdue requirements (active status + past due date → Delayed)
  const overdueCheckData = useMemo(
    () => requirement ? [{ id: requirement.id, status: requirement.rawStatus || requirement.status || '', end_date: requirement.end_date }] : [],
    [requirement]
  );
  useAutoDelayOverdue(overdueCheckData);

  const mapRequirementStatus = (status: string): 'in-progress' | 'completed' | 'delayed' => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('completed') || statusLower === 'done') return 'completed';
    if (statusLower.includes('delayed')) return 'delayed';
    return 'in-progress';
  };

  const tasks = useMemo((): Task[] => {
    if (!tasksData?.result || !requirement) return [];
    return tasksData.result.filter((t: Task) => Number(t.requirement_id) === reqId && (!t.type || t.type === 'task'));
  }, [tasksData, requirement, reqId]);

  const revisions = useMemo(() => {
    if (!tasksData?.result || !requirement) return [];
    return tasksData.result.filter((t: Task) => Number(t.requirement_id) === reqId && t.type === 'revision');
  }, [tasksData, requirement, reqId]);

  const allTasksCompleted = useMemo(() => {
    // If no tasks exist, allow submission (tasks are optional)
    if (tasks.length === 0) return true;
    return tasks.every((t: Task) => t.status === 'Completed');
  }, [tasks]);

  const myCompanyId = companyData?.result?.id;

  const ctaConfig = useMemo(() => {
    if (!requirement) {
      return {
        isPending: false,
        displayStatus: '',
        primaryAction: undefined,
        secondaryAction: undefined,
        tab: 'draft' as const,
      };
    }

    const status = mapRequirementToStatus(requirement);
    const type = mapRequirementToType(requirement);

    const senderCompId = requirement.sender_company_id ? Number(requirement.sender_company_id) : null;
    const receiverCompId = requirement.receiver_company_id ? Number(requirement.receiver_company_id) : null;
    let role: UserRole;
    if (myCompanyId && senderCompId === myCompanyId) role = 'sender';
    else if (myCompanyId && receiverCompId === myCompanyId) role = 'receiver';
    else role = 'internal';

    const context = mapRequirementToContext(requirement, user?.id, role);

    if (status === 'draft') {
      return {
        isPending: false,
        displayStatus: 'Draft',
        primaryAction: undefined,
        secondaryAction: undefined,
        tab: 'draft' as const,
      };
    }

    return getRequirementCTAConfig(status as RequirementStatus, role, context, type);
  }, [requirement, user?.id, myCompanyId]);

  const displayStatus = ctaConfig.displayStatus;

  const isReceiver = useMemo(() => !!myCompanyId && requirement?.receiver_company_id === myCompanyId, [myCompanyId, requirement]);
  const isInHouse = useMemo(() => !requirement?.receiver_company_id || requirement?.receiver_company_id === requirement?.sender_company_id, [requirement]);

  // Supervisory roles always see all tabs regardless of company receiver logic
  const userRole = getRoleFromUser(user);
  const hasSupervisoryFullAccess = ['Admin', 'Head', 'Coordinator'].includes(userRole);

  const visibleTabs: ReqTabId[] = useMemo(() => {
    const tabs: ReqTabId[] = ['details', 'tasks', 'gantt', 'kanban', 'pnl', 'documents'];
    const canSeeBilling = ['Admin', 'Head', 'Accountant'].includes(userRole);
    // Hide billing tab for in-house requirements even for privileged roles
    if (canSeeBilling && !isInHouse) {
      tabs.push('billing');
    }

    if (hasSupervisoryFullAccess || canSeeBilling || isReceiver || isInHouse) {
      return tabs;
    }
    return ['details', 'documents'];
  }, [isReceiver, isInHouse, hasSupervisoryFullAccess, userRole]);

  // If active tab is not visible, switch to 'details' - moved to useEffect for safety
  useEffect(() => {
    if (visibleTabs && !visibleTabs.includes(activeTab)) {
      setActiveTab('details');
    }
  }, [visibleTabs, activeTab, setActiveTab]);

  if (isLoadingWorkspace || isLoadingRequirements) {
    return (
      <div className="w-full h-full bg-white rounded-[24px] border border-[#EEEEEE] flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header Section */}
          <div className="p-8 pb-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-24 rounded" />
              <span className="text-[#CCCCCC]">/</span>
              <Skeleton className="h-4 w-48 rounded" />
            </div>

            {/* Title Row with Status & Priority */}
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-7 w-80 rounded" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="w-8 h-8 rounded-full border-2 border-white" />
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-[#EEEEEE]">
              <div className="flex items-center gap-1">
                {['Details', 'Tasks & Revisions', 'Gantt Chart', 'Kanban Board', 'P&L', 'Documents'].map((tab, i) => (
                  <div key={i} className="px-4 py-3">
                    <Skeleton className={`h-4 rounded ${i === 0 ? 'w-16 bg-[#ff3b3b]/20' : i < 3 ? 'w-28' : 'w-24'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]">
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Description Card */}
              <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-5 w-28 rounded" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              </div>

              {/* Requirement Details Card */}
              <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-5 w-44 rounded" />
                </div>

                {/* Details Grid - 4 columns, 3 rows */}
                <div className="grid grid-cols-4 gap-x-8 gap-y-6">
                  {[
                    { label: 'TYPE', value: 'w-24' },
                    { label: 'PRICING MODEL', value: 'w-36' },
                    { label: 'PARTNER / COMPANY', value: 'w-28' },
                    { label: 'REQUIREMENT BUDGET', value: 'w-20' },
                    { label: 'START DATE', value: 'w-20' },
                    { label: 'DUE DATE', value: 'w-20' },
                    { label: 'CONTACT PERSON', value: 'w-28' },
                    { label: 'QUOTED PRICE', value: 'w-16' },
                    { label: 'TOTAL TASKS', value: 'w-8' },
                    { label: 'PRIORITY', value: 'w-24' },
                    { label: '', value: '' },
                    { label: '', value: '' },
                  ].map((item, i) => (
                    <div key={i}>
                      {item.label && (
                        <>
                          <Skeleton className="h-3 w-24 mb-2 rounded" />
                          <Skeleton className={`h-4 ${item.value} rounded`} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Chat Panel Skeleton */}
        <div className="w-[350px] border-l border-[#EEEEEE] flex flex-col bg-white">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-[#EEEEEE]">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-5 w-32 rounded" />
            </div>
            <Skeleton className="h-3 w-48 rounded mt-2" />
          </div>

          {/* Activity Feed Skeleton */}
          <div className="flex-1 p-6 space-y-6 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <Skeleton className={`h-16 w-full rounded-xl ${i % 2 === 0 ? 'bg-gray-100' : ''}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Message Input Skeleton */}
          <div className="p-4 border-t border-[#EEEEEE]">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!workspace || !requirement) {
    return <div className="p-8">Requirement or Workspace not found</div>;
  }

  const requirementStatus = mapRequirementStatus(displayStatus);
  const assignedTo = requirement.assignedTo || [];

  return (
    <div className="w-full h-full bg-white rounded-[24px] border border-[#EEEEEE] flex overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <RequirementHeader
          workspace={workspace}
          requirement={requirement}
          ctaConfig={ctaConfig}
          requirementStatus={requirementStatus}
          assignedTo={assignedTo}
          router={router}
          workspacesData={workspacesData}
          updateRequirement={updateRequirement}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          visibleTabs={visibleTabs}
          allTasksCompleted={allTasksCompleted}
        />

        {/* Content Area - Using CSS visibility to prevent DOM unmounting and flickering */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]">
          <div className={activeTab === 'details' ? '' : 'hidden'}>
            <RequirementInfoCard requirement={requirement} workspace={workspace} tasks={tasks} timezone={timezone} />
          </div>

          <div className={activeTab === 'tasks' ? '' : 'hidden'}>
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Tasks Section */}
              <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-[#ff3b3b]" />
                    Tasks Breakdown
                  </h3>
                  {getRoleFromUser(user) !== 'Employee' && (
                    <Button

                      type="default"
                      size="small"
                      className="h-8 text-xs border-[#EEEEEE]"
                      onClick={() => setIsTaskModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Task
                    </Button>
                  )}

                </div>

                {/* Table Header */}
                <div className="px-4 pb-3 mb-2">
                  <div className="grid grid-cols-[40px_3.6fr_0.9fr_0.7fr_1.5fr_0.5fr_40px] gap-4 items-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={tasks.length > 0 && selectedTasks.length === tasks.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTasks(tasks.map((t: Task) => String(t.id)));
                          else setSelectedTasks([]);
                        }}
                        className="border-[#DDDDDD] [&.ant-checkbox-checked]:bg-[#ff3b3b] [&.ant-checkbox-checked]:border-[#ff3b3b]"
                      />
                    </div>
                    <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Task</p>
                    <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Timeline</p>
                    <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Assigned</p>
                    <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Progress</p>
                    <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Status</p>
                    <p></p>
                  </div>
                </div>

                <div className="space-y-3">
                  {tasks.length > 0 ? (
                    tasks.map((task: Task) => {
                      const mappedTask = {
                        id: String(task.id),
                        name: task.name || 'Untitled',
                        taskId: String(task.id),
                        client: requirement?.sender_company?.name || workspace?.client_user?.name || workspace?.name || 'In-House',
                        project: requirement?.title || 'N/A',
                        leader: task.leader_user?.name || '',
                        assignedTo: task.member_user?.name || task.task_members?.[0]?.user?.name || 'Unassigned',
                        startDate: task.start_date || '',
                        dueDate: task.end_date || '',
                        estTime: Number(task.estimated_time) || 0,
                        timeSpent: task.time_spent || 0,
                        total_seconds_spent: task.total_seconds_spent || 0,
                        activities: 0,
                        status: task.status || 'Assigned',
                        is_high_priority: task.is_high_priority || (task as { priority?: string }).priority === 'HIGH' || false,
                        timelineDate: task.end_date ? format(new Date(task.end_date), 'MMM dd') : 'N/A',
                        timelineLabel: task.status === 'Delayed' ? 'Overdue' : '',
                        execution_mode: task.execution_mode,
                        task_members: task.task_members || [],
                        dueDateValue: task.end_date ? new Date(task.end_date).getTime() : null,
                        totalSecondsSpent: task.total_seconds_spent || 0,
                      };
                      return (
                        <TaskRow
                          key={task.id}
                          task={mappedTask}
                          selected={selectedTasks.includes(String(task.id))}
                          onSelect={() => {
                            if (selectedTasks.includes(String(task.id))) {
                              setSelectedTasks(selectedTasks.filter(id => id !== String(task.id)));
                            } else {
                              setSelectedTasks([...selectedTasks, String(task.id)]);
                            }
                          }}
                          onEdit={() => {
                            setEditingTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          onStatusChange={(newStatus: string) => {
                            updateTaskStatusMutation.mutate(
                              { id: Number(task.id), status: newStatus },
                              {
                                onSuccess: () => {
                                  message.success(`Task status updated to ${newStatus}`);
                                },
                                onError: (error: Error) => {
                                  message.error(error.message || 'Failed to update task status');
                                },
                              }
                            );
                          }}
                          hideRequirements={true}
                          onRequestRevision={getRoleFromUser(user) !== 'Employee' ? () => {
                            setTargetTaskId(Number(task.id));
                            setIsRevisionModalOpen(true);
                          } : undefined}
                        />
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-[#999999] text-xs">No tasks created yet</div>
                  )}
                </div>

                <Modal
                  title="Request Revision"
                  open={isRevisionModalOpen}
                  onCancel={() => {
                    setIsRevisionModalOpen(false);
                    setRevisionNotes('');
                  }}
                  onOk={() => {
                    if (!targetTaskId || !revisionNotes.trim()) return;
                    requestRevision({ id: targetTaskId, revisionNotes }, {
                      onSuccess: () => {
                        message.success("Revision requested successfully");
                        setIsRevisionModalOpen(false);
                        setRevisionNotes('');
                      },
                      onError: (err: Error) => {
                        message.error(err.message || "Failed to request revision");
                      }
                    });
                  }}
                  okText="Submit Revision"
                  okButtonProps={{ className: "bg-[#111111]" }}
                >
                  <div className="py-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Describe exactly what needs to be changed. This will create a new revision task for the team.
                    </p>
                    <Input.TextArea
                      rows={4}
                      placeholder="Revision details..."
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                    />
                  </div>
                </Modal>
              </div>

              {/* Revisions Section */}
              {revisions.length > 0 && (
                <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
                  <h3 className="text-base font-bold text-[#111111] mb-6 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-[#ff3b3b]" />
                    Revisions
                  </h3>
                  <div className="grid grid-cols-[40px_1fr_200px_150px_120px_40px] gap-4 px-4 pb-3 mb-2 border-b border-[#EEEEEE] items-center">
                    <div className="flex justify-center">
                      <Checkbox disabled className="border-[#DDDDDD]" />
                    </div>
                    <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Revision</p>
                    <div className="flex justify-center">
                      <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Assigned</p>
                    </div>
                    <div className="flex justify-center">
                      <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Due Date</p>
                    </div>
                    <div className="flex justify-center">
                      <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">Status</p>
                    </div>
                    <p className="text-xs font-medium text-[#999999] uppercase tracking-wider"></p>
                  </div>
                  <div className="space-y-2">
                    {revisions.map((task: Task) => (
                      <SubTaskRow key={task.id} task={task} isRevision />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={activeTab === 'gantt' ? '' : 'hidden'}>
            <GanttChartTab
              tasks={tasks}
              workingDays={companyData?.result?.working_hours?.working_days}
            />
          </div>

          <div className={activeTab === 'kanban' ? '' : 'hidden'}>
            <KanbanBoardTab tasks={tasks} revisions={revisions} />
          </div>

          <div className={activeTab === 'pnl' ? '' : 'hidden'}>
            <PnLTab requirement={requirement} tasks={tasks} />
          </div>

          <div className={activeTab === 'documents' ? '' : 'hidden'}>
            <DocumentsTab activityData={documentsActivityData} />
          </div>

          <div className={activeTab === 'billing' ? '' : 'hidden'}>
            <BillingTab requirement={requirement} />
          </div>
        </div>
      </div>

      <ActivitySidebar
        reqId={reqId}
        employeesData={employeesData}
        partnersData={partnersData}
        tasks={tasks}
      />

      <Modal
        open={isTaskModalOpen}
        onCancel={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        footer={null}
        width="min(600px, 95vw)"
        centered
        className="rounded-[16px] overflow-hidden"
        styles={{
          body: {
            padding: 0,
            height: 'calc(100vh - 100px)',
            overflow: 'hidden',
          },
        }}
      >
        <TaskForm
          key={editingTask ? `edit-${editingTask.id}` : `new-task`}
          isEditing={!!editingTask}
          canEditDueDate={userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'coordinator'}
          initialData={editingTask ? {
            name: editingTask.name || '',
            workspace_id: editingTask.workspace_id ? String(editingTask.workspace_id) : String(workspaceId),
            requirement_id: editingTask.requirement_id ? String(editingTask.requirement_id) : String(reqId),
            assigned_members: editingTask.task_members?.map(m => m.user?.id || m.user_id) || [],
            execution_mode: editingTask.execution_mode || 'parallel',
            member_id: editingTask.member_id ? String(editingTask.member_id) : '',
            leader_id: editingTask.leader_id ? String(editingTask.leader_id) : '',
            end_date: editingTask.end_date || '',
            estimated_time: (editingTask as unknown as Record<string, unknown>).estimated_time ? String((editingTask as unknown as Record<string, unknown>).estimated_time) : '',
            is_high_priority: editingTask.is_high_priority || false,
            description: editingTask.description || '',
          } : {
            name: '',
            workspace_id: String(workspaceId),
            requirement_id: String(reqId),
            assigned_members: [],
            execution_mode: 'parallel',
            member_id: '',
            leader_id: '',
            end_date: '',
            estimated_time: '',
            is_high_priority: false,
            description: '',
          }}
          disabledFields={{
            workspace: true,
            requirement: true
          }}
          workspaces={workspaceData?.result ? [{ id: workspaceData.result.id, name: workspaceData.result.name }] : []}
          requirements={requirementsData?.result ? (requirementsData.result as Requirement[]).map((r: Requirement) => ({
            id: r.id,
            name: r.title || r.name || `Requirement ${r.id}`,
            type: r.type || 'Unknown',
            status: r.status || 'Unknown',
            workspace_id: r.workspace_id || workspaceId,
            receiver_workspace_id: r.receiver_workspace_id || null,
            receiver_company_id: r.receiver_company_id || null
          })) : []}
          users={employeesDropdownData || []}
          onCancel={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
          onSubmit={(data: CreateTaskRequestDto) => {
            if (editingTask) {
              return updateTaskMutation.mutateAsync({
                id: Number(editingTask.id),
                ...data,
              } as UpdateTaskRequestDto, {
                onSuccess: () => {
                  message.success("Task updated successfully!");
                  setIsTaskModalOpen(false);
                  setEditingTask(null);
                },
                onError: (error) => {
                  message.error(getErrorMessage(error, "Failed to update task"));
                }
              });
            }

            const assignedMembers = data.assigned_members || [];
            const payload: CreateTaskRequestDto = {
              name: data.name,
              workspace_id: data.workspace_id,
              requirement_id: data.requirement_id,
              start_date: data.start_date || getTodayForApi(),
              end_date: data.end_date,
              assigned_to: assignedMembers.length > 0 ? assignedMembers[0] : undefined,
              member_id: data.member_id ? Number(data.member_id) : undefined,
              leader_id: data.leader_id,
              description: data.description,
              is_high_priority: data.is_high_priority,
              estimated_time: data.estimated_time,
              priority: data.is_high_priority ? 'HIGH' : 'NORMAL',
              status: 'Assigned',
              assigned_members: assignedMembers,
              execution_mode: data.execution_mode
            };

            return createTaskMutation.mutateAsync(payload, {
              onSuccess: () => {
                message.success("Task created successfully!");
                setIsTaskModalOpen(false);
                setEditingTask(null);
              },
              onError: (error) => {
                const errorMessage = getErrorMessage(error, "Failed to create task");
                message.error(errorMessage);
              }
            });
          }}
        />
      </Modal>

    </div>
  );
}
