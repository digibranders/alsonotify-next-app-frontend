'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Clock, CheckCircle2, Plus, MoreHorizontal, Paperclip, ChevronRight, LayoutGrid, List, UserPlus, FolderOpen, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { FilterBar, FilterOption } from '../ui/FilterBar';
import { Button, Input, Select, Checkbox, Dropdown, Breadcrumb, DatePicker, Tooltip, Progress, Tabs, App, Modal } from 'antd';
import { useWorkspaces, useWorkspaceTasks } from '@/hooks/useWorkspace';
import { useCreateTask, useDeleteTask } from '@/hooks/useTask';
import { useEmployees } from '@/hooks/useUser';
import { format } from 'date-fns';

import dayjs from 'dayjs';
import { Workspace, Task as DomainTask } from '@/types/domain';
import { CreateTaskRequestDto } from '@/types/dto/task.dto';
import { getErrorMessage } from '@/types/api-utils';


const { TextArea } = Input;
const { Option } = Select;



interface ProjectTaskUI {
  id: string;
  name: string;
  taskId: string;
  client: string;
  project: string;
  leader: string;
  assignedTo: string;
  assignee: {
    name: string;
    avatar?: string;
  };
  startDate: string;
  dueDate: string;
  estTime: number;
  timeSpent: number;
  activities: number;
  status: 'In Progress' | 'Completed' | 'Review' | 'Todo';
  priority: 'High' | 'Medium' | 'Low';
  comments: number;
  attachments: number;
  is_high_priority: boolean;
  timelineDate: string;
  timelineLabel: string;
  dueDateValue: number;
  description?: string;
  total_seconds_spent: number;
}

export function WorkspaceDetailsPage({ id }: { id: string }) {
  const router = useRouter();
  const { modal, message } = App.useApp();
  const { data: workspacesData } = useWorkspaces('limit=1000');
  const { data: tasksData, isLoading: tasksLoading } = useWorkspaceTasks(Number(id));
  const { data: employeesData } = useEmployees();
  const createTaskMutation = useCreateTask();
  const deleteTaskMutation = useDeleteTask();

  const [activeTab, setActiveTab] = useState('tasks');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'All',
    priority: 'All',
    assignee: 'All'
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<{
    name: string;
    description: string;
    assigneeId: string;
    status: 'Todo' | 'In Progress' | 'Review' | 'Completed';
    priority: 'Medium' | 'High' | 'Low';
    dueDate: Date | null;
  }>({
    name: '',
    description: '',
    assigneeId: '',
    status: 'Todo',
    priority: 'Medium',
    dueDate: null
  });

  const workspace = useMemo((): Workspace | undefined => {
    return workspacesData?.result?.workspaces?.find((p: Workspace) => String(p.id) === id);
  }, [workspacesData, id]);

  const tasks = useMemo((): ProjectTaskUI[] => {
    if (!tasksData?.result) return [];
    return tasksData.result.map((t: DomainTask) => {
      const assignedName = (typeof t.assignedTo === 'object' ? t.assignedTo?.name : t.assignedTo) || 'Unassigned';

      return {
        // Map service TaskDto to UI Task
        id: String(t.id),
        name: t.name || 'Untitled',
        taskId: String(t.id),
        client: 'Unknown', // Default or fetch
        project: workspace?.name || 'Unknown',
        leader: 'Unknown',
        assignedTo: assignedName,
        assignee: {
          name: assignedName,
          avatar: undefined
        },
        startDate: t.start_date || '',
        dueDate: t.dueDate || '',
        estTime: t.estTime || 0,
        timeSpent: t.timeSpent || 0,
        activities: t.activities || 0,
        status: t.status as ProjectTaskUI['status'],
        priority: t.is_high_priority ? 'High' : 'Medium',
        is_high_priority: t.is_high_priority || false,
        timelineDate: '',
        timelineLabel: '',
        dueDateValue: t.dueDate ? new Date(t.dueDate).getTime() : 0,
        description: t.description || '',
        total_seconds_spent: 0,
        comments: 0,
        attachments: 0
      }
    });
  }, [tasksData, workspace]);

  // Filter Options
  const assignees = ['All', ...Array.from(new Set(tasks.map((t: ProjectTaskUI) => t.assignee.name)))];

  const filterOptions: FilterOption[] = [
    {
      id: 'status',
      label: 'Status',
      options: ['All', 'Todo', 'In Progress', 'Review', 'Completed'],
      placeholder: 'Status',
      defaultValue: 'All'
    },
    {
      id: 'priority',
      label: 'Priority',
      options: ['All', 'High', 'Medium', 'Low'],
      placeholder: 'Priority',
      defaultValue: 'All'
    },
    {
      id: 'assignee',
      label: 'Assignee',
      options: assignees as string[],
      placeholder: 'Assignee',
      defaultValue: 'All'
    }
  ];

  const handleCreateTask = () => {
    if (!newTask.name) {
      message.error('Task name is required');
      return;
    }

    const taskPayload: CreateTaskRequestDto = {
      name: newTask.name,
      description: newTask.description,
      workspace_id: Number(id),
      assigned_to: newTask.assigneeId ? Number(newTask.assigneeId) : undefined,
      start_date: new Date().toISOString(),
      end_date: newTask.dueDate ? newTask.dueDate.toISOString() : new Date().toISOString(),
      status: newTask.status,
      priority: newTask.priority.toUpperCase(),
    };

    createTaskMutation.mutate(taskPayload, { // Assuming create payload is partial task
      onSuccess: () => {
        message.success('Task created successfully');
        setIsTaskModalOpen(false);
        setNewTask({
          name: '',
          description: '',
          assigneeId: '',
          status: 'Todo',
          priority: 'Medium',
          dueDate: null
        });
      },
      onError: (error: Error) => {
        message.error(getErrorMessage(error, 'Failed to create task'));
      }
    });
  };

  const handleDeleteTask = (taskId: string) => {
    modal.confirm({
      title: 'Delete Task',
      content: 'Are you sure you want to delete this task?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteTaskMutation.mutate(Number(taskId), {
          onSuccess: () => message.success('Task deleted successfully'),
          onError: () => message.error('Failed to delete task')
        });
      }
    });
  };


  const filteredTasks = tasks.filter((task: ProjectTaskUI) => {
    const matchesSearch = searchQuery === '' || task.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filters.status === 'All' || task.status === filters.status;
    const matchesPriority = filters.priority === 'All' || task.priority === filters.priority;
    const matchesAssignee = filters.assignee === 'All' || task.assignee.name === filters.assignee;
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]';
      case 'In Progress': return 'bg-[#F0F9FF] text-[#0284C7] border-[#B9E6FE]';
      case 'Review': return 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';
      default: return 'bg-[#F7F7F7] text-[#666666] border-[#EEEEEE]';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-[#ff3b3b] bg-[#FEF3F2] border-[#FECACA]';
      case 'Medium': return 'text-[#F59E0B] bg-[#FFFBEB] border-[#FDE68A]';
      case 'Low': return 'text-[#10B981] bg-[#ECFDF5] border-[#A7F3D0]';
      default: return 'text-[#666666] bg-[#F7F7F7] border-[#EEEEEE]';
    }
  };

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[#999999] font-normal">Workspace not found</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white rounded-[24px] border border-[#EEEEEE] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#EEEEEE]">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { title: <a onClick={() => router.push('/dashboard/workspace')} className="cursor-pointer font-medium">Workspaces</a> },
              { title: <span className="font-semibold text-[#111111]">{workspace.name}</span> }
            ]}
            separator={<ChevronRight className="w-4 h-4 text-[#999999]" />}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-[16px] bg-[#FEF3F2] border border-[#ff3b3b]/20 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-[#ff3b3b]" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#111111] mb-2">{workspace.name}</h1>
                <div className="flex items-center gap-4 text-xs text-[#666666]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <UserPlus className="w-4 h-4" />
                    {workspace.client_company_name || 'No Client'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#DDDDDD]" />
                  <span className="flex items-center gap-1.5 font-medium">
                    <CalendarIcon className="w-4 h-4" />
                    Due {workspace.end_date ? format(new Date(workspace.end_date), 'MMM d, yyyy') : 'No Date'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 mr-2">
                {/* Assigned Users Avatars could go here */}
                {workspace.assigned_users?.slice(0, 3).map((user: { name: string }, i: number) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[#F7F7F7] flex items-center justify-center text-[0.625rem] font-bold text-[#666666]">
                    {user.name?.[0]}
                  </div>
                ))}
                {(workspace.assigned_users?.length || 0) > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[#F0F9FF] flex items-center justify-center text-[0.625rem] font-bold text-[#0284C7]">
                    +{(workspace.assigned_users?.length || 0) - 3}
                  </div>
                )}
              </div>
              <Button
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-[#111111] hover:bg-[#000000]/90 text-white border-none h-10 px-4 rounded-lg flex items-center gap-2 font-semibold"
                icon={<Plus className="w-4 h-4" />}
              >
                New Task
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#111111]">Project Progress</span>
              <span className="text-xs font-semibold text-[#111111]">
                {(workspace.total_task || 0) > 0 ? Math.round(((workspace.total_task_completed || 0) / (workspace.total_task || 1)) * 100) : 0}%
              </span>
            </div>
            <Progress percent={(workspace.total_task || 0) > 0 ? Math.round(((workspace.total_task_completed || 0) / (workspace.total_task || 1)) * 100) : 0} showInfo={false} strokeColor="#ff3b3b" trailColor="#F7F7F7" size="small" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'tasks', label: 'Tasks' },
              { key: 'files', label: 'Files' },
              { key: 'activity', label: 'Activity' },
              { key: 'settings', label: 'Settings' }
            ]}
            className="custom-tabs"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
        {activeTab === 'tasks' && (
          <>
            {/* Filter & View Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <FilterBar
                filters={filterOptions}
                selectedFilters={filters}
                onFilterChange={(id, val) => setFilters(prev => ({ ...prev, [id]: val }))}
                onClearFilters={() => setFilters({ status: 'All', priority: 'All', assignee: 'All' })}
                searchPlaceholder="Search tasks..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
              />
              <div className="flex items-center bg-white p-1 rounded-lg border border-[#EEEEEE] ml-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#F7F7F7] text-[#ff3b3b]' : 'text-[#999999] hover:text-[#111111]'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#F7F7F7] text-[#ff3b3b]' : 'text-[#999999] hover:text-[#111111]'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {tasksLoading ? (
              <div className="text-center py-12">
                <p className="text-[#999999] font-normal">Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-[#DDDDDD] mx-auto mb-3" />
                <p className="text-[#999999] font-normal">No tasks found</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-3">
                {filteredTasks.map((task: ProjectTaskUI) => (
                  <div key={task.id} className="group bg-white border border-[#EEEEEE] rounded-[12px] p-4 hover:border-[#ff3b3b] hover:shadow-sm transition-all flex items-center gap-4">
                    <Checkbox className="custom-checkbox" />x1
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[#111111] text-sm truncate">{task.name}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#666666]">
                        <span className={`px-2 py-0.5 rounded-full border text-[0.625rem] font-bold ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border text-[0.625rem] font-bold ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {task.assignee && (
                        <Tooltip title={task.assignee.name}>
                          <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[0.625rem] font-bold text-[#666666]">
                            {task.assignee.name[0]}
                          </div>
                        </Tooltip>
                      )}
                      <Dropdown
                        menu={{
                          items: [
                            { key: 'edit', label: 'Edit', icon: <Edit className="w-4 h-4" /> },
                            { key: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => handleDeleteTask(task.id) }
                          ]
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <button className="w-8 h-8 rounded-lg hover:bg-[#F7F7F7] flex items-center justify-center transition-colors text-[#999999] opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </Dropdown>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredTasks.map((task: ProjectTaskUI) => (
                  <div key={task.id} className="group bg-white border border-[#EEEEEE] rounded-[16px] p-5 hover:border-[#ff3b3b] hover:shadow-sm transition-all flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded-full border text-[0.625rem] font-bold ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <Dropdown
                        menu={{
                          items: [
                            { key: 'edit', label: 'Edit', icon: <Edit className="w-4 h-4" /> },
                            { key: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => handleDeleteTask(task.id) }
                          ]
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <button className="w-6 h-6 rounded hover:bg-[#F7F7F7] flex items-center justify-center transition-colors text-[#999999] opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </Dropdown>
                    </div>
                    <h4 className="font-semibold text-[#111111] text-[0.9375rem] mb-2 line-clamp-2 flex-grow">{task.name}</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 py-0.5 rounded-full border text-[0.625rem] font-bold ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-[#EEEEEE] flex items-center justify-between mt-auto">
                      {task.dueDate && (
                        <span className="flex items-center gap-1.5 text-xs text-[#666666] font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                      {task.assignee && (
                        <Tooltip title={task.assignee.name}>
                          <div className="w-6 h-6 rounded-full bg-[#F7F7F7] flex items-center justify-center text-[0.5625rem] font-bold text-[#666666]">
                            {task.assignee.name[0]}
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Other Tabs Placeholders */}
        {activeTab === 'files' && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Paperclip className="w-12 h-12 text-[#DDDDDD] mb-3" />
            <h3 className="text-base font-semibold text-[#111111]">No files uploaded</h3>
            <p className="text-xs text-[#666666]">Upload files to share with your team.</p>
            <Button className="mt-4 font-semibold" icon={<Plus className="w-4 h-4" />}>Upload File</Button>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-xl font-bold text-[#111111]">
            <div className="p-2 rounded-full bg-[#F7F7F7]">
              <CheckCircle2 className="w-5 h-5 text-[#666666]" />
            </div>
            Create New Task
          </div>
        }
        open={isTaskModalOpen}
        onCancel={() => setIsTaskModalOpen(false)}
        footer={null}
        width="min(600px, 95vw)"
        centered
        className="rounded-[16px] overflow-hidden"
      >
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111111]">Task Title <span className="text-[#ff3b3b]">*</span></label>
            <Input
              placeholder="E.g. Design Homepage Mockups"
              className="h-10 font-normal"
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111]">Assignee</label>
              <Select
                className="w-full h-10"
                placeholder="Select assignee"
                value={newTask.assigneeId || undefined}
                onChange={(val) => setNewTask({ ...newTask, assigneeId: val })}
              >
                {employeesData?.result?.map((emp: { id: number; name: string }) => (
                  <Option key={emp.id} value={String(emp.id)}>{emp.name}</Option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111]">Due Date</label>
              <DatePicker
                className="w-full h-10 font-normal"
                value={newTask.dueDate ? dayjs(newTask.dueDate) : null}
                onChange={(date) => setNewTask({ ...newTask, dueDate: date ? date.toDate() : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111]">Status</label>
              <Select
                className="w-full h-10"
                value={newTask.status}
                onChange={(val) => setNewTask({ ...newTask, status: val })}
              >
                <Option value="Todo">Todo</Option>
                <Option value="In Progress">In Progress</Option>
                <Option value="Review">Review</Option>
                <Option value="Completed">Completed</Option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111]">Priority</label>
              <Select
                className="w-full h-10"
                value={newTask.priority}
                onChange={(val) => setNewTask({ ...newTask, priority: val as 'High' | 'Medium' | 'Low' })}
              >
                <Option value="Low">Low</Option>
                <Option value="Medium">Medium</Option>
                <Option value="High">High</Option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111111]">Description</label>
            <TextArea
              placeholder="Add task details..."
              className="min-h-[100px] font-normal py-2"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#EEEEEE]">
            <Button
              onClick={() => setIsTaskModalOpen(false)}
              className="h-10 px-4 font-semibold text-[#666666] border-none hover:bg-[#F7F7F7]"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleCreateTask}
              loading={createTaskMutation.isPending}
              className="h-10 px-6 bg-[#111111] hover:bg-[#000000]/90 text-white font-semibold border-none rounded-lg"
            >
              Create Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}