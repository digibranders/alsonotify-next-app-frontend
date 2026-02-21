/**
 * Task CTA Mapping
 *
 * Centralized CTA (Call-To-Action) configuration for tasks.
 * Determines what actions are available based on task status and user context.
 */

import type { Tab } from '../types/common.types';
import type {
  TaskStatus,
  ExecutionMode,
  TaskCTAConfig,
  TaskActionConfig,
} from '../types/task.types';

/**
 * Context for task CTA determination.
 *
 * @property isLeader - Whether the user is the task/requirement leader
 * @property isMember - Whether the user is assigned to this task
 * @property isCurrentTurn - Whether it's this user's turn (sequential mode)
 * @property executionMode - How the task is being executed (parallel/sequential)
 * @property isSelfAssigned - Scenario 1: leader is the only member (sole executor)
 */
export interface TaskCTAContext {
  readonly isLeader: boolean;
  readonly isMember: boolean;
  readonly isCurrentTurn: boolean;
  readonly executionMode: ExecutionMode;
  readonly isSelfAssigned: boolean;
}

/**
 * Gets the CTA configuration for a task based on status and context.
 *
 * CTA determination considers:
 * - Current task status
 * - User's role (leader vs member)
 * - Execution mode (parallel vs sequential)
 * - Whether it's the user's turn (for sequential tasks)
 *
 * @param status - Current task status
 * @param context - User context for this task
 * @returns Complete CTA configuration for the task
 *
 * @example
 * // Member can start work on assigned task
 * getTaskCTAConfig('Assigned', { isMember: true, isLeader: false, isCurrentTurn: true, executionMode: 'parallel' })
 * // Returns { displayStatus: 'Ready to Start', tab: 'pending', primaryAction: { label: 'Start Work', ... } }
 *
 * @example
 * // Member in sequential mode but not their turn
 * getTaskCTAConfig('Assigned', { isMember: true, isLeader: false, isCurrentTurn: false, executionMode: 'sequential' })
 * // Returns { displayStatus: 'Waiting for Turn', tab: 'pending', primaryAction: undefined }
 */
export function getTaskCTAConfig(
  status: TaskStatus,
  context: TaskCTAContext
): TaskCTAConfig {
  const { isLeader, isMember, isCurrentTurn, executionMode, isSelfAssigned } = context;

  // Sequential mode: if not current turn, limit actions
  const canAct = executionMode === 'parallel' || isCurrentTurn;

  switch (status) {
    case 'Assigned':
      return getAssignedCTA(isMember, canAct);

    case 'In_Progress':
      return getInProgressCTA(isMember, canAct, isSelfAssigned);

    case 'Review':
      return getReviewCTA(isLeader, isMember, canAct);

    case 'Delayed':
      return getDelayedCTA(isMember, canAct);

    case 'Completed':
      return getCompletedCTA(isLeader);

    default: {
      // Exhaustive check
      const _exhaustive: never = status;
      throw new Error(`Unhandled task status: ${_exhaustive}`);
    }
  }
}

/**
 * CTA for Assigned status.
 * Member can start work if it's their turn.
 */
function getAssignedCTA(isMember: boolean, canAct: boolean): TaskCTAConfig {
  if (isMember && canAct) {
    return {
      displayStatus: 'Ready to Start',
      tab: 'pending',
      primaryAction: createAction('Start Work', 'primary', 'start'),
    };
  }

  if (isMember && !canAct) {
    return {
      displayStatus: 'Waiting for Turn',
      tab: 'pending',
    };
  }

  // Not a member - view only
  return {
    displayStatus: 'Assigned',
    tab: 'pending',
  };
}

/**
 * CTA for In_Progress status.
 *
 * - Scenario 1 (isSelfAssigned): Leader is sole member → "Mark Complete" (auto-completes, no review)
 * - Scenarios 2 & 3: Leader assigned others (or is also a member) → "Submit for Review"
 */
function getInProgressCTA(isMember: boolean, canAct: boolean, isSelfAssigned: boolean): TaskCTAConfig {
  if (isMember && canAct) {
    return {
      displayStatus: 'In Progress',
      tab: 'active',
      primaryAction: isSelfAssigned
        ? createAction('Mark Complete', 'primary', 'mark_complete')
        : createAction('Submit for Review', 'primary', 'submit_review'),
      secondaryAction: createAction('Pause', 'secondary', 'pause'),
    };
  }

  if (isMember && !canAct) {
    return {
      displayStatus: 'In Progress (Not Your Turn)',
      tab: 'active',
    };
  }

  // Not a member - view only
  return {
    displayStatus: 'In Progress',
    tab: 'active',
  };
}

/**
 * CTA for Review status.
 * Leader can approve or request revision.
 * Member can pull back if needed.
 */
function getReviewCTA(isLeader: boolean, isMember: boolean, canAct: boolean): TaskCTAConfig {
  if (isLeader) {
    return {
      displayStatus: 'Awaiting Review',
      tab: 'pending',
      primaryAction: createAction('Approve', 'primary', 'approve'),
      secondaryAction: createAction('Request Revision', 'danger', 'request_revision'),
    };
  }

  if (isMember && canAct) {
    return {
      displayStatus: 'Submitted for Review',
      tab: 'pending',
      secondaryAction: createAction('Pull Back', 'secondary', 'pull_back'),
    };
  }

  // View only
  return {
    displayStatus: 'In Review',
    tab: 'pending',
  };
}

/**
 * CTA for Delayed status.
 * Member can resume work.
 */
function getDelayedCTA(isMember: boolean, canAct: boolean): TaskCTAConfig {
  if (isMember && canAct) {
    return {
      displayStatus: 'Delayed',
      tab: 'delayed',
      primaryAction: createAction('Resume Work', 'primary', 'resume'),
    };
  }

  return {
    displayStatus: 'Delayed',
    tab: 'delayed',
  };
}

/**
 * CTA for Completed status.
 * Leader can reopen if needed.
 */
function getCompletedCTA(isLeader: boolean): TaskCTAConfig {
  if (isLeader) {
    return {
      displayStatus: 'Completed',
      tab: 'completed',
      secondaryAction: createAction('Reopen', 'secondary', 'reopen'),
    };
  }

  return {
    displayStatus: 'Completed',
    tab: 'completed',
  };
}

/**
 * Helper to create an action config.
 */
function createAction(
  label: string,
  type: TaskActionConfig['type'],
  apiAction: string
): TaskActionConfig {
  return {
    label,
    type,
    modal: 'none',
    apiAction,
  };
}

/**
 * Determines which tab a task belongs to based on its status.
 *
 * @param status - Current task status
 * @returns The tab this task should appear in
 *
 * @example
 * getTaskTab('Assigned')    // 'pending'
 * getTaskTab('In_Progress') // 'active'
 * getTaskTab('Completed')   // 'completed'
 */
export function getTaskTab(status: TaskStatus): Tab {
  switch (status) {
    case 'Assigned':
      return 'pending';
    case 'In_Progress':
      return 'active';
    case 'Review':
      return 'pending';
    case 'Delayed':
      return 'delayed';
    case 'Completed':
      return 'completed';
    default: {
      const _exhaustive: never = status;
      throw new Error('Unhandled task status: ' + (_exhaustive as string));
    }
  }
}
