/**
 * Task Types for Workflow Module
 *
 * Type definitions for task status, member status, and task CTA configurations.
 */

import type { Tab, ModalType } from './common.types';

/**
 * All valid task status values as a constant array.
 * Single source of truth - used for both type definition and runtime validation.
 */
export const TASK_STATUSES = [
  'Assigned',
  'In_Progress',
  'Completed',
  'Delayed',
  'Review',
] as const;

/**
 * TaskStatus - All possible states for a task.
 * Derived from TASK_STATUSES constant (7 values).
 *
 * Workflow stages:
 * - Normal Flow: Assigned → In_Progress → Review → Completed
 * - Blocking: Stuck, Impediment
 * - Scheduling: Delayed
 */
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * MemberStatus - Status for individual task members.
 * Uses the same values as TaskStatus for consistency.
 *
 * In sequential execution mode, each member progresses through
 * their own status independently based on turn order.
 */
export type MemberStatus = TaskStatus;

/**
 * ExecutionMode - How task members work on a task.
 *
 * - parallel: All members can work simultaneously
 * - sequential: Members work in queue order, one at a time (baton passing)
 */
export type ExecutionMode = 'parallel' | 'sequential';

/**
 * TaskActionType - Categories of actions for task buttons.
 */
export type TaskActionType = 'primary' | 'secondary' | 'danger' | 'info';

/**
 * TaskActionConfig - Configuration for a single task action button.
 *
 * @property label - Display text for the button
 * @property type - Visual style/importance of the action
 * @property modal - Which modal to open (if any)
 * @property apiAction - The API action to perform
 */
export interface TaskActionConfig {
  readonly label: string;
  readonly type: TaskActionType;
  readonly modal: ModalType;
  readonly apiAction?: string;
}

/**
 * TaskCTAConfig - Complete CTA configuration for a task.
 *
 * Determines what the UI should display based on task status and user permissions.
 *
 * @property displayStatus - Human-readable status text
 * @property tab - Which tab this task should appear in
 * @property primaryAction - Main action button configuration
 * @property secondaryAction - Secondary action button configuration
 *
 * @example
 * // Task member sees "Assigned" status
 * {
 *   displayStatus: 'Ready to Start',
 *   tab: 'pending',
 *   primaryAction: { label: 'Start Work', type: 'primary', modal: 'none', apiAction: 'start' }
 * }
 */
export interface TaskCTAConfig {
  readonly displayStatus: string;
  readonly tab: Tab;
  readonly primaryAction?: TaskActionConfig;
  readonly secondaryAction?: TaskActionConfig;
}

/**
 * TaskMemberInfo - Minimal member info needed for status aggregation.
 *
 * Used by rollup functions to calculate aggregate task status.
 */
export interface TaskMemberInfo {
  readonly status: MemberStatus;
}

/**
 * TaskInfo - Minimal task info needed for requirement status rollup.
 *
 * Used by rollup functions to derive requirement status from tasks.
 */
export interface TaskInfo {
  readonly status: TaskStatus;
  readonly isRevision: boolean;
}
