'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTabSync } from '@/hooks/useTabSync';
import {
  FileText, Calendar, Clock,
  AlertCircle, Briefcase, FolderOpen,
  ArrowRight, Eye, CheckCircle, RotateCcw
} from 'lucide-react';
import { Breadcrumb, App, Modal, Input, Button } from 'antd';
import { TaskStatusBadge, TaskChatPanel } from './components';
import { TaskMembersList } from './components/TaskMembersList';
import { DocumentsTab } from '@/components/common/DocumentsTab';
import { useTask, useTaskTimer, useUpdateMemberStatus } from '@/hooks/useTask';
import { useTaskActivities } from '@/hooks/useTaskActivity';
import { useTimer } from '@/context/TimerContext';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Skeleton } from '../../ui/Skeleton';
import { PageLayout } from '../../layout/PageLayout';
import { queryKeys } from '@/lib/queryKeys';
import { submitReviewDecision } from '@/services/task';
import { ReviewDecisionModal } from './components/ReviewDecisionModal';


import { Linkify } from '@/components/common/Linkify';
import { formatDecimalHours } from '@/utils/date/timeFormat';

interface TaskActivityAttachment {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface TaskActivity {
  id: number;
  type: string;
  user?: { name: string };
  created_at: string;
  message: string;
  attachments?: TaskActivityAttachment[];
}

export function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const { user: currentUser } = useAuth();
  const taskId = Number(params.taskId);

  const { data: taskData, isLoading } = useTask(taskId);
  const { data: timerData } = useTaskTimer(taskId);
  const { timerState } = useTimer();

  const task = taskData?.result;
  const timer = timerData?.result;
  const workedSeconds = timerState.taskId === taskId && timerState.isRunning
    ? (timer?.worked_time || 0) + timerState.elapsedSeconds
    : (timer?.worked_time || 0);

  const { data: activitiesData } = useTaskActivities(taskId);

  // Transform activity data for Documents tab
  const documentsActivityData = useMemo(() => {
    return (activitiesData?.result as TaskActivity[] | undefined)?.map((act) => ({
      id: act.id,
      type: act.type,
      user: act.user?.name || 'Unknown',
      avatar: '',
      date: format(new Date(act.created_at), 'MMM d, h:mm a'),
      message: act.message,
      isSystem: false,
      attachments: act.attachments || [],
    })) || [];
  }, [activitiesData]);

  // Use standardized tab sync hook for consistent URL handling
  type TaskDetailsTab = 'details' | 'documents';
  const [activeTab, setActiveTab] = useTabSync<TaskDetailsTab>({
    defaultTab: 'details',
    validTabs: ['details', 'documents']
  });
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeDescription, setCompleteDescription] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [reviewDecisionOpen, setReviewDecisionOpen] = useState(false);
  const [reviewDecisionType, setReviewDecisionType] = useState<'Approve' | 'RequestChanges' | null>(null);
  const [reviewDecisionLoading, setReviewDecisionLoading] = useState(false);

  const queryClient = useQueryClient();
  const { mutateAsync: updateMemberStatusAsync } = useUpdateMemberStatus();
  const { stopTimer } = useTimer();

  // Start: member-status first, then startTimer on success; do not start timer if member-status denies (403/409)

  // Complete: open modal first; on submit stopTimer(description) then updateMemberStatus(Completed)

  const handleCompleteSubmit = async () => {
    if (!task) return;
    setCompleteSubmitting(true);
    try {
      await stopTimer(completeDescription?.trim() ?? '');
      await updateMemberStatusAsync({ taskId: Number(task.id), status: 'Completed' });
      setShowCompleteModal(false);
      setCompleteDescription('');
      message.success('Task marked as completed!');
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.timer(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update status');
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.timer(taskId) });
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleReviewDecisionConfirm = async (notes: string) => {
    if (!reviewDecisionType || !task) return;
    setReviewDecisionLoading(true);
    try {
      await submitReviewDecision(
        Number(task.id),
        reviewDecisionType === 'Approve' ? 'Approved' : 'ChangesRequested',
        notes
      );
      message.success(reviewDecisionType === 'Approve' ? 'Task approved!' : 'Changes requested');
      setReviewDecisionOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
    } catch {
      message.error('Failed to submit decision');
    } finally {
      setReviewDecisionLoading(false);
    }
  };

  // Access Control
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const isMember = task?.task_members?.some((tm: { user_id: number }) => tm.user_id === currentUser?.id);
  const isLeader = task?.leader_id === currentUser?.id;
  const isAssignee = task?.member_id === currentUser?.id;
  // Supervisory roles (Admin, Head, Coordinator, Manager) always have view access to any task
  // Prefer API-returned _permissions.hasViewDetail flag, fallback to role-name check
  const hasSupervisoryAccess =
    (task as { _permissions?: { hasViewDetail?: boolean } })?._permissions?.hasViewDetail === true ||
    ['admin', 'head', 'coordinator', 'manager'].includes(currentUser?.role?.toLowerCase() ?? '');
  const hasAccess = isAdmin || isMember || isLeader || isAssignee || hasSupervisoryAccess;

  if (isLoading) {
    return (
      <PageLayout
        title={<div className="flex items-center gap-2"><Skeleton className="h-4 w-12" /><span className="text-[#999999]">/</span><Skeleton className="h-6 w-48" /></div>}
        action={<div className="flex items-center gap-4"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-16 rounded-full" /></div>}
        tabs={[{ id: 'details', label: 'Details' }]}
        activeTab="details"
        sideContent={
          <div className="w-[350px] border-l border-[#EEEEEE] flex flex-col bg-white rounded-tr-[24px] rounded-br-[24px]">
            <div className="p-6 border-b border-[#EEEEEE]">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex-1 p-6 space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-12" /></div>
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#EEEEEE]">
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        }
      >
        <div className="h-full overflow-y-auto p-8 bg-[#FAFAFA] space-y-8">
          <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
            <Skeleton className="h-5 w-32 mb-6" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[85%]" />
            </div>
          </div>
          <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
            <Skeleton className="h-5 w-40 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-[#FAFAFA] rounded-xl p-4 border border-[#F5F5F5]">
                  <Skeleton className="h-3 w-16 mb-4" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[#EEEEEE]">
              {[1, 2].map(i => (
                <div key={i}>
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!task) {
    return (
      <PageLayout title="Task Not Found" activeTab="details">
        <div className="flex flex-col items-center justify-center h-full p-8 text-[#666666]">
          <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-base font-semibold">The requested task could not be found.</p>
          <button onClick={() => router.push('/dashboard/tasks')} className="mt-6 text-[#ff3b3b] hover:font-bold transition-all flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Tasks
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!hasAccess) {
    return (
      <PageLayout title="Access Denied" activeTab="details">
        <div className="flex flex-col items-center justify-center h-full p-8 text-[#666666]">
          <AlertCircle className="w-12 h-12 mb-4 text-[#ff3b3b] opacity-50" />
          <p className="text-base font-semibold">You don't have permission to view this task.</p>
          <p className="text-xs mt-2 opacity-70 text-center max-w-md">This task is only accessible to assigned members, their leader, and supervisory staff.</p>
          <button onClick={() => router.push('/dashboard/tasks')} className="mt-6 text-[#ff3b3b] hover:font-bold transition-all flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Tasks
          </button>
        </div>
      </PageLayout>
    );
  }

  const leader = task?.leader_user;
  const taskProject = task?.task_project?.company;
  const workspace = taskProject ? { name: taskProject.name, id: task.workspace_id } : undefined;
  const requirement = task?.task_requirement;

  // Progress calculations
  const estimatedHours = Number(task.estimated_time || timer?.estimated_time || 0);
  const workedHours = workedSeconds / 3600;
  const progressPercent = estimatedHours > 0
    ? Math.min(Math.round((workedHours / estimatedHours) * 100), 100)
    : 0;
  const formattedLogged = workedHours < 0.1 && workedHours > 0 ? '< 1m' : formatDecimalHours(workedHours);

  // Enable Start only when current member has provided estimate (align with FloatingTimerBar)

  return (
    <PageLayout
      title={
        <Breadcrumb
          separator={<span className="text-xl font-semibold text-[#999999]">/</span>}
          items={[
            {
              title: (
                <span
                  onClick={() => router.push('/dashboard/tasks')}
                  className="cursor-pointer font-semibold text-xl text-[#999999] hover:text-[#666666] transition-colors"
                >
                  Tasks
                </span>
              ),
            },
            {
              title: (
                <span className="font-semibold text-xl text-[#111111] line-clamp-1 max-w-[300px]">
                  {task.name || 'Untitled Task'}
                </span>
              ),
            },
          ]}
        />
      }
      action={
        <div className="flex items-center gap-3 flex-wrap">
          <TaskStatusBadge status={task.status || 'Assigned'} />
          {task.is_high_priority && (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-[#FFF5F5] text-[#ff3b3b]">
              HIGH PRIORITY
            </span>
          )}
          {task.is_review_task && (isMember || isLeader) && task.status !== 'Completed' && (
            <>
              <Button
                size="small"
                icon={<CheckCircle className="w-3.5 h-3.5" />}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#fff' }}
                onClick={() => { setReviewDecisionType('Approve'); setReviewDecisionOpen(true); }}
              >
                Approve
              </Button>
              <Button
                size="small"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                danger
                onClick={() => { setReviewDecisionType('RequestChanges'); setReviewDecisionOpen(true); }}
              >
                Request Changes
              </Button>
            </>
          )}
        </div>
      }
      tabs={[
        { id: 'details', label: 'Details' },
        { id: 'documents', label: 'Documents' }
      ]}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TaskDetailsTab)}
      sideContent={<TaskChatPanel taskId={taskId} />}
    >
      {/* Using CSS visibility to prevent DOM unmounting and flickering */}
      <div className="h-full overflow-y-auto p-0 bg-[#FAFAFA]">
        <div className={activeTab === 'details' ? '' : 'hidden'}>
          <div className="space-y-8 p-8 max-w-5xl mx-auto">
            {/* Review Task Banner */}
            {task.is_review_task && (
              <div className="bg-[#F3E8FF] border border-[#E9D5FF] rounded-[16px] px-6 py-4 flex items-center gap-3">
                <Eye className="w-5 h-5 text-[#7E22CE] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#7E22CE]">Reviewing:</span>
                    {task.review_for_task ? (
                      <button
                        onClick={() => router.push(`/dashboard/tasks/${task.review_for_task!.id}`)}
                        className="text-sm font-semibold text-[#6D28D9] hover:underline truncate max-w-[400px]"
                      >
                        {task.review_for_task.name}
                      </button>
                    ) : (
                      <span className="text-sm text-[#7E22CE] opacity-70">Original task</span>
                    )}
                    {task.review_round && task.review_round > 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#7E22CE] text-white text-xs font-bold">
                        Round {task.review_round}
                      </span>
                    )}
                  </div>
                  {task.status === 'Completed' && task.review_decision && (
                    <p className="text-xs text-[#7E22CE] mt-1 opacity-80">
                      Decision: {task.review_decision === 'Approved' ? '✓ Approved' : '↩ Changes Requested'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description Section */}
            <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
              <h3 className="text-base font-bold text-[#111111] mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ff3b3b]" />
                Description
              </h3>
              <Linkify className="text-[#444444]">
                {task.description || "No description provided."}
              </Linkify>
            </div>

            {/* Task Metadata */}
            <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#ff3b3b]" />
                  Task Overview
                </h3>
              </div>

              {/* People & Context Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Left Col: Task Members (Span 2) */}
                <div className="lg:col-span-2">
                  <TaskMembersList
                    taskId={taskId}
                    members={task.task_members || []}
                    executionMode={task.execution_mode || 'parallel'}
                    currentUser={currentUser}
                    isLeader={isLeader}
                  />
                </div>

                {/* Right Col: Context Cards (Span 1) */}
                <div className="space-y-4">
                  {/* Leader Card */}
                  <div className="bg-white rounded-xl p-4 border border-[#EEEEEE] shadow-sm">
                    <p className="text-xs font-bold text-[#999999] uppercase tracking-wider mb-3">Leader</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E0E0E0] border border-[#CCCCCC] flex items-center justify-center shadow-sm text-[#666666] font-bold text-sm">
                        {leader?.name ? leader.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#111111] truncate">{leader?.name || 'Unknown'}</p>
                        <p className="text-xs text-[#666666] truncate">Squad Leader</p>
                      </div>
                    </div>
                  </div>

                  {/* Workspace Card */}
                  <div className="bg-white rounded-xl p-4 border border-[#EEEEEE] shadow-sm">
                    <p className="text-xs font-bold text-[#999999] uppercase tracking-wider mb-3">Workspace</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-[#EEEEEE] flex items-center justify-center text-[#111111]">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#111111] truncate">
                          {workspace?.name || 'In-House'}
                        </p>
                        <p className="text-xs text-[#666666] truncate">
                          {task.task_workspace?.partner?.company || task.task_workspace?.company?.name || 'Workspace'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Requirement Card */}
                  <div className="bg-white rounded-xl p-4 border border-[#EEEEEE] shadow-sm">
                    <p className="text-xs font-bold text-[#999999] uppercase tracking-wider mb-3">Requirement</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-[#EEEEEE] flex items-center justify-center text-[#111111]">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#111111] truncate">
                          {requirement?.name || 'No Scope'}
                        </p>
                        <p className="text-xs text-[#666666] truncate">Scope</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline & Progress Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[#EEEEEE]">
                <div className="flex flex-col">
                  <h4 className="text-xs font-bold text-[#111111] mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#999999]" />
                    Timeline
                  </h4>
                  <div className="bg-[#FAFAFA] p-5 rounded-xl border border-[#F5F5F5] flex items-center justify-between flex-1">
                    <div>
                      <p className="text-xs text-[#999999] mb-1 uppercase tracking-tighter">Start Date</p>
                      <p className="text-sm font-medium text-[#111111]">
                        {task.start_date ? format(new Date(task.start_date), 'MMM d, yyyy') : 'Not set'}
                      </p>
                    </div>
                    <div className="flex flex-col items-center px-4 opacity-30">
                      <span className="h-[1px] w-8 bg-black mb-1"></span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#999999] mb-1 uppercase tracking-tighter">Due Date</p>
                      <p className="text-sm font-medium text-[#111111]">
                        {task.end_date ? format(new Date(task.end_date), 'MMM d, yyyy') : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <h4 className="text-xs font-bold text-[#111111] mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#999999]" />
                    Progress
                  </h4>
                  <div className="bg-[#FAFAFA] p-5 rounded-xl border border-[#F5F5F5] space-y-4 flex-1">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-[#111111] leading-none">{formatDecimalHours(estimatedHours)}</span>
                          <span className="text-xs text-[#666666] font-medium">estimated</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold leading-none ${task.status?.toLowerCase() === 'completed' ? 'text-[#0F9D58]' :
                          task.status?.toLowerCase() === 'delayed' ? 'text-[#ff3b3b]' : 'text-[#2F80ED]'
                          }`}>
                          {progressPercent}%
                        </p>
                      </div>
                    </div>

                    <div className="relative pt-2">
                      <div className="flex justify-between text-xs font-semibold text-[#999999] mb-2 uppercase tracking-wide">
                        <span>Logged: {formattedLogged}</span>
                        <span>{formatDecimalHours(Math.max(0, estimatedHours - workedHours))} left</span>
                      </div>
                      <div className="w-full h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${task.status?.toLowerCase() === 'completed' ? 'bg-[#0F9D58]' :
                            task.status?.toLowerCase() === 'delayed' ? 'bg-[#ff3b3b]' : 'bg-[#2F80ED]'
                            }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={activeTab === 'documents' ? '' : 'hidden'}>
          <DocumentsTab activityData={documentsActivityData} />
        </div>
      </div>
      <ReviewDecisionModal
        open={reviewDecisionOpen}
        decision={reviewDecisionType}
        taskName={task.review_for_task?.name || task.name}
        loading={reviewDecisionLoading}
        onClose={() => setReviewDecisionOpen(false)}
        onConfirm={handleReviewDecisionConfirm}
      />
      <Modal
        title="Mark as Complete"
        open={showCompleteModal}
        onOk={handleCompleteSubmit}
        onCancel={() => {
          setShowCompleteModal(false);
          setCompleteDescription('');
        }}
        okText="Mark Complete"
        cancelText="Cancel"
        confirmLoading={completeSubmitting}
        okButtonProps={{ style: { backgroundColor: '#16a34a', borderColor: '#16a34a' } }}
      >
        <div className="py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add a note (optional)
          </label>
          <Input.TextArea
            value={completeDescription}
            onChange={(e) => setCompleteDescription(e.target.value)}
            placeholder="Add final notes about what you completed..."
            rows={4}
            className="w-full"
          />
        </div>
      </Modal>
    </PageLayout>
  );
}


