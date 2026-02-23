/**
 * Status Rollup Logic
 *
 * Functions to derive aggregate statuses from child entities:
 * - Task status from member statuses
 * - Requirement status from task statuses
 */

import type { RequirementStatus } from '../types/requirement.types';
import type { TaskStatus, TaskMemberInfo, TaskInfo } from '../types/task.types';

/**
 * Aggregates member statuses to determine the overall task status.
 *
 * Priority order (highest urgency first):
 * In_Progress > Completed (all) > Review > Delayed > Assigned
 *
 * Logic:
 * - If ANY member is In_Progress → Task is In_Progress (active work happening)
 * - If ALL members are Completed → Task is Completed
 * - If ANY member is Review → Task is Review
 * - If ANY member is Delayed → Task is Delayed
 * - Otherwise → Task is Assigned (default)
 *
 * @param members - Array of task members with their statuses
 * @returns The aggregated task status
 *
 * @example
 * aggregateMemberStatuses([{ status: 'In_Progress' }, { status: 'Assigned' }])
 * // Returns 'In_Progress' - any active member makes task active
 *
 * @example
 * aggregateMemberStatuses([{ status: 'Completed' }, { status: 'Completed' }])
 * // Returns 'Completed' - all members must be done
 */
export function aggregateMemberStatuses(members: readonly TaskMemberInfo[]): TaskStatus {
  // Handle empty array
  if (!members || members.length === 0) {
    return 'Assigned';
  }

  const statuses = members.map((m) => m.status);

  // Priority 1: In_Progress (any active member makes task active)
  if (statuses.some((s) => s === 'In_Progress')) {
    return 'In_Progress';
  }

  // Priority 2: Completed (ALL members must be done)
  if (statuses.every((s) => s === 'Completed')) {
    return 'Completed';
  }

  // Priority 3: Review (any member in review)
  if (statuses.some((s) => s === 'Review')) {
    return 'Review';
  }

  // Priority 4: Delayed (if not in progress but delayed)
  if (statuses.some((s) => s === 'Delayed')) {
    return 'Delayed';
  }

  // Default fallback
  return 'Assigned';
}

/**
 * Derives the requirement status from its tasks.
 *
 * Priority order:
 * 1. Revision - If any task is a revision and not completed
 * 2. Review - If all tasks are completed (ready for sender approval)
 * 3. In_Progress - If any task is in progress
 * 4. Assigned - Default (no work started)
 *
 * The requirement stays at its current progress level.
 *
 * @param tasks - Array of tasks with their statuses and revision flags
 * @returns The derived requirement status
 *
 * @example
 * deriveRequirementStatusFromTasks([
 *   { status: 'Completed', isRevision: false },
 *   { status: 'In_Progress', isRevision: true }
 * ])
 * // Returns 'Revision' - active revision task takes priority
 *
 * @example
 * deriveRequirementStatusFromTasks([
 *   { status: 'Completed', isRevision: false },
 *   { status: 'Completed', isRevision: false }
 * ])
 * // Returns 'Review' - all tasks complete, ready for approval
 */
export function deriveRequirementStatusFromTasks(tasks: readonly TaskInfo[]): RequirementStatus {
  // Handle empty array
  if (!tasks || tasks.length === 0) {
    return 'Assigned';
  }

  // Priority 1: Any active revision task
  const anyRevisionActive = tasks.some((t) => t.isRevision && t.status !== 'Completed');
  if (anyRevisionActive) {
    return 'Revision';
  }

  // Priority 2: All tasks completed → Ready for review
  const allCompleted = tasks.every((t) => t.status === 'Completed');
  if (allCompleted) {
    return 'Review';
  }

  // Priority 3: Any task in progress
  const anyInProgress = tasks.some((t) => t.status === 'In_Progress');
  if (anyInProgress) {
    return 'In_Progress';
  }

  // Default: No work started
  return 'Assigned';
}
