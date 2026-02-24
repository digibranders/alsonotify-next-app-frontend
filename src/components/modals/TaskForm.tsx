import { useState, useMemo } from "react";
import { Button, Input, Select, Checkbox, DatePicker, App, Avatar, Tooltip } from 'antd';
import { CheckSquare, Calendar, Users, ArrowRight, Layers, UserPlus, X, Building2, GripVertical } from 'lucide-react';
import { Reorder } from "framer-motion";
import dayjs from '@/utils/dayjs';
import { formatDateForApi, getTodayForApi } from '@/utils/date';
import { FormLayout } from '@/components/common/FormLayout';
import { trimStr } from '@/utils/trim';

const { TextArea } = Input;
const { Option } = Select;

import { CreateTaskRequestDto } from '@/types/dto/task.dto';
import { RequirementDropdownItem } from '@/types/dto/requirement.dto';

// Backend fields based on TaskCreateSchema
export interface TaskFormData {
  name: string;
  workspace_id: string; // Workspace
  requirement_id: string; // Requirement
  member_id: string; // Legacy: Primary Assignee (optional or first member)
  assigned_members: number[]; // New: Squad Members
  execution_mode: "parallel" | "sequential"; // New: Execution Mode
  leader_id: string; // Leader
  end_date: string; // Due Date (replaced start_date)
  start_date?: string; // Preserve start_date
  estimated_time: string; // Estimated Time (in hours)
  is_high_priority: boolean; // Priority boolean
  description: string; // Description
}

interface TaskFormProps {
  initialData?: TaskFormData;
  onSubmit: (data: CreateTaskRequestDto) => Promise<unknown> | void;
  onCancel: () => void;
  isEditing?: boolean;
  canEditDueDate?: boolean;
  users?: Array<{ id: number; name: string; profile_pic?: string }>;
  requirements?: RequirementDropdownItem[];
  workspaces?: Array<{ id: number; name: string; company_name?: string; partner_name?: string; in_house?: boolean }>;
  disabledFields?: {
    workspace?: boolean;
    requirement?: boolean;
  };
}

const defaultFormData: TaskFormData = {
  name: "",
  workspace_id: "",
  requirement_id: "",
  member_id: "",
  assigned_members: [],
  execution_mode: "parallel",
  leader_id: "",
  end_date: "",
  estimated_time: "",
  is_high_priority: false,
  description: "",
};

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getRoleFromUser } from '@/utils/roleUtils';

// ... imports

export function TaskForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  canEditDueDate = true,
  users = [],
  requirements = [],
  workspaces = [],
  disabledFields = {},
}: Readonly<TaskFormProps>) {
  const { message } = App.useApp();
  const { user: currentUser } = useCurrentUser();

  // Get current logged-in user ID
  const currentUserId = useMemo(() => {
    if (currentUser?.id) return String(currentUser.id);
    return '';
  }, [currentUser]);




  // Compute initial state once on mount (or when key changes)
  const [formData, setFormData] = useState<TaskFormData>(() => {
    // 1. Resolve base data (Initial or Default)
    const base = initialData || defaultFormData;

    // 2. Resolve Workspace ID (Preserve existing from initialData only, don't auto-select)
    const workspaceId = base.workspace_id;

    // 3. Resolve Leader ID (Current user or preserved)
    // Note: handleSubmit overrides this with currentUserId anyway
    const leaderId = currentUserId || base.leader_id;

    // 4. Resolve Assigned Members
    // If editing: use existing assigned_members or fallback to member_id
    // If new: empty or derived
    const assignedMembers = base.assigned_members ||
      (base.member_id ? [parseInt(base.member_id)] : []);

    return {
      ...base,
      workspace_id: workspaceId,
      leader_id: leaderId,
      assigned_members: assignedMembers,
      execution_mode: base.execution_mode || "parallel",
    };
  });

  const sortedUsers = useMemo(() => {
    // 1. Start with the provided users list
    const allUsers = [...(users || [])];

    // 2. Ensure the currently selected leader and assigned members are in the list
    // This is a safety measure in case the 'users' prop is filtered or limited.
    const selectedIds = new Set<number>();
    if (formData.leader_id) selectedIds.add(parseInt(formData.leader_id));
    formData.assigned_members.forEach(id => selectedIds.add(id));

    selectedIds.forEach(id => {
      if (!allUsers.find(u => u.id === id)) {
        // If missing, we add a placeholder. In a real scenario, we'd hope 
        // the parent passes all necessary user objects or we fetch them.
        allUsers.push({ id, name: `User #${id}` });
      }
    });

    // 3. Apply sorting (Current user first for non-admins)
    if (!currentUser) return allUsers;

    const isAdmin = getRoleFromUser(currentUser) === 'Admin';
    if (isAdmin) return allUsers;

    const currentIdNum = parseInt(currentUserId);
    return [...allUsers].sort((a, b) => {
      if (a.id === currentIdNum) return -1;
      if (b.id === currentIdNum) return 1;
      return 0;
    });
  }, [users, currentUser, currentUserId, formData.leader_id, formData.assigned_members]);


  // Filter requirements based on selected workspace.
  // IMPORTANT: Always include the currently-selected requirement (if any) so that
  // an already-linked requirement is never hidden when editing a task.
  const filteredRequirements = useMemo(() => {
    const selectedReqId = formData.requirement_id ? parseInt(formData.requirement_id) : null;

    // If no workspace selected, only show the already-selected requirement (if any)
    if (!formData.workspace_id) {
      if (!selectedReqId) return [];
      return requirements.filter((req) => req.id === selectedReqId);
    }

    const workspaceIdNum = parseInt(formData.workspace_id);
    const filtered = requirements.filter((req) => {
      // Match if requirement's workspace_id or receiver_workspace_id matches selected workspace
      return req.workspace_id === workspaceIdNum || req.receiver_workspace_id === workspaceIdNum;
    });

    // Safety net for edit mode: ensure the currently-selected requirement is always present
    // in the list even if the workspace filter does not include it (e.g. collaborative/outsourced reqs)
    if (selectedReqId && !filtered.some((r) => r.id === selectedReqId)) {
      const selectedReq = requirements.find((r) => r.id === selectedReqId);
      if (selectedReq) return [...filtered, selectedReq];
    }

    return filtered;
  }, [formData.workspace_id, formData.requirement_id, requirements]);

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields: string[] = [];
    if (!formData.name) missingFields.push('Task Title');
    if (!formData.workspace_id) missingFields.push('Workspace');
    if (!formData.end_date) missingFields.push('Due Date');
    // Estimated time is conditional now, but if visible, it should be validated.
    // However, validation logic needs to know if it's visible. 
    // We'll rely on backend or simple check: if user is assigned, check it?
    // User Instructions: "The 'Estimated Time' input should only be visible ... if the currentUserId is present ... If... not ... hide this field."
    // If hidden, it's not required.
    const isCurrentUserAssigned = formData.assigned_members.includes(parseInt(currentUserId));
    if (isCurrentUserAssigned && (!formData.estimated_time || isNaN(parseFloat(formData.estimated_time)))) {
      missingFields.push('My Hours');
    }
    // Ensure at least one member is assigned (either legacy member_id or new assigned_members)
    if ((!formData.assigned_members || formData.assigned_members.length === 0) && !formData.member_id) {
      missingFields.push('At least one squad member');
    }


    if (missingFields.length > 0) {
      message.error(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    const backendData: CreateTaskRequestDto = {
      name: trimStr(formData.name),
      workspace_id: formData.workspace_id ? parseInt(formData.workspace_id) : undefined,
      requirement_id: formData.requirement_id ? parseInt(formData.requirement_id) : undefined,
      leader_id: parseInt(currentUserId),
      end_date: formData.end_date ? formatDateForApi(formData.end_date) : undefined,
      start_date: formData.start_date ? formatDateForApi(formData.start_date) : getTodayForApi(),
      estimated_time: (formData.estimated_time && isCurrentUserAssigned) ? parseFloat(formData.estimated_time) : 0,
      is_high_priority: formData.is_high_priority,
      description: trimStr(formData.description) || "",
      execution_mode: formData.execution_mode,
      assigned_members: formData.assigned_members,
      member_id: formData.assigned_members.length > 0 ? formData.assigned_members[0] : undefined
    };


    try {
      await onSubmit(backendData);
      handleReset();
    } catch (error) {
      // Error is handled by the parent component's query mutation onError, 
      // but we catch here to prevent reset if submission fails.
      console.error("Task submission failed", error);
    }
  };

  const handleReset = () => {
    setFormData({
      ...defaultFormData,
      leader_id: currentUserId, // Keep leader set to current user on reset
    });
  };

  // Helper to remove member
  const removeMember = (id: number) => {
    setFormData(prev => ({
      ...prev,
      assigned_members: prev.assigned_members.filter(m => m !== id)
    }));
  };

  // Helper to reorder members
  const handleReorder = (newOrder: number[]) => {
    if (formData.execution_mode === 'sequential') {
      setFormData(prev => ({ ...prev, assigned_members: newOrder }));
    }
  };

  // Helper to add member
  const addMember = (id: number) => {
    if (formData.assigned_members.includes(id)) return;
    setFormData(prev => ({
      ...prev,
      assigned_members: [...prev.assigned_members, id]
    }));
  };

  return (
    <FormLayout
      title={isEditing ? 'Edit Task' : 'New Task'}
      subtitle={isEditing ? 'Update task parameters and squad.' : 'Define objective and assemble your squad.'}
      icon={CheckSquare}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button
            type="text"
            onClick={handleReset}
            className="h-[40px] px-4 text-sm font-semibold text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] transition-colors rounded-lg"
          >
            Reset Data
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            className="h-[40px] px-8 rounded-lg bg-[#111111] hover:bg-[#000000]/90 text-white text-sm font-semibold transition-transform active:scale-95 border-none"
          >
            {isEditing ? 'Update Task' : 'Submit'}
          </Button>
        </>
      }
    >
      {/* Compact Grid Layout */}
      <div className="grid grid-cols-12 gap-x-4 gap-y-4 mb-5">

        {/* Task Title and Priority Row */}
        <div className="col-span-12 flex gap-4 items-start">
          <div className="flex-1 space-y-1.5">
            <span className="text-xs font-bold text-[#111111]">
              Task Title <span className="text-red-500">*</span>
            </span>
            <Input
              placeholder="e.g. Implement Payment Gateway"
              className="w-full h-11 rounded-lg border-[#EEEEEE] text-sm"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
              }}
            />
          </div>

          <div className="w-[102px] space-y-1.5 flex-none">
            <span className="text-xs font-bold text-[#111111]">Priority</span>
            <div
              className={`h-11 rounded-lg border flex items-center justify-center px-3 cursor-pointer transition-colors ${formData.is_high_priority ? 'border-red-200 bg-red-50/50' : 'border-[#EEEEEE] hover:border-gray-300 bg-white'}`}
              onClick={() => setFormData({ ...formData, is_high_priority: !formData.is_high_priority })}
            >
              <Checkbox
                checked={formData.is_high_priority}
                className="font-medium text-xs pointer-events-none"
              >
                <span className={formData.is_high_priority ? 'text-red-600' : 'text-[#666666]'}>High</span>
              </Checkbox>
            </div>
          </div>
        </div>

        {/* Workspace: Col Span 6 */}
        <div className="col-span-12 sm:col-span-6 space-y-1.5">
          <span className="text-xs font-bold text-[#111111]">
            Workspace <span className="text-red-500">*</span>
          </span>
          <Select
            className="w-full h-11"
            placeholder="Select workspace"
            value={formData.workspace_id || undefined}
            onChange={(val) => {
              setFormData(prev => ({
                ...prev,
                workspace_id: String(val),
                // Clear requirement when workspace changes to avoid mismatches
                requirement_id: ""
              }));
            }}
            disabled={disabledFields.workspace}
            suffixIcon={<Building2 className="w-4 h-4 text-[#999999]" />}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {workspaces.length > 0 ? (
              workspaces.map((ws) => (
                <Option key={ws.id} value={ws.id.toString()} label={ws.name}>
                  <div className="flex flex-col py-1">
                    <span className="font-medium text-[#111111] leading-tight">{ws.name}</span>
                    <span className="text-[0.625rem] text-[#999999] leading-tight">
                      {ws.in_house ? ws.company_name : ws.partner_name || 'Organization'}
                    </span>
                  </div>
                </Option>
              ))
            ) : (
              <Option value="none" disabled>No workspaces available</Option>
            )}
          </Select>
        </div>

        {/* Requirement: Col Span 6 */}
        <div className="col-span-12 sm:col-span-6 space-y-1.5">
          <span className="text-xs font-bold text-[#111111]">
            Requirement
          </span>
          <Select
            className="w-full h-11"
            placeholder={formData.workspace_id ? "Select requirement" : "Select workspace first"}
            value={formData.requirement_id || undefined}
            onChange={(val) => {
              setFormData(prev => ({
                ...prev,
                requirement_id: String(val)
              }));
            }}
            disabled={disabledFields.requirement || (!formData.workspace_id && !formData.requirement_id)}
            suffixIcon={<div className="text-gray-400">⌄</div>}
            allowClear
            onClear={() => setFormData(prev => ({ ...prev, requirement_id: "" }))}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {filteredRequirements.length > 0 ? (
              filteredRequirements.map((req) => (
                <Option key={req.id} value={req.id.toString()} label={req.name}>
                  {req.name}
                </Option>
              ))
            ) : (
              <Option value="none" disabled>
                {formData.workspace_id ? "No requirements in this workspace" : "Select workspace first"}
              </Option>
            )}
          </Select>
        </div>

      </div>

      {/* --- SQUAD BUILDER SECTION (Compact) --- */}
      <div className="mb-5 border border-[#EEEEEE] rounded-xl p-4 bg-[#FAFAFA]">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[0.8125rem] font-bold text-[#111111] flex items-center gap-2">
            <Users className="w-4 h-4" /> Members <span className="text-red-500">*</span>
          </h3>

          {/* Execution Mode Toggle */}
          <div className="flex bg-white rounded-lg p-0.5 border border-[#EEEEEE]">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, execution_mode: "parallel" })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[0.6875rem] font-medium transition-all ${formData.execution_mode === "parallel" ? 'bg-[#E6F4FF] text-[#0091FF]' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Layers className="w-3 h-3" /> Parallel
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, execution_mode: "sequential" })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[0.6875rem] font-medium transition-all ${formData.execution_mode === "sequential" ? 'bg-[#FFF2E8] text-[#FA541C]' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ArrowRight className="w-3 h-3" /> Sequential
            </button>
          </div>
        </div>

        {/* Member Selection */}
        <div className="space-y-3">
          <Select
            className="w-full"
            placeholder={
              <div className="flex items-center gap-2 text-gray-400 text-[0.8125rem]">
                <UserPlus className="w-4 h-4" /> <span>Add squad members...</span>
              </div>
            }
            value={null}
            onChange={(val) => val && addMember(parseInt(val))}
            suffixIcon={null}
            styles={{ popup: { root: { borderRadius: '8px', padding: '8px' } } }}
            showSearch
            filterOption={(input, option) => {
              const label = String(option?.label ?? '').toLowerCase();
              return label.includes(input.toLowerCase());
            }}
          >
            {sortedUsers
              .filter(u => !formData.assigned_members.includes(u.id))
              .map((user) => (
                <Option key={user.id} value={user.id.toString()} label={user.name}>
                  <div className="flex items-center gap-3 py-1">
                    <Avatar size="small" src={user.profile_pic}>{user.name.charAt(0)}</Avatar>
                    <span className="font-medium text-gray-700">{user.name}</span>
                  </div>
                </Option>
              ))}
          </Select>

          {/* Selected Squad List */}
          <div className="space-y-2">
            <Reorder.Group axis="y" values={formData.assigned_members} onReorder={handleReorder}>
              {formData.assigned_members.map((memberId, index) => {
                const user = sortedUsers.find(u => u.id === memberId);
                if (!user) return null;
                const isSequential = formData.execution_mode === 'sequential';

                return (
                  <Reorder.Item key={memberId} value={memberId} dragListener={isSequential} className="mb-2">
                    <div className="flex items-center justify-between bg-white p-2 px-3 rounded-lg border border-[#E5E7EB] shadow-sm">
                      <div className="flex items-center gap-3">
                        {/* Drag Handle (Only for Sequential) */}
                        {isSequential && <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />}

                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[0.5625rem] font-bold text-gray-500">
                          {isSequential ? index + 1 : '•'}
                        </div>
                        <Avatar size="small" shape="circle" className="w-6 h-6 text-[0.625rem]" src={user.profile_pic}>{user.name.charAt(0)}</Avatar>
                        <span className="text-[0.8125rem] font-semibold text-gray-800">{user.name}</span>
                        {String(user.id) !== currentUserId && (
                          <span className="xs:inline hidden text-[0.5625rem] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                            Estimate Pending
                          </span>
                        )}
                      </div>
                      <button
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag conflict
                        onClick={() => removeMember(memberId)}
                        className="p-1 px-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>
            {formData.assigned_members.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-xs border border-dashed border-gray-300 rounded-lg">
                No active agents assigned.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Due Date and Hours Grid (Below Squad) */}
      <div className="grid grid-cols-12 gap-x-4 gap-y-4 mb-5">
        {/* Due Date: Col Span 6 */}
        <div className="col-span-12 sm:col-span-6 space-y-1.5">
          <span className="text-xs font-bold text-[#111111]">
            Due Date <span className="text-red-500">*</span>
          </span>
          <Tooltip title={isEditing && !canEditDueDate ? "Only Coordinators and Admins can change the due date" : ""}>
            <DatePicker
              className="w-full h-11 rounded-lg"
              value={formData.end_date ? dayjs(formData.end_date) : null}
              onChange={(date) => {
                if (!isEditing || canEditDueDate) {
                  setFormData({ ...formData, end_date: date ? date.toISOString() : '' });
                }
              }}
              suffixIcon={<Calendar className="w-4 h-4 text-[#999999]" />}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              disabled={isEditing && !canEditDueDate}
            />
          </Tooltip>
        </div>

        {/* My Hours: Col Span 6 */}
        <div className="col-span-12 sm:col-span-6 space-y-1.5">
          <span className={`text-xs font-bold ${formData.assigned_members.includes(parseInt(currentUserId)) ? 'text-[#111111]' : 'text-gray-400'}`}>
            My Hours <span className={`${formData.assigned_members.includes(parseInt(currentUserId)) ? 'text-red-500' : 'hidden'}`}>*</span>
          </span>
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder={formData.assigned_members.includes(parseInt(currentUserId)) ? "0" : "-"}
            className="w-full h-11 rounded-lg border border-[#EEEEEE] text-sm"
            value={formData.estimated_time}
            onChange={(e) => {
              setFormData({ ...formData, estimated_time: e.target.value });
            }}
            disabled={!formData.assigned_members.includes(parseInt(currentUserId))}
          />
        </div>
      </div>

      {/* Collapsible Description */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-[#111111]">Description</span>
        <TextArea
          placeholder="Describe the mission objectives..."
          className="font-normal rounded-lg border border-[#EEEEEE]"
          rows={formData.description ? 3 : 1}
          onFocus={(e) => e.target.rows = 3}
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
          }}
        />
      </div>
    </FormLayout>
  );
}
