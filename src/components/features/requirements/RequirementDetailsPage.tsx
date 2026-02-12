import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import {
  ListTodo,
  Plus, RotateCcw,
} from 'lucide-react';
import { Checkbox, Button, App, Input, Modal } from 'antd';
import { Skeleton } from '../../ui/Skeleton';
import { useWorkspace, useRequirements, useUpdateRequirement, useWorkspaces } from '@/hooks/useWorkspace';
import { useTasks, useRequestRevision, useCreateTask } from '@/hooks/useTask';
import { TaskForm } from '../../modals/TaskForm';
import { CreateTaskRequestDto } from '@/types/dto/task.dto';
import { getErrorMessage } from '@/types/api-utils';
import { useEmployees, usePartners, useCurrentUserCompany } from '@/hooks/useUser';
import { useRequirementActivities } from '@/hooks/useRequirementActivity';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { getTodayForApi } from '@/utils/date';
import { TaskRow } from '@/components/features/tasks/rows/TaskRow';
import { Requirement, Task, Employee } from '@/types/domain';
import {
  getRequirementCTAConfig,
  type RequirementStatus,
} from '@/lib/workflow';
import {
  mapRequirementToStatus,
  mapRequirementToRole,
  mapRequirementToContext,
  mapRequirementToType,
} from './utils/requirementState.utils';
import { getRoleFromUser } from '@/utils/roleUtils';


// Extracted components
import { GanttChartTab, PnLTab, DocumentsTab, KanbanBoardTab } from './components';
import { RequirementHeader } from './components/RequirementHeader';
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

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);


  const { data: employeesData } = useEmployees();
  const { data: companyData } = useCurrentUserCompany();
  const { user } = useAuth();

  const timezone = useMemo(() => companyData?.result?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata', [companyData]);



  // Use standardized tab sync hook for consistent URL handling
  type ReqDetailsTab = 'details' | 'tasks' | 'gantt' | 'kanban' | 'pnl' | 'documents';
  const [activeTab, setActiveTab] = useTabSync<ReqDetailsTab>({
    defaultTab: 'details',
    validTabs: ['details', 'tasks', 'gantt', 'kanban', 'pnl', 'documents']
  });
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [ganttView, setGanttView] = useState<'day' | 'week' | 'month'>('week');

  const { mutate: updateRequirement } = useUpdateRequirement();
  const { data: myWorkspacesData } = useWorkspaces();
  const { data: partnersData } = usePartners();
  const { mutate: requestRevision } = useRequestRevision();

  const { data: activityResponse } = useRequirementActivities(reqId);
  const documentsActivityData = useMemo(() => {
    if (!activityResponse?.result) return [];
    return (activityResponse.result as any[]).map((act) => ({
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

  const mapRequirementStatus = (status: string): 'in-progress' | 'completed' | 'delayed' => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('completed') || statusLower === 'done') return 'completed';
    if (statusLower.includes('delayed') || statusLower.includes('stuck') || statusLower.includes('impediment')) return 'delayed';
    return 'in-progress';
  };

  const tasks = useMemo((): Task[] => {
    if (!tasksData?.result || !requirement) return [];
    return tasksData.result.filter((t: any) => Number(t.requirement_id) === reqId && (!t.type || t.type === 'task'));
  }, [tasksData, requirement, reqId]);

  const revisions = useMemo(() => {
    if (!tasksData?.result || !requirement) return [];
    return tasksData.result.filter((t: Task & { type?: string }) => t.requirement_id === reqId && t.type === 'revision');
  }, [tasksData, requirement, reqId]);

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
    const role = mapRequirementToRole(requirement);
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
  }, [requirement, user?.id]);

  const displayStatus = ctaConfig.displayStatus;



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
          myWorkspacesData={myWorkspacesData}
          updateRequirement={updateRequirement}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Content Area - Using CSS visibility to prevent DOM unmounting and flickering */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]">
          <div style={{ display: activeTab === 'details' ? 'block' : 'none' }}>
            <RequirementInfoCard requirement={requirement} workspace={workspace} tasks={tasks} timezone={timezone} />
          </div>

          <div style={{ display: activeTab === 'tasks' ? 'block' : 'none' }}>
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Tasks Section */}
              <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111] flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-[#ff3b3b]" />
                    Tasks Breakdown
                  </h3>
                  {getRoleFromUser(user) !== 'Employee' && (
                    <Button

                      type="default"
                      size="small"
                      className="h-8 text-[12px] border-[#EEEEEE]"
                      onClick={() => setIsTaskModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Task
                    </Button>
                  )}

                </div>

                {/* Table Header */}
                <div className="px-4 pb-3 mb-2">
                  <div className="grid grid-cols-[40px_2.5fr_1.1fr_1fr_0.8fr_1.5fr_0.6fr_40px] gap-4 items-center">
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
                    <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Task</p>
                    <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Timeline</p>
                    <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide text-center">Assigned</p>
                    <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide text-center">Duration</p>
                    <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide text-center">Progress</p>
                    <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide text-center">Status</p>
                    <p></p>
                  </div>
                </div>

                <div className="space-y-3">
                  {tasks.length > 0 ? (
                    tasks.map((task: Task) => {
                      const mappedTask = {
                        id: String(task.id),
                        name: task.name || task.title || 'Untitled',
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
                        task_members: task.task_members || []
                      };
                      return (
                        <TaskRow
                          key={task.id}
                          task={mappedTask as any}
                          selected={selectedTasks.includes(String(task.id))}
                          onSelect={() => {
                            if (selectedTasks.includes(String(task.id))) {
                              setSelectedTasks(selectedTasks.filter(id => id !== String(task.id)));
                            } else {
                              setSelectedTasks([...selectedTasks, String(task.id)]);
                            }
                          }}
                          onStatusChange={() => { }}
                          hideRequirements={true}
                          onRequestRevision={getRoleFromUser(user) !== 'Employee' ? () => {
                            setTargetTaskId(task.id as any);
                            setIsRevisionModalOpen(true);
                          } : undefined}
                        />
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-[#999999] text-[13px]">No tasks created yet</div>
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
                        message.error((err as any).message || "Failed to request revision");
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
                  <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-6 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-[#ff3b3b]" />
                    Revisions
                  </h3>
                  <div className="grid grid-cols-[40px_1fr_200px_150px_120px_40px] gap-4 px-4 pb-3 mb-2 border-b border-[#EEEEEE] items-center">
                    <div className="flex justify-center">
                      <Checkbox disabled className="border-[#DDDDDD]" />
                    </div>
                    <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Revision</p>
                    <div className="flex justify-center">
                      <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Assigned</p>
                    </div>
                    <div className="flex justify-center">
                      <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Due Date</p>
                    </div>
                    <div className="flex justify-center">
                      <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Status</p>
                    </div>
                    <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide"></p>
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

          <div style={{ display: activeTab === 'gantt' ? 'block' : 'none' }}>
            <GanttChartTab
              tasks={tasks}
              revisions={revisions}
              ganttView={ganttView}
              setGanttView={setGanttView}
            />
          </div>

          <div style={{ display: activeTab === 'kanban' ? 'block' : 'none' }}>
            <KanbanBoardTab tasks={tasks} revisions={revisions} />
          </div>

          <div style={{ display: activeTab === 'pnl' ? 'block' : 'none' }}>
            <PnLTab requirement={requirement} tasks={tasks} />
          </div>

          <div style={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
            <DocumentsTab activityData={documentsActivityData} />
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
        onCancel={() => setIsTaskModalOpen(false)}
        footer={null}
        width={600}
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
          isEditing={false}
          initialData={{
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
          users={employeesData?.result ? (employeesData.result as Employee[]).map((u: Employee) => ({
            id: u.user_id || u.id || 0,
            name: u.name || 'Unknown User',
            profile_pic: u.profile_pic || undefined
          })) : []}
          onCancel={() => setIsTaskModalOpen(false)}
          onSubmit={(data: CreateTaskRequestDto) => {
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
