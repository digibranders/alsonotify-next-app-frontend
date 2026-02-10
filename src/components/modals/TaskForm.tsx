import { useState, useMemo } from "react";
import { Button, Input, Select, Checkbox, DatePicker, App, Avatar } from 'antd';
import { CheckSquare, Calendar, Users, ArrowRight, Layers, UserPlus, X } from 'lucide-react';
import dayjs from '@/utils/dayjs';
import { formatDateForApi, getTodayForApi } from '@/utils/date';
import { FormLayout } from '@/components/common/FormLayout';
import { trimStr } from '@/utils/trim';

const { TextArea } = Input;
const { Option } = Select;

import { CreateTaskRequestDto } from '@/types/dto/task.dto';

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
  users?: Array<{ id: number; name: string; profile_pic?: string }>;
  requirements?: Array<{ id: number; name: string }>;
  workspaces?: Array<{ id: number; name: string }>;
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

// ... imports

export function TaskForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
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

    // 2. Resolve Workspace ID (Preserve existing, or auto-pick first available)
    let workspaceId = base.workspace_id;
    if (!workspaceId && workspaces.length > 0) {
      workspaceId = String(workspaces[0].id);
    }

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

    console.log('🚀 Form submission validation:', {
      formData,
      missingFields,
      workspace_id: formData.workspace_id,
      workspace_id_type: typeof formData.workspace_id,
      workspace_id_parsed: formData.workspace_id ? parseInt(formData.workspace_id) : undefined
    });

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

    console.log('📤 Sending to backend:', backendData);

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
            className="h-[40px] px-4 text-[14px] font-semibold text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] transition-colors rounded-lg"
          >
            Reset Data
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            className="h-[40px] px-8 rounded-lg bg-[#111111] hover:bg-[#000000]/90 text-white text-[14px] font-semibold transition-transform active:scale-95 border-none"
          >
            {isEditing ? 'Update Task' : 'Submit'}
          </Button>
        </>
      }
    >
      {/* Compact Grid Layout */}
      <div className="grid grid-cols-12 gap-x-4 gap-y-4 mb-5">

        {/* Task Title: Col Span 12 (Full Row) */}
        <div className="col-span-12 space-y-1.5">
          <span className="text-[12px] font-bold text-[#111111]">
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

        {/* Requirement: Col Span 6 */}
        <div className="col-span-12 sm:col-span-6 space-y-1.5">
          <span className="text-[12px] font-bold text-[#111111]">
            Requirement
          </span>
          <Select
            className="w-full h-11"
            placeholder="Select requirement"
            value={formData.requirement_id || undefined}
            onChange={(val) => {
              const reqId = parseInt(String(val));
              const selectedReq = requirements.find(r => r.id === reqId) as any;

              console.log('🔍 Requirement selected:', {
                reqId,
                selectedReq,
                hasWorkspaceId: !!selectedReq?.workspace_id,
                hasReceiverWorkspaceId: !!selectedReq?.receiver_workspace_id,
                workspace_id: selectedReq?.workspace_id,
                receiver_workspace_id: selectedReq?.receiver_workspace_id
              });

              // Auto-infer workspace from requirement if available
              let targetWorkspaceId = formData.workspace_id;

              if (selectedReq) {
                // If receiver_workspace_id is present (outsourced task where I am receiver), use it.
                // Otherwise use workspace_id (in-house task or I am the owner).
                const inferredWorkspaceId = selectedReq.receiver_workspace_id || selectedReq.workspace_id;
                if (inferredWorkspaceId) {
                  targetWorkspaceId = String(inferredWorkspaceId);
                  console.log('✅ Workspace auto-fetched from requirement:', targetWorkspaceId);
                } else {
                  console.warn('⚠️ No workspace_id found in requirement:', selectedReq);
                }
              }

              console.log('📝 Setting form data:', {
                requirement_id: String(val),
                workspace_id: targetWorkspaceId
              });

              setFormData(prev => ({
                ...prev,
                requirement_id: String(val),
                workspace_id: targetWorkspaceId
              }));
            }}
            disabled={disabledFields.requirement}
            suffixIcon={<div className="text-gray-400">⌄</div>}
            allowClear
            onClear={() => setFormData(prev => ({ ...prev, requirement_id: "" }))}
            showSearch={{
              filterOption: (input, option) =>
                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
            }}
          >
            {requirements.length > 0 ? (
              requirements.map((req) => (
                <Option key={req.id} value={req.id.toString()}>
                  {req.name}
                </Option>
              ))
            ) : (
              <Option value="none" disabled>No requirements available</Option>
            )}
          </Select>
        </div>

        {/* Due Date: Col Span 6 */}
        <div className="col-span-12 sm:col-span-6 space-y-1.5">
          <span className="text-[12px] font-bold text-[#111111]">
            Due Date <span className="text-red-500">*</span>
          </span>
          <DatePicker
            className="w-full h-11 rounded-lg"
            value={formData.end_date ? dayjs(formData.end_date) : null}
            onChange={(date) => {
              setFormData({ ...formData, end_date: date ? date.toISOString() : '' });
            }}
            suffixIcon={<Calendar className="w-4 h-4 text-[#999999]" />}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </div>

      </div>

      {/* --- SQUAD BUILDER SECTION (Compact) --- */}
      <div className="mb-5 border border-[#EEEEEE] rounded-xl p-4 bg-[#FAFAFA]">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[13px] font-bold text-[#111111] flex items-center gap-2">
            <Users className="w-4 h-4" /> Squad Assembly
          </h3>

          {/* Execution Mode Toggle */}
          <div className="flex bg-white rounded-lg p-0.5 border border-[#EEEEEE]">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, execution_mode: "parallel" })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all ${formData.execution_mode === "parallel" ? 'bg-[#E6F4FF] text-[#0091FF]' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Layers className="w-3 h-3" /> Parallel
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, execution_mode: "sequential" })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all ${formData.execution_mode === "sequential" ? 'bg-[#FFF2E8] text-[#FA541C]' : 'text-gray-500 hover:bg-gray-50'}`}
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
              <div className="flex items-center gap-2 text-gray-400 text-[13px]">
                <UserPlus className="w-4 h-4" /> <span>Add squad members...</span>
              </div>
            }
            value={null}
            onChange={(val) => val && addMember(parseInt(val))}
            suffixIcon={null}
            styles={{ popup: { root: { borderRadius: '8px', padding: '8px' } } }}
            showSearch={{
              filterOption: (input, option) => {
                const label = String(option?.label ?? '').toLowerCase();
                return label.includes(input.toLowerCase());
              }
            }}
          >
            {users
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
            {formData.assigned_members.map((memberId, index) => {
              const user = users.find(u => u.id === memberId);
              if (!user) return null;
              return (
                <div key={memberId} className="flex items-center justify-between bg-white p-2 px-3 rounded-lg border border-[#E5E7EB] shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">
                      {formData.execution_mode === 'sequential' ? index + 1 : '•'}
                    </div>
                    <Avatar size="small" shape="circle" className="w-6 h-6 text-[10px]" src={user.profile_pic}>{user.name.charAt(0)}</Avatar>
                    <span className="text-[13px] font-semibold text-gray-800">{user.name}</span>
                    {String(user.id) !== currentUserId && (
                      <span className="xs:inline hidden text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                        Estimate Pending
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeMember(memberId)}
                    className="p-1 px-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
            {formData.assigned_members.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-[12px] border border-dashed border-gray-300 rounded-lg">
                No active agents assigned.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Priority & My Hours Grid */}
      <div className="grid grid-cols-12 gap-x-4 gap-y-4 mb-5">
        {/* Priority: Col Span 6 */}
        <div className="col-span-12 sm:col-span-6 space-y-1.5">
          <span className="text-[12px] font-bold text-[#111111]">Priority</span>
          <div
            className={`w-full h-11 rounded-lg border flex items-center px-3 cursor-pointer transition-colors ${formData.is_high_priority ? 'border-red-200 bg-red-50/50' : 'border-[#EEEEEE] hover:border-gray-300'}`}
            onClick={() => setFormData({ ...formData, is_high_priority: !formData.is_high_priority })}
          >
            <Checkbox
              checked={formData.is_high_priority}
              className="font-medium text-sm w-full pointer-events-none"
            >
              <span className={formData.is_high_priority ? 'text-red-600' : 'text-[#111111]'}>High Priority</span>
            </Checkbox>
          </div>
        </div>

        {/* My Hours: Col Span 6 */}
        <div className="col-span-12 sm:col-span-6 space-y-1.5">
          <span className={`text-[12px] font-bold ${formData.assigned_members.includes(parseInt(currentUserId)) ? 'text-[#111111]' : 'text-gray-400'}`}>
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
        <span className="text-[12px] font-bold text-[#111111]">Description</span>
        <TextArea
          placeholder="Describe the mission objectives..."
          className="font-['Manrope:Regular',sans-serif] rounded-lg border border-[#EEEEEE]"
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
