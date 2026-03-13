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
  const dueDate = dto.end_date || '';
  const timelineDate = dto.end_date ? format(new Date(dto.end_date), 'MMM dd') : 'N/A';

  // assignedTo name resolution
  let assignedToName = 'Unassigned';
  if (dto.member_user?.name) assignedToName = dto.member_user.name;
  else if (dto.task_members && dto.task_members.length > 0) {
    assignedToName = dto.task_members[0].user?.name || 'Unassigned';
  }

  // client/project/leader resolution
  const clientName = dto.company?.name || null;
  const projectName = dto.task_requirement?.name || null;
  const leaderName = dto.leader_user?.name || dto.manager_user?.name || null;

  return {
    ...dto,
    id: String(dto.id),
    taskId: String(dto.id),
    name: dto.name || 'Untitled',

    // Resolved Display Fields
    client: clientName,
    project: projectName,
    leader: leaderName,
    assignedTo: assignedToName,

    // Dates
    startDate,
    dueDate,

    // Metrics
    estTime: Number(dto.estimated_time || 0),
    timeSpent: Number(dto.time_spent || 0),
    activities: 0,

    totalSecondsSpent: dto.total_seconds_spent || 0,

    // Status & Priority
    status,
    is_high_priority: dto.is_high_priority ?? false,

    // Timeline
    timelineDate,
    timelineLabel: status === 'Delayed' ? 'Overdue' : '',
    dueDateValue: dueDate ? new Date(dueDate).getTime() : null,


  };
}

export const mapTaskDtoToDomain = mapTaskToDomain;
