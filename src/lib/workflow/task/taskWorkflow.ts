/**
 * Task Workflow State Machine
 *
 * Defines valid status transitions for tasks.
 */

import { TASK_STATUSES } from '../types/task.types';
import type { TaskStatus } from '../types/task.types';

/**
 * Valid task status transitions.
 * Each status maps to an array of allowed next statuses.
 */
export const TASK_TRANSITIONS: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  // From Assigned: can start work or mark as delayed
  Assigned: ['In_Progress', 'Delayed'],

  // From In_Progress: can complete, submit for review, or mark as delayed
  In_Progress: ['Completed', 'Review', 'Delayed'],

  // From Review: can approve (Completed), or send back to work
  Review: ['Completed', 'In_Progress'],

  // From Delayed: can reassign or start work
  Delayed: ['Assigned', 'In_Progress'],

  // From Completed: can reopen for review if needed
  Completed: ['Review'],
} as const;

/**
 * Checks if a task status transition is valid.
 *
 * @param from - Current task status
 * @param to - Target task status
 * @returns true if the transition is allowed
 *
 * @example
 * isTaskTransitionValid('Assigned', 'In_Progress')  // true - can start work
 * isTaskTransitionValid('Assigned', 'Completed')    // false - cannot skip to completed
 * isTaskTransitionValid('In_Progress', 'Review')    // true - can submit for review
 */
export function isTaskTransitionValid(from: TaskStatus, to: TaskStatus): boolean {
  const allowedTransitions = TASK_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

/**
 * Gets all allowed transitions from a given task status.
 *
 * Useful for UI to show only valid status options.
 *
 * @param status - Current task status
 * @returns Array of statuses that can be transitioned to
 *
 * @example
 * getAllowedTaskTransitions('Assigned')    // ['In_Progress', 'Delayed']
 * getAllowedTaskTransitions('In_Progress') // ['Completed', 'Review', 'Delayed']
 */
export function getAllowedTaskTransitions(status: TaskStatus): readonly TaskStatus[] {
  return TASK_TRANSITIONS[status];
}

/**
 * Type guard to check if a string is a valid TaskStatus.
 *
 * @param value - Value to check
 * @returns true if value is a valid TaskStatus
 *
 * @example
 * if (isTaskStatus(task.status)) {
 *   // TypeScript now knows task.status is TaskStatus
 *   const transitions = getAllowedTaskTransitions(task.status);
 * }
 */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus);
}
