import { TaskDto } from '../../types/dto/task.dto';
import { Task, TaskStatus } from '../../types/domain';
import { TASK_STATUSES } from '@/lib/workflow';
import { format } from 'date-fns';

export function mapTaskToDomain(dto: TaskDto): Task {
  // API returns Prisma TaskStatus enum only. Guard: if value in TASK_STATUSES use it, else default to Assigned.
  const status: TaskStatus =
    dto.status && (TASK_STATUSES as readonly string[]).includes(dto.status)
      ? (dto.status as TaskStatus)
      : 'Assigned';

  // Safe Date parsing
  const startDate = dto.start_date || '';
  const dueDate = dto.end_date || dto.due_date || '';
  const timelineDate = dto.end_date ? format(new Date(dto.end_date), 'MMM dd') : 'N/A';

  // assignedTo name resolution
  let assignedToName = 'Unassigned';
  if (dto.member_user?.name) assignedToName = dto.member_user.name;
  else if (dto.assigned_to_user?.name) assignedToName = dto.assigned_to_user.name;
  else if (dto.task_members && dto.task_members.length > 0) {
    assignedToName = dto.task_members[0].user?.name || 'Unassigned';
  }

  // client/project/leader resolution
  const clientName = dto.client?.name || dto.client_name || dto.task_project?.client_user?.company?.name || null;
  const projectName = dto.task_project?.company?.name || dto.client_company_name || null;
  const leaderName = dto.leader_user?.name || dto.manager_user?.name || null;

  return {
    id: String(dto.id),
    name: dto.name || dto.title || 'Untitled',
    taskId: String(dto.id),
    title: dto.title || dto.name || 'Untitled', // Keep compatibility

    // Resolved Display Fields
    client: clientName,
    project: projectName,
    leader: leaderName,
    assignedTo: assignedToName,

    // Dates
    startDate,
    dueDate,
    start_date: startDate,
    end_date: dueDate,
    endDateIso: dueDate,

    // Metrics
    estTime: Number(dto.estimated_time || 0),
    estimated_time: Number(dto.estimated_time || 0),
    estimatedTime: Number(dto.estimated_time || 0),
    timeSpent: Number(dto.time_spent || 0),
    time_spent: Number(dto.time_spent || 0),
    activities: 0, // Not in DTO usually

    totalSecondsSpent: dto.total_seconds_spent || 0,
    total_seconds_spent: dto.total_seconds_spent || 0,

    // Status & Priority
    status,
    isHighPriority: dto.is_high_priority || dto.priority === 'High' || dto.priority === 'HIGH' || false,
    is_high_priority: dto.is_high_priority || dto.priority === 'High' || dto.priority === 'HIGH' || false,

    // Timeline
    timelineDate,
    timelineLabel: status === 'Delayed' ? 'Overdue' : '',
    dueDateValue: dueDate ? new Date(dueDate).getTime() : null,

    // Metadata
    description: dto.description,
    workspaceId: dto.workspace_id,
    workspace_id: dto.workspace_id,
    requirementId: dto.requirement_id,
    requirement_id: dto.requirement_id,
    memberId: dto.member_id,
    member_id: dto.member_id,
    leaderId: dto.leader_id,
    leader_id: dto.leader_id,
    executionMode: dto.execution_mode,
    execution_mode: dto.execution_mode,

    // Nested/Original - strictly map to ensure 'name' is present if object exists
    taskMembers: dto.task_members?.map(tm => ({
      ...tm,
      userId: tm.user_id,
      user_id: tm.user_id,
      estimatedTime: tm.estimated_time,
      estimated_time: tm.estimated_time,
      secondsSpent: tm.seconds_spent,
      seconds_spent: tm.seconds_spent,
      activeWorklogStartTime: tm.active_worklog_start_time,
      active_worklog_start_time: tm.active_worklog_start_time,
      isCurrentTurn: tm.is_current_turn,
      is_current_turn: tm.is_current_turn,
      queueOrder: tm.queue_order,
      queue_order: tm.queue_order,
      executionMode: tm.execution_mode,
      execution_mode: tm.execution_mode,
      user: {
        ...tm.user,
        profilePic: tm.user.profile_pic,
        profile_pic: tm.user.profile_pic
      }
    })) || [],
    task_members: dto.task_members || [],

    worklogs: [], // Usually fetched separately or empty by default from list

    // Relations preserved for compatibility (snake_case preserved in DTO)
    // camelCase mapping for relations
    taskProject: dto.task_project ? {
      clientUser: dto.task_project.client_user ? { company: { name: dto.task_project.client_user.company?.name || '' } } : undefined,
      client_user: dto.task_project.client_user,
      company: dto.task_project.company,
      companyName: dto.task_project.company?.name,
      company_name: dto.task_project.company?.name,
    } : undefined,
    task_project: dto.task_project,

    memberUser: dto.member_user ? {
      ...dto.member_user,
      name: dto.member_user.name || 'Unassigned',
      profilePic: dto.member_user.profile_pic,
      profile_pic: dto.member_user.profile_pic,
    } : undefined,
    member_user: dto.member_user ? {
      ...dto.member_user,
      name: dto.member_user.name || 'Unassigned'
    } : undefined,

    leaderUser: dto.leader_user ? {
      ...dto.leader_user,
      name: dto.leader_user.name || null,
      profilePic: dto.leader_user.profile_pic,
      profile_pic: dto.leader_user.profile_pic,
    } : undefined,
    leader_user: dto.leader_user ? {
      ...dto.leader_user,
      name: dto.leader_user.name || null
    } : undefined,

    assignedToUser: dto.assigned_to_user,
    assigned_to_user: dto.assigned_to_user,

    // Expanded mappings
    company: dto.company ? { name: dto.company.name } : undefined,
    companyName: dto.company_name,
    company_name: dto.company_name,
    clientCompanyName: dto.client_company_name,
    client_company_name: dto.client_company_name,

    taskRequirement: dto.task_requirement ? { id: dto.task_requirement.id, name: dto.task_requirement.name || '' } : undefined,
    task_requirement: dto.task_requirement ? {
      id: dto.task_requirement.id,
      name: dto.task_requirement.name || '',
      sender_company: dto.task_requirement.sender_company
    } : undefined,
    requirementRelation: dto.requirement_relation,
    requirement_relation: dto.requirement_relation,
    requirementName: dto.requirement_name,
    requirement_name: dto.requirement_name,
  };
}

// re-export alias if needed for backward compact during transition, but hook will use mapTaskToDomain
export const mapTaskDtoToDomain = mapTaskToDomain;
